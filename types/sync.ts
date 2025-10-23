export enum SyncOperation {
  Create = "create",
  Update = "update",
  Delete = "delete",
  Upsert = "upsert",
}

export enum SyncQueueItemStatus {
  Pending = "pending",
  InFlight = "in_flight",
  Synced = "synced",
  Failed = "failed",
  Conflict = "conflict",
}

export enum SyncConflictResolutionStatus {
  Unresolved = "unresolved",
  Resolved = "resolved",
  Dismissed = "dismissed",
}

export enum SyncConnectionStatus {
  Online = "online",
  Offline = "offline",
  Degraded = "degraded",
}

export type SyncQueueItem<TPayload = Record<string, unknown>> = {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: TPayload;
  status: SyncQueueItemStatus;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
};

export type SyncConnectionInfo = {
  status: SyncConnectionStatus;
  isSyncing: boolean;
  pendingItems: number;
  lastSuccessfulSyncAt?: string;
  lastHeartbeatAt?: string;
  lastErrorAt?: string;
  message?: string;
};

export type SyncConflictPayload<TPayload = Record<string, unknown>> = {
  queueItemId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  local: TPayload | null;
  remote: TPayload | null;
  resolution: SyncConflictResolutionStatus;
  resolvedWith?: TPayload | null;
  detectedAt: string;
  resolvedAt?: string;
  message?: string;
};

export type SyncQueueSnapshot<TPayload = Record<string, unknown>> = {
  items: Array<SyncQueueItem<TPayload>>;
  pending: number;
  failed: number;
  conflicts: number;
  lastUpdatedAt: string;
};

export type SyncOperationMetadata = {
  tempId?: string;
  timestamp: string;
  mutationType: SyncOperation;
  payloadDiff?: Record<string, unknown>;
  version?: number;
};

export type SyncQueueEventType = "enqueue" | "success" | "failure" | "conflict" | "cleared";

export type SyncQueueEvent = {
  type: SyncQueueEventType;
  itemId?: string;
  item?: SyncQueueItem;
  error?: string;
  conflict?: SyncConflictPayload;
};

export type SyncWorkerMessageType = "process" | "shutdown" | "result";

export type SyncWorkerProcessMessage = {
  type: "process";
  id: string;
  items: Array<SyncQueueItem>;
  authToken?: string;
};

export type SyncWorkerResultMessage = {
  type: "result";
  id: string;
  itemId: string;
  success: boolean;
  error?: string;
  conflict?: {
    local: Record<string, unknown> | null;
    remote: Record<string, unknown> | null;
    message?: string;
  };
};

export type SyncWorkerShutdownMessage = {
  type: "shutdown";
};

export type SyncWorkerMessage =
  | SyncWorkerProcessMessage
  | SyncWorkerResultMessage
  | SyncWorkerShutdownMessage;
