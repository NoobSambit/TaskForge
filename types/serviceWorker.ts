export type ServiceWorkerMessageType =
  | "SKIP_WAITING"
  | "CLEAR_CACHE"
  | "CLEAR_RUNTIME_CACHE"
  | "CLEANUP_CACHE"
  | "GET_QUEUE_STATUS"
  | "SYNC_NOW"
  | "LOG_ANALYTICS";

export type ServiceWorkerIncomingMessageType =
  | "SYNC_ENQUEUED"
  | "SYNC_SUCCESS"
  | "SYNC_FAILURE"
  | "SYNC_COMPLETED"
  | "SYNC_ERROR";

export type ServiceWorkerMessage = {
  type: ServiceWorkerMessageType;
  payload?: unknown;
};

export type ServiceWorkerSyncEnqueuedMessage = {
  type: "SYNC_ENQUEUED";
  itemId: string;
  item: {
    id: string;
    entityType: string;
    entityId: string;
    operation: string;
    payload: Record<string, unknown>;
    status: string;
    attempts: number;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
  };
};

export type ServiceWorkerSyncSuccessMessage = {
  type: "SYNC_SUCCESS";
  itemId: string;
  item: {
    id: string;
    status: string;
    updatedAt: string;
  };
};

export type ServiceWorkerSyncFailureMessage = {
  type: "SYNC_FAILURE";
  itemId: string;
  item: {
    id: string;
    status: string;
    attempts: number;
    lastError: string;
    updatedAt: string;
  };
  error: string;
};

export type ServiceWorkerSyncCompletedMessage = {
  type: "SYNC_COMPLETED";
  tag: string;
  result: {
    processed: number;
    failed: number;
  };
  timestamp: number;
};

export type ServiceWorkerSyncErrorMessage = {
  type: "SYNC_ERROR";
  tag: string;
  error: string;
  timestamp: number;
};

export type ServiceWorkerIncomingMessage =
  | ServiceWorkerSyncEnqueuedMessage
  | ServiceWorkerSyncSuccessMessage
  | ServiceWorkerSyncFailureMessage
  | ServiceWorkerSyncCompletedMessage
  | ServiceWorkerSyncErrorMessage;

export type ServiceWorkerResponse = {
  success: boolean;
  status?: {
    total: number;
    pending: number;
    failed: number;
    synced: number;
  };
  result?: {
    processed: number;
    failed: number;
  };
  error?: string;
};

export type CacheStrategy =
  | "cache-first"
  | "network-first"
  | "stale-while-revalidate"
  | "network-only";

export type ServiceWorkerConfig = {
  cacheVersion: string;
  maxCacheSize: number;
  maxCacheAge: number;
  networkTimeout: number;
  syncTag: string;
  maxSyncAttempts: number;
  baseBackoffMs: number;
};
