/**
 * Sync Queue Management Module
 * 
 * Orchestrates a FIFO queue backed by IndexedDB for offline-first data synchronization.
 * 
 * Features:
 * - FIFO queue with batch processing
 * - Exponential backoff for retries (max 5 attempts)
 * - Conflict detection and resolution hooks
 * - Event emission for UI/service worker integration
 * - Web Worker processing for off-main-thread operations
 * - Service Worker integration for background sync
 * 
 * Usage:
 * ```ts
 * // Enqueue a sync operation
 * await enqueue('tasks', 'task-123', SyncOperation.Update, { title: 'Updated task' });
 * 
 * // Register worker and process batch
 * registerWorker();
 * await processBatch(authToken);
 * 
 * // Listen for sync events
 * const unsubscribe = addEventListener((event) => {
 *   if (event.type === 'conflict') {
 *     // Handle conflict
 *   }
 * });
 * 
 * // Register conflict detector
 * registerConflictDetector('tasks', (item, remoteData) => {
 *   // Custom conflict detection logic
 *   return localVersion !== remoteVersion;
 * });
 * ```
 */

import {
  SyncQueueItem,
  SyncQueueItemStatus,
  SyncOperation,
  SyncQueueEvent,
  SyncConflictPayload,
  SyncConflictResolutionStatus,
  SyncQueueSnapshot,
  SyncOperationMetadata,
  SyncWorkerProcessMessage,
  SyncWorkerResultMessage,
} from "@/types/sync";
import * as indexedDB from "./indexedDB";
import { triggerBackgroundSync } from "./serviceWorker";
import { isOnline } from "./networkStatus";

type SyncQueueEventListener = (event: SyncQueueEvent) => void;

type ConflictDetector = (
  item: SyncQueueItem,
  remoteData: unknown
) => boolean | Promise<boolean>;

type SyncWorkerController = {
  worker: Worker;
  pending: Map<string, { resolve: (results: Array<SyncWorkerResultMessage>) => void; reject: (error: unknown) => void }>;
};

const SYNC_QUEUE_STORE = "syncQueue";
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 300000;
const BATCH_SIZE = 10;
const WORKER_TIMEOUT = 30000;

const listeners = new Set<SyncQueueEventListener>();
let workerController: SyncWorkerController | null = null;
let conflictDetectors = new Map<string, ConflictDetector>();

const createItemId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const createBatchId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const computeBackoff = (attempts: number): number => {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attempts - 1);
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
};

const emitEvent = (event: SyncQueueEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("[SyncQueue] event listener failed", error);
    }
  });
};

const getAllItems = async (): Promise<Array<SyncQueueItem>> => {
  const keys = await indexedDB.getAllKeys(SYNC_QUEUE_STORE);
  const items: Array<SyncQueueItem> = [];

  for (const key of keys) {
    const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, key);
    if (item) {
      items.push(item);
    }
  }

  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

const getItemsByStatus = async (status: SyncQueueItemStatus): Promise<Array<SyncQueueItem>> => {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.status === status);
};

const getPendingItems = async (): Promise<Array<SyncQueueItem>> => {
  const allItems = await getAllItems();
  const now = Date.now();

  return allItems.filter((item) => {
    if (item.status !== SyncQueueItemStatus.Pending) {
      return false;
    }

    if (item.attempts >= MAX_ATTEMPTS) {
      return false;
    }

    if (item.scheduledAt) {
      const scheduledTime = new Date(item.scheduledAt).getTime();
      return scheduledTime <= now;
    }

    return true;
  });
};

export const enqueue = async (
  entityType: string,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
  metadata?: SyncOperationMetadata
): Promise<SyncQueueItem> => {
  const now = new Date().toISOString();
  const item: SyncQueueItem = {
    id: createItemId(),
    entityType,
    entityId,
    operation,
    payload,
    status: SyncQueueItemStatus.Pending,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    metadata: metadata ? { ...metadata } : undefined,
  };

  await indexedDB.setItem(SYNC_QUEUE_STORE, item.id, item);

  emitEvent({
    type: "enqueue",
    itemId: item.id,
    item,
  });

  void notifyServiceWorker();

  return item;
};

export const batchPeek = async (limit = BATCH_SIZE): Promise<Array<SyncQueueItem>> => {
  const pending = await getPendingItems();
  return pending.slice(0, limit);
};

export const markInFlight = async (itemId: string): Promise<void> => {
  const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, itemId);
  if (!item) {
    return;
  }

  const now = new Date().toISOString();
  const updated: SyncQueueItem = {
    ...item,
    status: SyncQueueItemStatus.InFlight,
    lastAttemptAt: now,
    updatedAt: now,
  };

  await indexedDB.setItem(SYNC_QUEUE_STORE, itemId, updated);
};

export const markSuccess = async (itemId: string): Promise<void> => {
  const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, itemId);
  if (!item) {
    return;
  }

  const now = new Date().toISOString();
  const updated: SyncQueueItem = {
    ...item,
    status: SyncQueueItemStatus.Synced,
    updatedAt: now,
  };

  await indexedDB.setItem(SYNC_QUEUE_STORE, itemId, updated);

  emitEvent({
    type: "success",
    itemId,
    item: updated,
  });
};

export const markFailure = async (itemId: string, error: string): Promise<void> => {
  const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, itemId);
  if (!item) {
    return;
  }

  const now = new Date().toISOString();
  const newAttempts = item.attempts + 1;

  let status = SyncQueueItemStatus.Pending;
  let scheduledAt: string | undefined;

  if (newAttempts >= MAX_ATTEMPTS) {
    status = SyncQueueItemStatus.Failed;
  } else {
    const backoffMs = computeBackoff(newAttempts);
    scheduledAt = new Date(Date.now() + backoffMs).toISOString();
  }

  const updated: SyncQueueItem = {
    ...item,
    status,
    attempts: newAttempts,
    lastAttemptAt: now,
    lastError: error,
    scheduledAt,
    updatedAt: now,
  };

  await indexedDB.setItem(SYNC_QUEUE_STORE, itemId, updated);

  emitEvent({
    type: "failure",
    itemId,
    item: updated,
    error,
  });

  if (status === SyncQueueItemStatus.Pending) {
    void notifyServiceWorker();
  }
};

export const markConflict = async (
  itemId: string,
  local: Record<string, unknown> | null,
  remote: Record<string, unknown> | null,
  message?: string
): Promise<void> => {
  const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, itemId);
  if (!item) {
    return;
  }

  const now = new Date().toISOString();
  const updated: SyncQueueItem = {
    ...item,
    status: SyncQueueItemStatus.Conflict,
    updatedAt: now,
  };

  await indexedDB.setItem(SYNC_QUEUE_STORE, itemId, updated);

  const conflict: SyncConflictPayload = {
    queueItemId: itemId,
    entityType: item.entityType,
    entityId: item.entityId,
    operation: item.operation,
    local,
    remote,
    resolution: SyncConflictResolutionStatus.Unresolved,
    detectedAt: now,
    message,
  };

  emitEvent({
    type: "conflict",
    itemId,
    item: updated,
    conflict,
  });
};

export const registerConflictDetector = (
  entityType: string,
  detector: ConflictDetector
): void => {
  conflictDetectors.set(entityType, detector);
};

export const unregisterConflictDetector = (entityType: string): void => {
  conflictDetectors.delete(entityType);
};

export const detectConflict = async (
  item: SyncQueueItem,
  remoteData: unknown
): Promise<boolean> => {
  const detector = conflictDetectors.get(item.entityType);
  if (!detector) {
    return false;
  }

  try {
    return await detector(item, remoteData);
  } catch (error) {
    console.error("[SyncQueue] conflict detector failed", error);
    return false;
  }
};

export const clearSynced = async (): Promise<number> => {
  const synced = await getItemsByStatus(SyncQueueItemStatus.Synced);
  await Promise.all(synced.map((item) => indexedDB.removeItem(SYNC_QUEUE_STORE, item.id)));

  emitEvent({
    type: "cleared",
  });

  return synced.length;
};

export const clearAll = async (): Promise<number> => {
  const allItems = await getAllItems();
  await indexedDB.clearStore(SYNC_QUEUE_STORE);

  emitEvent({
    type: "cleared",
  });

  return allItems.length;
};

export const getSnapshot = async (): Promise<SyncQueueSnapshot> => {
  const allItems = await getAllItems();

  const pending = allItems.filter((item) => item.status === SyncQueueItemStatus.Pending).length;
  const failed = allItems.filter((item) => item.status === SyncQueueItemStatus.Failed).length;
  const conflicts = allItems.filter((item) => item.status === SyncQueueItemStatus.Conflict).length;

  return {
    items: allItems,
    pending,
    failed,
    conflicts,
    lastUpdatedAt: new Date().toISOString(),
  };
};

export const addEventListener = (listener: SyncQueueEventListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const removeEventListener = (listener: SyncQueueEventListener): void => {
  listeners.delete(listener);
};

export const notifyServiceWorker = async (): Promise<void> => {
  const pending = await getPendingItems();
  if (pending.length > 0) {
    await triggerBackgroundSync("sync-queue");
  }
};

const createWorker = (): Worker => {
  return new Worker(new URL("../workers/sync-worker.ts", import.meta.url), {
    type: "module",
  });
};

const teardownWorker = () => {
  if (!workerController) {
    return;
  }

  workerController.worker.terminate();
  workerController.pending.forEach(({ reject }) => {
    reject(new Error("Worker terminated"));
  });
  workerController.pending.clear();
  workerController = null;
};

const processWithWorker = async (
  items: Array<SyncQueueItem>,
  authToken?: string
): Promise<Array<SyncWorkerResultMessage>> => {
  if (!workerController) {
    throw new Error("Worker not initialized");
  }

  const controller = workerController;

  return new Promise<Array<SyncWorkerResultMessage>>((resolve, reject) => {
    const batchId = createBatchId();

    const timeoutId = setTimeout(() => {
      controller.pending.delete(batchId);
      reject(new Error("Worker processing timeout"));
    }, WORKER_TIMEOUT);

    controller.pending.set(batchId, {
      resolve: (results) => {
        clearTimeout(timeoutId);
        resolve(results);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    const message: SyncWorkerProcessMessage = {
      type: "process",
      id: batchId,
      items,
      authToken,
    };

    try {
      controller.worker.postMessage(message);
    } catch (error) {
      clearTimeout(timeoutId);
      controller.pending.delete(batchId);
      reject(error);
    }
  });
};

export const registerWorker = (): boolean => {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return false;
  }

  if (workerController) {
    return true;
  }

  try {
    const worker = createWorker();
    const pending = new Map<string, { resolve: (results: Array<SyncWorkerResultMessage>) => void; reject: (error: unknown) => void }>();

    worker.addEventListener("message", (event: MessageEvent<SyncWorkerResultMessage>) => {
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "result") {
        return;
      }

      const batchId = data.id;
      const request = pending.get(batchId);
      if (!request) {
        return;
      }

      pending.delete(batchId);
      request.resolve([data]);
    });

    worker.addEventListener("error", (error) => {
      console.error("[SyncQueue] worker error", error);
      teardownWorker();
    });

    workerController = { worker, pending };
    return true;
  } catch (error) {
    console.error("[SyncQueue] failed to register worker", error);
    return false;
  }
};

export const deregisterWorker = (): void => {
  teardownWorker();
};

export const processBatch = async (authToken?: string): Promise<number> => {
  if (!isOnline()) {
    return 0;
  }

  if (!workerController) {
    registerWorker();
  }

  if (!workerController) {
    return 0;
  }

  const items = await batchPeek();
  if (items.length === 0) {
    return 0;
  }

  await Promise.all(items.map((item) => markInFlight(item.id)));

  try {
    const results = await processWithWorker(items, authToken);

    for (const result of results) {
      if (result.success) {
        await markSuccess(result.itemId);
      } else if (result.conflict) {
        await markConflict(
          result.itemId,
          result.conflict.local,
          result.conflict.remote,
          result.conflict.message
        );
      } else {
        await markFailure(result.itemId, result.error ?? "Unknown error");
      }
    }

    return results.filter((r) => r.success).length;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Processing failed";
    await Promise.all(items.map((item) => markFailure(item.id, errorMessage)));
    return 0;
  }
};
