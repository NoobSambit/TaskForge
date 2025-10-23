# Advanced Service Worker Features

This document provides a quick reference for the advanced service worker capabilities implemented in this application.

## Quick Start

### Basic Usage

```typescript
import { useServiceWorker } from "@/hooks/useServiceWorker";

function MyComponent() {
  const [swState, swActions] = useServiceWorker({
    autoRegister: true,
    autoRefreshQueue: true,
    onSyncCompleted: (message) => {
      console.log(`Synced ${message.result.processed} items`);
    }
  });

  return (
    <div>
      <p>Queue: {swState.queueStatus?.pending || 0} pending</p>
      <button onClick={() => swActions.sync()}>Sync Now</button>
    </div>
  );
}
```

## Caching Strategies

### Strategy Selection Table

| Resource Type | Strategy | Reason |
|--------------|----------|--------|
| Static assets (`/_next/static/*`) | Cache-First | Never change, fastest load |
| Icons, fonts | Cache-First | Rarely change, performance critical |
| Dashboard pages | Stale-While-Revalidate | Instant render + background refresh |
| API reads (`GET /api/tasks`) | Network-First (5s timeout) | Fresh data preferred, cache fallback |
| Auth endpoints | Network-Only | Security requirement |
| API mutations | Queue on failure | Offline support |

### How It Works

```
User Request
    ↓
Service Worker
    ↓
Strategy Router
    ↓
┌─────────────┬──────────────┬─────────────────┬──────────────┐
│             │              │                 │              │
Cache-First   Network-First  Stale-While-     Network-Only
                              Revalidate
```

## Background Sync Queue

### Automatic Queueing

Failed mutations to `/api/tasks` are automatically queued:

```typescript
// This happens automatically in the service worker
POST /api/tasks (fails) → Queued
PUT /api/tasks/123 (fails) → Queued
DELETE /api/tasks/123 (fails) → Queued
```

### Manual Sync

Trigger sync programmatically:

```typescript
import { triggerManualSync } from "@/lib/serviceWorker";

const result = await triggerManualSync();
console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
```

### Queue Status

Check current queue status:

```typescript
import { getServiceWorkerQueueStatus } from "@/lib/serviceWorker";

const status = await getServiceWorkerQueueStatus();
console.log({
  total: status.total,
  pending: status.pending,
  failed: status.failed,
  synced: status.synced
});
```

## Messaging API

### Send Messages

```typescript
import { postMessageToServiceWorker } from "@/lib/serviceWorker";

// Simple message (no response expected)
await postMessageToServiceWorker({ 
  type: "CLEAR_RUNTIME_CACHE" 
});
```

### Send with Response

```typescript
import { postMessageWithResponse } from "@/lib/serviceWorker";

const response = await postMessageWithResponse(
  { type: "GET_QUEUE_STATUS" },
  5000 // timeout
);

console.log(response.status);
```

### Listen for Messages

```typescript
import { onServiceWorkerMessage } from "@/lib/serviceWorker";
import type { ServiceWorkerIncomingMessage } from "@/types/serviceWorker";

const unsubscribe = onServiceWorkerMessage((event) => {
  const message = event.data as ServiceWorkerIncomingMessage;
  
  if (message.type === "SYNC_COMPLETED") {
    console.log("Background sync completed!");
  }
});

// Cleanup when component unmounts
return () => unsubscribe();
```

## Cache Management

### Clear Cache

Remove all runtime and API caches:

```typescript
import { clearServiceWorkerCache } from "@/lib/serviceWorker";

await clearServiceWorkerCache();
```

### Cleanup Cache

Enforce size limits and remove stale entries:

```typescript
import { cleanupServiceWorkerCache } from "@/lib/serviceWorker";

await cleanupServiceWorkerCache();
```

## Analytics Buffering

Store analytics data offline for later sync:

```typescript
import { logAnalyticsToServiceWorker } from "@/lib/serviceWorker";

await logAnalyticsToServiceWorker({
  event: "task_created",
  taskId: "123",
  timestamp: Date.now(),
  source: "dashboard"
});
```

## React Hook

### Full Example

```typescript
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useEffect } from "react";

function SyncStatus() {
  const [state, actions] = useServiceWorker({
    autoRegister: true,
    autoRefreshQueue: true,
    refreshInterval: 5000,
    onSyncEnqueued: (message) => {
      console.log("Request queued:", message.itemId);
    },
    onSyncSuccess: (message) => {
      console.log("Request synced:", message.itemId);
    },
    onSyncFailure: (message) => {
      console.error("Request failed:", message.itemId, message.error);
    },
    onSyncCompleted: (message) => {
      console.log("Sync completed:", message.result);
    }
  });

  if (!state.isSupported) {
    return <p>Service workers not supported</p>;
  }

  if (!state.isReady) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h2>Sync Status</h2>
      
      {state.error && <p>Error: {state.error}</p>}
      
      {state.queueStatus && (
        <div>
          <p>Total: {state.queueStatus.total}</p>
          <p>Pending: {state.queueStatus.pending}</p>
          <p>Failed: {state.queueStatus.failed}</p>
          <p>Synced: {state.queueStatus.synced}</p>
        </div>
      )}
      
      {state.lastSyncResult && (
        <p>
          Last sync: {state.lastSyncResult.processed} processed, 
          {state.lastSyncResult.failed} failed
        </p>
      )}
      
      <button onClick={() => actions.sync()}>
        Sync Now
      </button>
      
      <button onClick={() => actions.clearCache()}>
        Clear Cache
      </button>
      
      <button onClick={() => actions.cleanupCache()}>
        Cleanup Cache
      </button>
      
      <button onClick={() => actions.refreshQueueStatus()}>
        Refresh Status
      </button>
    </div>
  );
}
```

## Configuration

### Service Worker Constants

Located in `public/service-worker.js`:

```javascript
const CACHE_VERSION = "v2";           // Increment to invalidate all caches
const MAX_CACHE_SIZE = 100;           // Maximum entries per cache
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NETWORK_TIMEOUT_MS = 5000;      // 5 seconds
const MAX_SYNC_ATTEMPTS = 5;          // Maximum retry attempts
const BASE_BACKOFF_MS = 1000;         // Base retry delay
```

### Customizing Strategies

To modify caching strategies, edit the `handleFetch` function in `public/service-worker.js`:

```javascript
// Example: Add new route to cache-first strategy
if (
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/your-new-route/")  // Add this
) {
  return cacheFirst(request);
}
```

## Debugging

### Chrome DevTools

1. **Application → Service Workers**
   - Check registration status
   - Update on reload (for development)
   - Unregister if needed

2. **Application → Cache Storage**
   - Inspect cached resources
   - Delete specific caches
   - View cache contents

3. **Application → IndexedDB**
   - View sync queue items
   - Inspect task data
   - Check metadata

4. **Console**
   - All SW logs prefixed with `[SW]`
   - Network errors show retry attempts
   - Sync events logged

### Network Simulation

Test offline behavior:

1. Open DevTools
2. Network tab → Throttling dropdown
3. Select "Offline"
4. Try creating/updating tasks
5. Go back "Online"
6. Watch sync queue process

### Common Issues

**Queue not syncing:**
- Check if online
- Verify background sync supported
- Manually trigger with `actions.sync()`

**Cache not updating:**
- Increment `CACHE_VERSION`
- Clear cache with `actions.clearCache()`
- Hard reload (Ctrl+Shift+R)

**Messages not received:**
- Check SW is controlling page
- Verify listener is active
- Check console for errors

## Best Practices

### Do's ✅
- Always handle service worker messages gracefully
- Provide UI feedback for queued operations
- Show sync status to users
- Clear cache on logout
- Test offline scenarios
- Increment cache version on SW updates

### Don'ts ❌
- Don't cache sensitive auth data
- Don't queue infinite operations
- Don't ignore failed sync notifications
- Don't modify queue items directly
- Don't cache POST/PUT/DELETE responses
- Don't disable SW in production

## Performance Tips

1. **Minimize cache size:** Keep `MAX_CACHE_SIZE` reasonable
2. **Cleanup regularly:** Use periodic cleanup
3. **Batch analytics:** Buffer and send in batches
4. **Selective caching:** Only cache frequently accessed resources
5. **Network timeout:** Adjust `NETWORK_TIMEOUT_MS` based on needs

## Security Considerations

1. **Auth endpoints:** Never cached
2. **CSRF tokens:** Requests with CSRF headers skip cache
3. **Credentials:** Not stored in queue, passed at sync time
4. **HTTPS required:** Service workers require secure context
5. **Origin isolation:** SW only handles same-origin requests

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Workers | 40+ | 44+ | 11.1+ | 17+ |
| Background Sync | 49+ | ❌ | ❌ | 79+ |
| Cache API | 40+ | 41+ | 11.1+ | 79+ |
| IndexedDB | 24+ | 16+ | 10+ | 12+ |

**Note:** Graceful degradation implemented for unsupported features.

## Migration Guide

### From Basic SW to Advanced SW

1. **Update service worker file**
   - Replace `public/service-worker.js` with new version
   - Update `CACHE_VERSION` to force refresh

2. **Update client code**
   - Import from `@/lib/serviceWorker`
   - Use `useServiceWorker` hook
   - Handle sync messages

3. **Test thoroughly**
   - Offline mode
   - Queue processing
   - Cache strategies
   - Message passing

4. **Deploy**
   - Clear old caches
   - Monitor error rates
   - Watch sync queue metrics
