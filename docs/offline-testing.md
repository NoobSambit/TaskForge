# Offline-First Architecture & QA Guide

This guide documents the offline-first architecture, queue behaviour, automated safeguards, and the recommended manual verification checklist for regression hardening. It captures the scenarios covered by the acceptance criteria—including offline CRUD, conflict resolution, background sync retries, and slow network behaviour—along with security and graceful-degradation considerations.

## Architectural Overview

| Component | Responsibilities | Key Files |
|-----------|-----------------|-----------|
| Indexed storage abstraction | Provides IndexedDB → LocalStorage → in-memory fallback layers, background worker orchestration, and TTL-aware persistence for domain stores. | [`lib/indexedDB.ts`](../lib/indexedDB.ts), [`workers/db-worker.ts`](../workers/db-worker.ts) |
| Sync queue | Maintains FIFO mutation queue with exponential backoff, conflict detection hooks, service worker signalling, and worker-based batch processing. | [`lib/syncQueue.ts`](../lib/syncQueue.ts), [`SYNC_QUEUE_IMPLEMENTATION.md`](../SYNC_QUEUE_IMPLEMENTATION.md) |
| Network status monitor | Normalises online/offline/degraded states, emits transition events, performs heartbeat/backoff checks, and exposes wait utilities for consumers. | [`lib/networkStatus.ts`](../lib/networkStatus.ts) |
| Service worker | Handles install/update lifecycles, caching strategies, background sync, failed request replay, client messaging, and cache hygiene. | [`public/service-worker.js`](../public/service-worker.js), [`ADVANCED_SERVICE_WORKER.md`](../ADVANCED_SERVICE_WORKER.md) |
| Offline UI surfaces | Route-aware offline screens, optimistic UI hooks, and mutation helpers that interact with the queue. | `app/`, `components/`, [`OFFLINE_TASKS_HOOKS.md`](../OFFLINE_TASKS_HOOKS.md) |

### Queue behaviour essentials

- **Enqueue**: Mutations are persisted immediately with metadata, then the service worker is notified to opportunistically process them.
- **Processing**: Pending items are promoted to `in_flight`, dispatched via the sync worker, and resolved as `synced`, `conflict`, or `failed` based on worker feedback.
- **Retries**: Failures below the maximum attempt threshold are rescheduled using capped exponential backoff with jitter. Conflicts emit payloads for UI arbitration.
- **Background sync**: When available, the service worker registers `sync-queue`. When unavailable, the foreground queue continues polling via regular app activity.
- **Cleanup**: Successful items are drained and caches are periodically pruned to avoid quota pressure.

## Automated regression safeguards

Run all fast checks before shipping changes:

```bash
npm run typecheck
npm run build
npm run test
```

### Unit tests added in this hardening pass

- **Sync queue backoff** — validates monotonic, jittered, and max-capped retry delays to prevent accidental regressions in the scheduling window.
- **Network status transitions** — exercises offline → degraded → online transitions, listener notifications, and failure counter hygiene so state-driven UI remains reliable.

## Manual verification checklist

The following matrix should be executed for each release that touches offline-first flows. Capture any deviations or regressions discovered and feed them back into automation where possible.

### Offline CRUD flows

1. **Create/Update/Delete while offline**
   - Toggle the browser to offline.
   - Perform create, update, and delete operations.
   - Confirm optimistic UI placeholders appear and queue counters increment.
   - Reconnect and verify the mutations replay and UI reconciles with the server response.

2. **Conflict resolution**
   - Stage a conflicting update from another client.
   - Execute the same mutation offline and then reconnect.
   - Ensure conflicts surface with actionable payloads and allow user choice before resolution.

### Background sync & retry paths

1. **Background sync retries**
   - Induce a transient server error (5xx) while online.
   - Confirm the queue schedules retries with increasing backoff and caps at the maximum attempts.
   - Inspect service worker logs (via DevTools Application → Service Workers) to confirm retry registration when supported.

2. **Slow/unstable network simulation**
   - Throttle the network (e.g. Chrome DevTools → Network → Slow 3G).
   - Verify heartbeat transitions into `degraded`, UI messaging shifts accordingly, and the queue pauses/resumes gracefully as conditions improve.

### PWA installation & lifecycle

1. **Install prompt** — Verify the PWA can be installed and launched as a standalone window.
2. **Service worker updates** — Trigger an asset change, reload, and confirm the new worker activates without leaving zombie clients.
3. **Cache cleanup** — Use the in-app cache management surface (or `clearServiceWorkerCache` helper) and validate static/runtime caches shrink accordingly.

### Storage and quota fallbacks

1. **IndexedDB unavailable** — Run the app in a private window or an older browser configuration with IndexedDB disabled. Ensure storage falls back to LocalStorage → in-memory without runtime errors.
2. **Background sync unsupported** — Use a browser without Background Sync, confirm the app logs the limitation, and manual retries remain possible from the foreground.
3. **Quota exhaustion** — Simulate low storage space (Chrome DevTools Application tab → Clear storage, then throttle quotas) and confirm the app surfaces errors while preserving critical functionality.

## Security considerations

- **Authentication endpoints are never cached** — the service worker now bypasses any request containing `Authorization` headers or targeting `/api/auth` and session routes so credentials and personalised responses stay ephemeral.
- **Token handling** — auth tokens are only forwarded in-flight (worker messages include bearer tokens in headers but never persist them to IndexedDB, caches, or logs).
- **Sensitive headers** — requests with CSRF tokens or mutation verbs bypass cache layers entirely.
- **Service worker storage hygiene** — cache cleanup tasks prune stale entries and enforce size bounds to limit exposure windows for cached responses.

## Graceful degradation summary

| Capability | Behaviour when unsupported |
|------------|----------------------------|
| IndexedDB | Falls back to LocalStorage or in-memory stores via `lib/indexedDB.ts`, preserving queue semantics albeit without persistence across reloads. |
| Web Workers | When workers are unavailable, the queue processes synchronously in the main thread. |
| Background Sync | The queue still retries from the foreground; service worker logs a warning and the UI surfaces manual retry affordances. |
| Network Information API | Metadata is optional; status transitions still fire using browser `online/offline` events and heartbeat checks. |

Keep this guide updated as new offline scenarios, mitigations, or automation gaps are identified. Tight alignment between the documentation, automated coverage, and manual verification will prevent regressions as the offline-first surface area grows.
