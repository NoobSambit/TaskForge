# Sync Queue Implementation

This document describes the implementation of the sync queue management module and background sync worker system.

## Files Created

### 1. `lib/networkStatus.ts`
Network connectivity tracking module that monitors online/offline/degraded states.

**Key Features:**
- Automatic browser event handling (`online`/`offline`)
- Event-based status change notifications
- Wait for online with timeout support
- Manual degraded state management

**Exports:**
- `getNetworkStatus()` - Get current connection status
- `isOnline()` - Check if network is available
- `setDegraded()` - Mark network as degraded
- `restoreFromDegraded()` - Restore from degraded state
- `onNetworkStatusChange(listener)` - Subscribe to status changes
- `waitForOnline(timeout?)` - Wait for online status

### 2. `lib/syncQueue.ts`
Core sync queue management module implementing FIFO queue backed by IndexedDB.

**Key Features:**
- FIFO queue with batch processing (configurable batch size, default 10)
- Exponential backoff with jitter (1s base, max 5 minutes)
- 5-attempt failure threshold
- Conflict detection hooks per entity type
- Event emission for UI/service worker consumption
- Web Worker integration for off-main-thread processing
- Service Worker integration for background sync
- Clear controls (synced items, all items)

**Exports:**
- `enqueue(entityType, entityId, operation, payload, metadata?)` - Add item to queue
- `batchPeek(limit?)` - Get pending items for processing
- `markSuccess(itemId)` - Mark item as successfully synced
- `markFailure(itemId, error)` - Mark item as failed with retry scheduling
- `markConflict(itemId, local, remote, message?)` - Mark item as conflicted
- `registerConflictDetector(entityType, detector)` - Register conflict detection logic
- `unregisterConflictDetector(entityType)` - Remove conflict detector
- `detectConflict(item, remoteData)` - Run conflict detection
- `clearSynced()` - Remove synced items from queue
- `clearAll()` - Clear entire queue
- `getSnapshot()` - Get queue statistics
- `addEventListener(listener)` - Subscribe to queue events
- `removeEventListener(listener)` - Unsubscribe from events
- `registerWorker()` - Initialize sync worker
- `deregisterWorker()` - Terminate sync worker
- `processBatch(authToken?)` - Process batch of items via worker
- `notifyServiceWorker()` - Trigger background sync

### 3. `workers/sync-worker.ts`
Web Worker for processing sync operations off the main thread.

**Key Features:**
- Network mutation execution (POST, PUT, DELETE)
- Automatic retry with exponential backoff (up to 3 attempts per item)
- Network status checking before processing
- HTTP 409 conflict detection
- Auth token forwarding via Bearer token
- Graceful shutdown support
- Health check integration

**Message Protocol:**
- **Input:** `SyncWorkerProcessMessage` with batch of queue items and optional auth token
- **Output:** `SyncWorkerResultMessage` for each processed item (success/failure/conflict)

**API Endpoint Mapping:**
- `create` → `POST /api/{entityType}`
- `update/upsert` → `PUT /api/{entityType}/{entityId}`
- `delete` → `DELETE /api/{entityType}/{entityId}`

### 4. `types/sync.ts` (Extended)
Added comprehensive type definitions for queue operations and worker messages.

**New Types:**
- `SyncOperationMetadata` - Metadata for operations (tempId, timestamp, mutationType, payloadDiff, version)
- `SyncQueueEventType` - Event types: enqueue, success, failure, conflict, cleared
- `SyncQueueEvent` - Event payload structure
- `SyncWorkerMessageType` - Worker message types: process, shutdown, result
- `SyncWorkerProcessMessage` - Worker input message
- `SyncWorkerResultMessage` - Worker output message
- `SyncWorkerShutdownMessage` - Worker shutdown message

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Thread                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌─────────────────┐                 │
│  │   UI/App     │─────▶│  SyncQueue      │                 │
│  │  Components  │      │  (lib/syncQueue)│                 │
│  └──────────────┘      └─────────────────┘                 │
│                               │   │                          │
│                               │   │ postMessage              │
│                               │   ▼                          │
│                        ┌──────────────────┐                 │
│                        │  IndexedDB       │                 │
│                        │  (syncQueue)     │                 │
│                        └──────────────────┘                 │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                        Web Worker                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────┐               │
│  │  Sync Worker (workers/sync-worker.ts)    │               │
│  │  • Receives batches via postMessage       │               │
│  │  • Performs network mutations             │               │
│  │  • Reports results back                   │               │
│  └──────────────────────────────────────────┘               │
│                        │                                      │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  API Server │
                  └─────────────┘
```

## Event Flow

### 1. Enqueue Operation
```typescript
await enqueue('tasks', 'task-123', SyncOperation.Update, { 
  title: 'Updated task' 
}, {
  timestamp: new Date().toISOString(),
  mutationType: SyncOperation.Update
});
```

Events emitted:
- `{ type: 'enqueue', itemId, item }`

### 2. Process Batch
```typescript
registerWorker(); // Initialize worker once
const processed = await processBatch(authToken);
```

For each item:
- Success → `{ type: 'success', itemId, item }`
- Failure → `{ type: 'failure', itemId, item, error }`
- Conflict → `{ type: 'conflict', itemId, item, conflict }`

### 3. Background Sync
Service Worker integration via `notifyServiceWorker()`:
```typescript
// Automatically called after enqueue
// Can also be triggered manually
await notifyServiceWorker();
```

## Retry Strategy

**Exponential Backoff with Jitter:**
- Base: 1 second
- Formula: `min(1000 * 2^(attempts - 1) + random(0-1000), 300000)`
- Max: 5 minutes
- Attempts: 5

**Example Schedule:**
- Attempt 1: Immediate
- Attempt 2: ~1-2 seconds
- Attempt 3: ~2-3 seconds
- Attempt 4: ~4-5 seconds
- Attempt 5: ~8-9 seconds
- Failed: Status changed to `SyncQueueItemStatus.Failed`

## Conflict Detection

Register custom conflict detectors per entity type:

```typescript
registerConflictDetector('tasks', (item, remoteData) => {
  // Last-write-wins
  const localTimestamp = item.metadata?.timestamp;
  const remoteTimestamp = remoteData?.updatedAt;
  
  return localTimestamp < remoteTimestamp;
});
```

Server can also report conflicts via HTTP 409:
```json
{
  "error": "Conflict detected",
  "remote": { "id": "task-123", "version": 2 }
}
```

## Queue Management

### Clear Operations
```typescript
// Remove synced items
await clearSynced();

// Clear entire queue
await clearAll();
```

### Queue Snapshot
```typescript
const snapshot = await getSnapshot();
console.log(snapshot);
// {
//   items: [...],
//   pending: 5,
//   failed: 2,
//   conflicts: 1,
//   lastUpdatedAt: "2024-..."
// }
```

## Integration Example

```typescript
import { 
  enqueue, 
  registerWorker, 
  processBatch, 
  addEventListener 
} from '@/lib/syncQueue';
import { SyncOperation } from '@/types/sync';

// Initialize worker on app start
registerWorker();

// Listen for sync events
const unsubscribe = addEventListener((event) => {
  switch (event.type) {
    case 'enqueue':
      console.log('Item queued:', event.item);
      break;
    case 'success':
      console.log('Item synced:', event.item);
      break;
    case 'failure':
      console.error('Sync failed:', event.error);
      break;
    case 'conflict':
      console.warn('Conflict detected:', event.conflict);
      // Handle conflict resolution
      break;
  }
});

// Enqueue operations
await enqueue('tasks', 'task-1', SyncOperation.Create, {
  title: 'New Task',
  status: 'pending'
});

// Process queue (call periodically or on network change)
const authToken = await getAuthToken();
await processBatch(authToken);
```

## Testing

### Manual Testing
1. Go offline
2. Perform CRUD operations
3. Observe queue building up
4. Go online
5. Watch automatic synchronization

### Queue Inspection
```typescript
import { getSnapshot } from '@/lib/syncQueue';

const snapshot = await getSnapshot();
console.table(snapshot.items);
```

## Performance Considerations

- **Batch Size:** Default 10 items per batch, configurable
- **Worker Timeout:** 30 seconds per batch
- **Network Check:** Health check with 3-second timeout
- **Retry Logic:** Per-item retries (3 attempts) within worker
- **IndexedDB:** Asynchronous, non-blocking operations
- **Memory:** Worker processes items sequentially to avoid memory pressure

## Security

- Auth tokens passed via message payload (not persisted)
- Credentials included in requests for cookie-based auth
- Bearer token support for token-based auth
- Payloads stored in IndexedDB (consider encryption for sensitive data)

## Future Enhancements

1. **Conflict Resolution UI:** Auto-generated conflict resolution components
2. **Compression:** Payload compression for large data
3. **Priority Queue:** Priority levels for urgent operations
4. **Partial Sync:** Sync only changed fields (currently full payload)
5. **Analytics:** Detailed sync metrics and reporting
6. **Encryption:** Optional payload encryption at rest
7. **Deduplication:** Merge duplicate operations before sync
