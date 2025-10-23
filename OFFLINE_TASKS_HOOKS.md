# Offline Tasks & Sync Status Hooks Implementation

This document describes the implementation of offline-first task management hooks and the sync infrastructure provider.

## Files Created

### 1. `hooks/useOfflineTasks.ts`
React hook for optimistic CRUD operations on tasks with offline-first support.

**Key Features:**
- Hydrates from IndexedDB cache first, then reconciles with server
- Optimistic create with temporary IDs (`temp_*`)
- Optimistic update with debounced persistence (500ms)
- Soft-delete with undo window (5 seconds)
- Automatic rollback on sync failure
- Per-task state tracking (pending, failed, conflict)
- Background worker integration for bulk operations
- Automatic server reconciliation when online

**API:**
```typescript
const {
  tasks,              // Current tasks array (cache + optimistic)
  isLoading,          // Initial load state
  isHydrated,         // Cache hydration complete
  isSyncing,          // Server fetch in progress
  createTask,         // Optimistic create
  updateTask,         // Optimistic update (debounced)
  deleteTask,         // Soft-delete with undo
  undoDelete,         // Restore soft-deleted task
  refreshFromServer,  // Manual server sync
  getTaskState        // Get per-task sync state
} = useOfflineTasks();
```

**Example Usage:**
```typescript
function TaskList() {
  const { tasks, createTask, updateTask, deleteTask, getTaskState } = useOfflineTasks();

  const handleCreate = async () => {
    const task = await createTask({
      userId: 'user-123',
      title: 'New Task',
      status: 'todo',
      priority: 1
    });
    console.log('Created with temp ID:', task._id);
  };

  const handleUpdate = async (taskId: string) => {
    // Debounced - waits 500ms before enqueueing
    await updateTask(taskId, { title: 'Updated Title' });
  };

  const handleDelete = async (taskId: string) => {
    // Soft-delete - can undo within 5 seconds
    await deleteTask(taskId);
    setTimeout(() => {
      // Too late to undo now
    }, 6000);
  };

  return (
    <ul>
      {tasks.map(task => {
        const state = getTaskState(task._id);
        return (
          <li key={task._id}>
            {task.title}
            {state.isPending && <Badge>Syncing...</Badge>}
            {state.isFailed && <Badge>Failed: {state.lastError}</Badge>}
            {state.isConflict && <Badge>Conflict</Badge>}
          </li>
        );
      })}
    </ul>
  );
}
```

### 2. `hooks/useSyncStatus.ts`
React hook for monitoring sync queue status and controlling sync operations.

**Key Features:**
- Real-time aggregate queue metrics
- In-flight operation tracking
- Last sync timestamp
- Imperative sync controls
- Failed item retry mechanism
- Queue clearing operations

**API:**
```typescript
const {
  queueStatus,      // Aggregate metrics
  isProcessing,     // Batch processing in progress
  lastSyncAt,       // Timestamp of last successful sync
  triggerSync,      // Manually trigger batch processing
  clearQueue,       // Clear entire queue
  clearSynced,      // Remove synced items only
  retryFailed,      // Reset failed items to pending
  refreshStatus     // Manually refresh metrics
} = useSyncStatus();
```

**Queue Status Object:**
```typescript
type QueueStatus = {
  total: number;      // Total items in queue
  pending: number;    // Items awaiting sync
  inFlight: number;   // Items currently syncing
  synced: number;     // Successfully synced items
  failed: number;     // Failed items (max retries)
  conflicts: number;  // Items with conflicts
}
```

**Example Usage:**
```typescript
function SyncStatusPanel() {
  const { 
    queueStatus, 
    isProcessing, 
    lastSyncAt, 
    triggerSync, 
    retryFailed 
  } = useSyncStatus();

  return (
    <div>
      <h3>Sync Status</h3>
      <div>Pending: {queueStatus.pending}</div>
      <div>Failed: {queueStatus.failed}</div>
      <div>Conflicts: {queueStatus.conflicts}</div>
      {lastSyncAt && <div>Last Sync: {new Date(lastSyncAt).toLocaleString()}</div>}
      
      <button onClick={triggerSync} disabled={isProcessing}>
        {isProcessing ? 'Syncing...' : 'Sync Now'}
      </button>
      
      {queueStatus.failed > 0 && (
        <button onClick={retryFailed}>
          Retry Failed ({queueStatus.failed})
        </button>
      )}
    </div>
  );
}
```

### 3. `components/providers/OfflineSyncProvider.tsx`
Root provider component that initializes and manages offline-first infrastructure.

**Key Features:**
- IndexedDB initialization with schema migrations
- Sync worker registration and lifecycle management
- Auto-sync on network status changes
- Periodic sync interval (configurable, default 30s)
- Auto-sync on new queue items
- Graceful worker shutdown on unmount

**Props:**
```typescript
type OfflineSyncProviderProps = {
  children: React.ReactNode;
  autoSync?: boolean;      // Enable auto-sync (default: true)
  syncInterval?: number;   // Sync interval in ms (default: 30000)
}
```

**Context API:**
```typescript
const {
  isInitialized,       // IndexedDB ready
  isWorkerRegistered,  // Sync worker available
  autoSyncEnabled,     // Auto-sync state
  setAutoSyncEnabled   // Toggle auto-sync
} = useOfflineSync();
```

**Example Usage:**
```typescript
// In root layout or app component
function App() {
  return (
    <OfflineSyncProvider autoSync={true} syncInterval={30000}>
      <YourApp />
    </OfflineSyncProvider>
  );
}

// In child components
function SyncSettings() {
  const { isInitialized, autoSyncEnabled, setAutoSyncEnabled } = useOfflineSync();

  if (!isInitialized) {
    return <div>Initializing offline storage...</div>;
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={autoSyncEnabled}
        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
      />
      Enable Auto-Sync
    </label>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Component Tree                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  OfflineSyncProvider                                         │   │
│  │  • Initializes IndexedDB                                     │   │
│  │  • Registers sync worker                                     │   │
│  │  • Manages auto-sync lifecycle                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                       │
│                               │ provides context                      │
│                               ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Application Components                                      │   │
│  │                                                               │   │
│  │  ┌──────────────────┐         ┌──────────────────┐          │   │
│  │  │ useOfflineTasks  │         │ useSyncStatus    │          │   │
│  │  │ • CRUD operations│         │ • Queue metrics  │          │   │
│  │  │ • Task state     │         │ • Sync controls  │          │   │
│  │  └──────────────────┘         └──────────────────┘          │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Storage & Sync Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐     ┌──────────────────┐                     │
│  │  IndexedDB       │     │  Sync Queue      │                     │
│  │  • tasks         │────▶│  • Queue items   │                     │
│  │  • syncQueue     │     │  • State machine │                     │
│  │  • metadata      │     └──────────────────┘                     │
│  │  • cache         │              │                                │
│  └──────────────────┘              │ postMessage                    │
│                                    ▼                                │
│                         ┌────────────────────┐                      │
│                         │  Sync Worker       │                      │
│                         │  • Process batch   │                      │
│                         │  • Network calls   │                      │
│                         └────────────────────┘                      │
│                                    │                                │
└────────────────────────────────────┼────────────────────────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  API Server │
                              └─────────────┘
```

## Data Flow

### 1. Task Creation (Offline)
```
User Action
    │
    ▼
createTask() ──────────────────────────────────────┐
    │                                              │
    ├─ Generate temp ID (temp_uuid)               │
    ├─ Create optimistic task                     │
    ├─ Update React state (immediate UI update)   │
    ├─ Save to IndexedDB (tasks store)            │
    └─ Enqueue sync operation                     │
         │                                         │
         ▼                                         │
    Sync Queue                                     │
         │                                         │
         └─ Wait for network                       │
                                                   │
Network Online ◄───────────────────────────────────┘
    │
    ▼
Sync Worker
    │
    ├─ POST /api/tasks
    │
    ▼
Success
    │
    ├─ Server returns real ID
    ├─ Replace temp ID in IndexedDB
    └─ Update React state
```

### 2. Task Update (Debounced)
```
User Action
    │
    ▼
updateTask() ─────────────────────────────────┐
    │                                         │
    ├─ Update React state (immediate)        │
    ├─ Update IndexedDB                      │
    └─ Schedule debounced sync               │
         │                                    │
         │ (wait 500ms)                       │
         ▼                                    │
    More updates? ──YES──► Cancel & reschedule
         │
         NO
         │
         ▼
    Enqueue sync operation
         │
         ▼
    Sync Queue → Worker → PUT /api/tasks/:id
```

### 3. Task Delete (Soft with Undo)
```
User Action
    │
    ▼
deleteTask()
    │
    ├─ Remove from React state (immediate)
    ├─ Store in softDeleted map
    └─ Start 5-second timer
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
    Timer expires            undoDelete() called
         │                          │
         ├─ Remove from IndexedDB   ├─ Cancel timer
         ├─ Enqueue delete sync     ├─ Remove from softDeleted
         └─ Sync to server          └─ Restore to React state
```

### 4. Sync Reconciliation (Coming Online)
```
Network Status Change: Offline → Online
    │
    ▼
OfflineSyncProvider detects change
    │
    ├─ Trigger processPendingSync()
    │
    ▼
Fetch from server
    │
    ├─ GET /api/tasks
    │
    ▼
Reconcile data
    │
    ├─ Merge server tasks
    ├─ Preserve optimistic (temp ID) tasks
    ├─ Update IndexedDB cache
    └─ Update React state
    │
    ▼
Process sync queue
    │
    └─ Upload pending operations
```

## State Management

### Task States
Each task can have the following sync states:
- **Normal:** Task is synced with server
- **Pending:** Task has pending changes in sync queue
- **Failed:** Task sync failed (max retries exceeded)
- **Conflict:** Task has a conflict with server version

### Optimistic Updates
- **Create:** Task gets temporary ID, visible immediately
- **Update:** Changes applied immediately, sync debounced
- **Delete:** Task removed immediately, can undo within window
- **Rollback:** On sync failure, optimistic changes may be rolled back (currently preserves optimistic state until manual resolution)

## Configuration

### Timing Constants
```typescript
// useOfflineTasks
const SOFT_DELETE_UNDO_WINDOW = 5000;  // 5 seconds
const UPDATE_DEBOUNCE_MS = 500;         // 500ms

// OfflineSyncProvider
const DEFAULT_SYNC_INTERVAL = 30000;    // 30 seconds
const SYNC_THROTTLE = 5000;             // 5 seconds minimum between syncs
const ENQUEUE_DEBOUNCE = 1000;          // 1 second after enqueue before auto-sync
```

### Store Names
```typescript
const TASKS_STORE = "tasks";              // IndexedDB store for task cache
const TASKS_ENTITY_TYPE = "tasks";        // Sync queue entity type
const SYNC_QUEUE_STORE = "syncQueue";     // IndexedDB store for queue items
```

## Best Practices

### 1. Provider Setup
Always wrap your app with `OfflineSyncProvider` at the root:
```typescript
// app/layout.tsx or pages/_app.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineSyncProvider autoSync={true}>
          {children}
        </OfflineSyncProvider>
      </body>
    </html>
  );
}
```

### 2. Hook Usage
Use hooks at component level, not globally:
```typescript
// ✅ Good
function TaskList() {
  const { tasks, createTask } = useOfflineTasks();
  // ...
}

// ❌ Bad - hooks must be inside components
const { tasks } = useOfflineTasks();
function TaskList() {
  // ...
}
```

### 3. Temp ID Handling
Always check for temporary IDs when integrating with APIs:
```typescript
const { tasks } = useOfflineTasks();

tasks.forEach(task => {
  if (task._id.startsWith('temp_')) {
    // Task not yet synced to server
    // Don't try to fetch details or perform server operations
  }
});
```

### 4. Error Handling
Monitor task states for sync errors:
```typescript
const { tasks, getTaskState } = useOfflineTasks();

tasks.forEach(task => {
  const state = getTaskState(task._id);
  
  if (state.isFailed) {
    // Show error UI
    console.error('Sync failed:', state.lastError);
  }
  
  if (state.isConflict) {
    // Show conflict resolution UI
  }
});
```

### 5. Manual Sync Control
Provide manual sync controls for user confidence:
```typescript
function SyncButton() {
  const { triggerSync, isProcessing } = useSyncStatus();
  
  return (
    <button 
      onClick={triggerSync} 
      disabled={isProcessing}
    >
      {isProcessing ? 'Syncing...' : 'Sync Now'}
    </button>
  );
}
```

## Performance Considerations

- **Debouncing:** Updates are debounced by 500ms to prevent queue flooding during rapid typing
- **Bulk Operations:** Uses `bulkGet` and `bulkSet` for efficient IndexedDB operations
- **Worker Processing:** Sync operations run in Web Worker to avoid blocking UI
- **Cache-First:** Always hydrates from IndexedDB first for instant load
- **Throttling:** Auto-sync throttled to minimum 5 seconds between attempts

## Testing

### Manual Testing Workflow
1. Go offline (Chrome DevTools → Network → Offline)
2. Create tasks → See temporary IDs
3. Update tasks → See immediate UI updates
4. Delete task → Click undo within 5 seconds
5. Go online
6. Watch tasks sync and IDs replace with server IDs
7. Verify sync status in `useSyncStatus`

### Integration Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useOfflineTasks } from '@/hooks/useOfflineTasks';

test('creates task optimistically', async () => {
  const { result } = renderHook(() => useOfflineTasks());
  
  await act(async () => {
    const task = await result.current.createTask({
      userId: 'user-1',
      title: 'Test Task',
      status: 'todo',
      priority: 1
    });
    
    expect(task._id).toMatch(/^temp_/);
    expect(result.current.tasks).toContainEqual(task);
  });
});
```

## Troubleshooting

### Tasks Not Syncing
1. Check network status: `useNetworkStatus().isOnline`
2. Check queue status: `useSyncStatus().queueStatus`
3. Check worker registration: `useOfflineSync().isWorkerRegistered`
4. Look for failed items: `queueStatus.failed > 0`

### Temp IDs Not Replaced
- Ensure server returns created task with real ID in response
- Check sync worker is processing create operations
- Verify API endpoint returns 201 with task object

### Memory Leaks
- Provider automatically cleans up workers on unmount
- Hooks clean up timers and subscriptions
- Always use hooks inside components, not global scope

## Future Enhancements

1. **Optimistic Rollback:** Auto-rollback optimistic updates on conflict
2. **Conflict Resolution UI:** Built-in conflict resolution components
3. **Offline Indicators:** Visual indicators for temp IDs and pending states
4. **Retry Strategies:** Configurable retry strategies per operation type
5. **Selective Sync:** Sync specific entity types or priorities
6. **Compression:** Compress large payloads before sync
7. **Encryption:** Encrypt sensitive data in IndexedDB
