export const DB_NAME = "app-client-storage";
export const DB_VERSION = 1;

export const STORE_CONFIG = {
  tasks: {
    storeName: "tasks",
    description: "Task records",
  },
  syncQueue: {
    storeName: "sync_queue",
    description: "Synchronization queue records",
  },
  metadata: {
    storeName: "metadata",
    description: "Database metadata",
  },
  cache: {
    storeName: "cache",
    description: "General purpose cache entries",
  },
} as const;

export type StoreName = keyof typeof STORE_CONFIG;

export const STORE_NAMES = Object.keys(STORE_CONFIG) as Array<StoreName>;

export type PersistedRecord = {
  value: unknown;
  expiresAt: number | null;
};

export type BulkSetEntry = {
  key: string;
  value: unknown;
  ttl?: number | null;
};

export type WorkerBulkSetEntry = {
  key: string;
  record: PersistedRecord;
};

export type BulkGetResult = {
  key: string;
  record: PersistedRecord | null;
};

export type WorkerBulkSetSummary = {
  count: number;
};

export type WorkerCleanupSummary = {
  totals: Record<StoreName, number>;
};

const DATE_FLAG = "__idxdb_date";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const serializeValue = (input: unknown): unknown => {
  if (input === undefined) {
    return null;
  }

  if (input instanceof Date) {
    return { [DATE_FLAG]: input.toISOString() };
  }

  if (Array.isArray(input)) {
    return input.map((item) => serializeValue(item));
  }

  if (isPlainObject(input)) {
    const entries = Object.entries(input).map(([key, value]) => [key, serializeValue(value)]);
    return Object.fromEntries(entries);
  }

  return input;
};

export const deserializeValue = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map((item) => deserializeValue(item));
  }

  if (isPlainObject(input)) {
    if (Object.keys(input).length === 1 && DATE_FLAG in input) {
      const iso = input[DATE_FLAG];
      if (typeof iso === "string") {
        const parsed = new Date(iso);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return iso;
    }

    const entries = Object.entries(input).map(([key, value]) => [key, deserializeValue(value)]);
    return Object.fromEntries(entries);
  }

  return input;
};

export const computeExpiry = (ttl?: number | null, referenceTime = Date.now()): number | null => {
  if (typeof ttl !== "number") {
    return null;
  }

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return null;
  }

  return referenceTime + ttl;
};

export const isExpired = (record: PersistedRecord | null, referenceTime = Date.now()): boolean => {
  if (!record) {
    return false;
  }
  if (record.expiresAt === null) {
    return false;
  }

  return record.expiresAt <= referenceTime;
};

export type WorkerMethod = "bulkGet" | "bulkSet" | "cleanupExpired";

export type WorkerBulkGetRequest = {
  id: string;
  method: "bulkGet";
  store: StoreName;
  keys: Array<string>;
};

export type WorkerBulkSetRequest = {
  id: string;
  method: "bulkSet";
  store: StoreName;
  entries: Array<WorkerBulkSetEntry>;
};

export type WorkerCleanupRequest = {
  id: string;
  method: "cleanupExpired";
  store?: StoreName;
};

export type DBWorkerRequest =
  | WorkerBulkGetRequest
  | WorkerBulkSetRequest
  | WorkerCleanupRequest;

export type DBWorkerResponse<TResult = unknown> = {
  id: string;
  success: boolean;
  result?: TResult;
  error?: string;
};
