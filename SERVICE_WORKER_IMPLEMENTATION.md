# Service Worker Implementation Guide

## Overview

This document describes the advanced service worker implementation that provides offline-first capabilities, intelligent caching strategies, background synchronization, and client-worker communication channels.

## Architecture

### Core Components

1. **Service Worker** (`public/service-worker.js`)
   - Lifecycle management (install/activate)
   - Multiple caching strategies
   - Background sync queue
   - Client messaging
   - Cache management and cleanup

2. **Client Library** (`lib/serviceWorker.ts`)
   - Service worker registration
   - Message passing utilities
   - Background sync triggers
   - Queue status queries

3. **Type Definitions** (`types/serviceWorker.ts`)
   - Message type definitions
   - Service worker configuration types
   - Response types

## Features

### 1. Lifecycle Management

#### Install Event
- Opens and initializes IndexedDB
- Pre-caches critical resources (offline.html, manifest.json)
- Skips waiting to activate immediately

#### Activate Event
- Cleans up old cache versions
- Enforces cache size limits
- Removes stale entries
- Takes control of all clients

### 2. Caching Strategies

The service worker implements multiple caching strategies based on request type:

#### Cache-First Strategy
**Used for:** Static assets, icons, fonts
- Serves from cache if available
- Falls back to network if not cached
- Updates cache with network response
- **Routes:**
  - `/_next/static/*`
  - `/icons/*`
  - `/fonts/*`
  - Static file extensions: `.woff2`, `.woff`, `.ttf`, `.eot`, `.ico`, `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`

#### Stale-While-Revalidate Strategy
**Used for:** Dashboard and task pages
- Returns cached response immediately
- Updates cache in background with fresh data
- **Routes:**
  - `/dashboard/*`
  - `/tasks/*`
  - `/` (homepage)

#### Network-First with Timeout Strategy
**Used for:** API task reads
- Attempts network request with 5-second timeout
- Falls back to cache on timeout or network error
- Falls back to IndexedDB for specific task data
- Updates cache with successful responses
- **Routes:**
  - `GET /api/tasks/*`

#### Network-Only Strategy
**Used for:** Auth and session endpoints
- Always fetches from network
- No caching to protect sensitive data
- **Routes:**
  - `/api/auth/*`
  - Any route containing `/session`
  - Requests with CSRF tokens

### 3. Background Sync Queue

The service worker automatically intercepts failed mutations and queues them for retry.

#### Queue Item Structure
```javascript
{
  id: "sync-{timestamp}-{random}",
  entityType: "tasks",
  entityId: "{task-id}",
  operation: "create" | "update" | "delete",
  payload: { /* request body */ },
  status: "pending" | "in_flight" | "synced" | "failed",
  attempts: 0,
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601",
  lastAttemptAt?: "ISO-8601",
  lastError?: "error message",
  scheduledAt?: "ISO-8601",
  metadata: {
    url: "/api/tasks/123",
    method: "POST",
    timestamp: "ISO-8601"
  }
}
```

#### Retry Logic
- **Maximum attempts:** 5
- **Backoff strategy:** Exponential with jitter
  - Attempt 1: ~1 second
  - Attempt 2: ~2 seconds
  - Attempt 3: ~4 seconds
  - Attempt 4: ~8 seconds
  - Attempt 5: ~16 seconds
- **Maximum backoff:** 5 minutes

#### Sync Process
1. Failed POST/PUT/DELETE requests to `/api/tasks` are intercepted
2. Request payload is extracted and queued in IndexedDB
3. Background sync event is registered
4. On sync event or when online:
   - Retrieve pending items from queue
   - Filter items ready for retry (not over max attempts, past scheduled time)
   - Replay each request sequentially
   - Update item status based on result
5. Notify all clients of sync progress

### 4. Client Messaging

The service worker provides bidirectional communication with the main thread.

#### Messages from Client to Service Worker

##### SKIP_WAITING
Activate new service worker immediately
```typescript
postMessageToServiceWorker({ type: "SKIP_WAITING" });
```

##### CLEAR_CACHE
Clear runtime and API caches
```typescript
const success = await clearServiceWorkerCache();
```

##### CLEANUP_CACHE
Enforce cache size limits and remove stale entries
```typescript
const success = await cleanupServiceWorkerCache();
```

##### GET_QUEUE_STATUS
Get current sync queue status
```typescript
const status = await getServiceWorkerQueueStatus();
// Returns: { total, pending, failed, synced }
```

##### SYNC_NOW
Manually trigger sync queue processing
```typescript
const result = await triggerManualSync();
// Returns: { processed, failed }
```

##### LOG_ANALYTICS
Store analytics data for later sync
```typescript
await logAnalyticsToServiceWorker({
  event: "page_view",
  page: "/dashboard",
  timestamp: Date.now()
});
```

#### Messages from Service Worker to Client

##### SYNC_ENQUEUED
Notifies when a failed request is queued
```typescript
{
  type: "SYNC_ENQUEUED",
  itemId: "sync-123",
  item: { /* queue item */ }
}
```

##### SYNC_SUCCESS
Notifies when a queued item syncs successfully
```typescript
{
  type: "SYNC_SUCCESS",
  itemId: "sync-123",
  item: { id, status: "synced", updatedAt }
}
```

##### SYNC_FAILURE
Notifies when a queued item fails to sync
```typescript
{
  type: "SYNC_FAILURE",
  itemId: "sync-123",
  item: { id, status, attempts, lastError, updatedAt },
  error: "error message"
}
```

##### SYNC_COMPLETED
Notifies when background sync completes
```typescript
{
  type: "SYNC_COMPLETED",
  tag: "sync-queue",
  result: { processed: 5, failed: 1 },
  timestamp: 1234567890
}
```

##### SYNC_ERROR
Notifies when background sync encounters an error
```typescript
{
  type: "SYNC_ERROR",
  tag: "sync-queue",
  error: "error message",
  timestamp: 1234567890
}
```

### 5. Cache Management

#### Size Limits
- **Runtime cache:** 100 entries maximum
- **API cache:** 100 entries maximum
- **Static cache:** No limit (only pre-cached resources)

#### Stale Entry Cleanup
- **Maximum age:** 7 days
- Entries older than 7 days are automatically removed during:
  - Service worker activation
  - Manual cleanup requests
  - Periodic sync (if supported)

#### Cleanup Process
1. Retrieve all cache entries with timestamps
2. Sort by timestamp (oldest first)
3. Delete entries exceeding size limit
4. Delete entries exceeding age limit

### 6. Security Considerations

#### Sensitive Data Protection
The service worker explicitly avoids caching:
- Auth endpoints (`/api/auth/*`)
- Session endpoints (any route containing `/session`)
- Requests with CSRF tokens (header: `x-csrf-token`)
- All mutation requests (POST, PUT, DELETE, PATCH) except for queue management

#### Request Interception Safety
- Failed mutations are queued with minimal sensitive data
- Credentials are included in replay requests but not stored in queue
- Auth tokens are passed through messages, not persisted
- Queue items only store operation metadata and payload

### 7. Offline Fallback

When a navigation request fails and no cached version exists:
1. Service worker serves `/offline.html`
2. Offline page displays user-friendly message
3. User can retry when connection is restored

### 8. IndexedDB Integration

The service worker uses IndexedDB for persistent storage:

#### Object Stores
- **sync_queue:** Stores queued mutations for background sync
- **tasks:** Stores task data for offline access
- **cache:** General-purpose cache store
- **metadata:** Stores analytics and other metadata

#### Fallback Chain for API Requests
1. Network request (with timeout)
2. Cache API
3. IndexedDB (for task data)
4. Error response

## Usage Examples

### Registration

```typescript
import { registerServiceWorker } from "@/lib/serviceWorker";

// Register on app load
registerServiceWorker().then((registration) => {
  if (registration) {
    console.log("Service worker registered");
  }
});
```

### Listening for Sync Events

```typescript
import { onServiceWorkerMessage } from "@/lib/serviceWorker";
import type { ServiceWorkerIncomingMessage } from "@/types/serviceWorker";

const unsubscribe = onServiceWorkerMessage((event) => {
  const message = event.data as ServiceWorkerIncomingMessage;
  
  switch (message.type) {
    case "SYNC_ENQUEUED":
      console.log("Request queued:", message.itemId);
      break;
      
    case "SYNC_SUCCESS":
      console.log("Request synced:", message.itemId);
      break;
      
    case "SYNC_FAILURE":
      console.error("Request failed:", message.itemId, message.error);
      break;
      
    case "SYNC_COMPLETED":
      console.log("Sync completed:", message.result);
      break;
  }
});

// Cleanup
unsubscribe();
```

### Manual Sync

```typescript
import { triggerManualSync } from "@/lib/serviceWorker";

// Trigger sync manually (e.g., on user button click)
const result = await triggerManualSync();
if (result) {
  console.log(`Processed ${result.processed}, failed ${result.failed}`);
}
```

### Queue Status

```typescript
import { getServiceWorkerQueueStatus } from "@/lib/serviceWorker";

const status = await getServiceWorkerQueueStatus();
if (status) {
  console.log(`Queue: ${status.pending} pending, ${status.failed} failed`);
}
```

### Cache Management

```typescript
import { cleanupServiceWorkerCache, clearServiceWorkerCache } from "@/lib/serviceWorker";

// Periodic cleanup (in background)
await cleanupServiceWorkerCache();

// Full cache clear (on logout or settings change)
await clearServiceWorkerCache();
```

## Browser Support

### Core Features
- Chrome/Edge 40+
- Firefox 44+
- Safari 11.1+
- Opera 27+

### Background Sync API
- Chrome/Edge 49+
- Not supported in Firefox or Safari (graceful fallback provided)

### Periodic Background Sync
- Chrome/Edge 80+ (with flag)
- Not widely supported (graceful no-op if unavailable)

## Performance Considerations

### Network Timeout
- API requests timeout after 5 seconds
- Prevents long-hanging requests from blocking UI
- Fallback to cache is instant

### Batch Processing
- Sync queue processes items sequentially
- Prevents overwhelming the server
- Allows individual retry scheduling

### Cache Strategy Selection
- Static assets: Cache-first (fastest load time)
- Dynamic pages: Stale-while-revalidate (instant response + fresh data)
- API reads: Network-first (fresh data with fallback)
- Auth: Network-only (security)

## Debugging

### Chrome DevTools
1. Open DevTools → Application tab
2. Service Workers section shows registration status
3. Check "Update on reload" during development
4. Use "Unregister" to remove service worker
5. Storage section shows:
   - Cache Storage (cache entries)
   - IndexedDB (queue items, tasks)

### Console Logging
All service worker operations are logged with `[SW]` prefix:
- Install/activate events
- Cache operations
- Sync queue processing
- Message passing

### Network Throttling
Test offline functionality:
1. DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Try navigating and performing actions
4. Go back online to see sync queue process

## Troubleshooting

### Service Worker Not Updating
- Clear browser cache
- Unregister service worker in DevTools
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check for errors in console

### Queue Items Not Syncing
- Check network status
- Verify background sync is supported
- Manually trigger sync with `triggerManualSync()`
- Check queue status with `getServiceWorkerQueueStatus()`

### Cache Not Working
- Verify service worker is active
- Check cache storage in DevTools
- Clear cache and retry
- Verify routes match caching strategies

### Messages Not Received
- Ensure service worker is controlling the page
- Check that client is listening for messages
- Verify message types match defined types
- Check for errors in console

## Future Enhancements

- [ ] Implement conflict resolution UI
- [ ] Add periodic background sync for cache cleanup
- [ ] Support for push notifications
- [ ] Advanced analytics buffering and batching
- [ ] Request coalescing for duplicate API calls
- [ ] Smarter cache invalidation strategies
- [ ] Differential sync for large payloads
- [ ] Service worker update notifications
