import type LocalForage from "localforage";
import {
  BulkGetResult,
  DBWorkerRequest,
  DBWorkerResponse,
  DB_NAME,
  DB_VERSION,
  PersistedRecord,
  STORE_CONFIG,
  STORE_NAMES,
  StoreName,
  WorkerBulkSetEntry,
  WorkerBulkSetSummary,
  WorkerCleanupSummary,
  computeExpiry,
  deserializeValue,
  isExpired,
  serializeValue,
} from "./indexedDB.shared";

type StorageBackend = {
  getRaw(key: string): Promise<PersistedRecord | null>;
  setRaw(key: string, record: PersistedRecord): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<Array<string>>;
  clear(): Promise<void>;
};

export type SetItemOptions = {
  ttl?: number | null;
};

export type BulkSetDescriptor<TValue> = {
  key: string;
  value: TValue;
  ttl?: number | null;
};

type MigrationContext = {
  getBackend: (store: StoreName) => Promise<StorageBackend>;
};

type WorkerPendingRequest = {
  timer: ReturnType<typeof setTimeout>;
  resolve: (response: DBWorkerResponse) => void;
  reject: (error: unknown) => void;
};

type WorkerController = {
  worker: Worker;
  pending: Map<string, WorkerPendingRequest>;
};

const WORKER_TIMEOUT = 5000;
const SCHEMA_VERSION_KEY = "__dbSchemaVersion";
const TARGET_SCHEMA_VERSION = 1;

const backendPromises = new Map<StoreName, Promise<StorageBackend>>();
const memoryStores = new Map<StoreName, Map<string, PersistedRecord>>();

let localforageModulePromise: Promise<LocalForage | null> | null = null;
let workerControllerPromise: Promise<WorkerController | null> | null = null;
let migrationsPromise: Promise<void> | null = null;
let migrationsCompleted = false;

const loadLocalforage = async (): Promise<LocalForage | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!localforageModulePromise) {
    localforageModulePromise = import("localforage")
      .then((mod) => (mod.default ?? mod) as LocalForage)
      .catch((error) => {
        console.warn("[IndexedDB] Unable to load localforage module", error);
        return null;
      });
  }

  return localforageModulePromise;
};

const cloneRecord = (record: PersistedRecord): PersistedRecord => ({
  value: record.value,
  expiresAt: record.expiresAt,
});

const createLocalForageBackend = async (
  store: StoreName,
  module: LocalForage
): Promise<StorageBackend> => {
  const config = STORE_CONFIG[store];
  const instance = module.createInstance({
    name: DB_NAME,
    storeName: config.storeName,
    description: config.description,
    version: DB_VERSION,
  });

  try {
    await instance.setDriver([module.INDEXEDDB, module.LOCALSTORAGE]);
  } catch (error) {
    console.warn(`[IndexedDB] Driver selection failed for store ${store}`, error);
  }

  await instance.ready();

  const getRaw = async (key: string): Promise<PersistedRecord | null> => {
    try {
      const value = await instance.getItem<PersistedRecord | null>(key);
      if (!value || typeof value !== "object") {
        return null;
      }
      return value;
    } catch (error) {
      console.warn(`[IndexedDB] Failed to read key ${key} from store ${store}`, error);
      return null;
    }
  };

  const setRaw = async (key: string, record: PersistedRecord): Promise<void> => {
    try {
      await instance.setItem(key, record);
    } catch (error) {
      console.warn(`[IndexedDB] Failed to write key ${key} to store ${store}`, error);
    }
  };

  const remove = async (key: string): Promise<void> => {
    try {
      await instance.removeItem(key);
    } catch (error) {
      console.warn(`[IndexedDB] Failed to remove key ${key} from store ${store}`, error);
    }
  };

  const keys = async (): Promise<Array<string>> => {
    try {
      return instance.keys();
    } catch (error) {
      console.warn(`[IndexedDB] Failed to list keys for store ${store}`, error);
      return [];
    }
  };

  const clear = async (): Promise<void> => {
    try {
      await instance.clear();
    } catch (error) {
      console.warn(`[IndexedDB] Failed to clear store ${store}`, error);
    }
  };

  return { getRaw, setRaw, remove, keys, clear };
};

const hasLocalStorage = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const testKey = "__idxdb_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn("[IndexedDB] localStorage unavailable", error);
    return false;
  }
};

const createLocalStorageBackend = (store: StoreName): StorageBackend => {
  const config = STORE_CONFIG[store];
  const prefix = `${DB_NAME}:${config.storeName}:`;

  const getRaw = async (key: string): Promise<PersistedRecord | null> => {
    try {
      const raw = window.localStorage.getItem(`${prefix}${key}`);
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw) as PersistedRecord;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn(`[IndexedDB] Failed to read localStorage key ${key} in store ${store}`, error);
      return null;
    }
  };

  const setRaw = async (key: string, record: PersistedRecord): Promise<void> => {
    try {
      window.localStorage.setItem(`${prefix}${key}`, JSON.stringify(record));
    } catch (error) {
      console.warn(`[IndexedDB] Failed to write localStorage key ${key} in store ${store}`, error);
    }
  };

  const remove = async (key: string): Promise<void> => {
    try {
      window.localStorage.removeItem(`${prefix}${key}`);
    } catch (error) {
      console.warn(`[IndexedDB] Failed to remove localStorage key ${key} in store ${store}`, error);
    }
  };

  const keys = async (): Promise<Array<string>> => {
    const results: Array<string> = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const fullKey = window.localStorage.key(index);
        if (fullKey && fullKey.startsWith(prefix)) {
          results.push(fullKey.slice(prefix.length));
        }
      }
    } catch (error) {
      console.warn(`[IndexedDB] Failed to enumerate localStorage keys for store ${store}`, error);
      return [];
    }
    return results;
  };

  const clear = async (): Promise<void> => {
    const keysToRemove = await keys();
    await Promise.all(keysToRemove.map((key) => remove(key)));
  };

  return { getRaw, setRaw, remove, keys, clear };
};

const createMemoryBackend = (store: StoreName): StorageBackend => {
  if (!memoryStores.has(store)) {
    memoryStores.set(store, new Map());
  }

  const memory = memoryStores.get(store)!;

  const getRaw = async (key: string): Promise<PersistedRecord | null> => {
    const record = memory.get(key) ?? null;
    return record ? cloneRecord(record) : null;
  };

  const setRaw = async (key: string, record: PersistedRecord): Promise<void> => {
    memory.set(key, cloneRecord(record));
  };

  const remove = async (key: string): Promise<void> => {
    memory.delete(key);
  };

  const keys = async (): Promise<Array<string>> => Array.from(memory.keys());

  const clear = async (): Promise<void> => {
    memory.clear();
  };

  return { getRaw, setRaw, remove, keys, clear };
};

const createBackend = async (store: StoreName): Promise<StorageBackend> => {
  if (typeof window === "undefined") {
    return createMemoryBackend(store);
  }

  const localforageModule = await loadLocalforage();
  if (localforageModule) {
    try {
      return await createLocalForageBackend(store, localforageModule);
    } catch (error) {
      console.warn(`[IndexedDB] Falling back from localforage for store ${store}`, error);
    }
  }

  if (hasLocalStorage()) {
    return createLocalStorageBackend(store);
  }

  return createMemoryBackend(store);
};

const getBackend = (store: StoreName): Promise<StorageBackend> => {
  const existing = backendPromises.get(store);
  if (existing) {
    return existing;
  }

  const created = createBackend(store);
  backendPromises.set(store, created);
  return created;
};

const createMessageId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `db-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const teardownWorker = (controller: WorkerController | null, reason?: unknown) => {
  if (!controller) {
    return;
  }

  controller.worker.terminate();
  controller.pending.forEach((pending) => {
    clearTimeout(pending.timer);
    pending.reject(reason ?? new Error("Worker terminated"));
  });
  controller.pending.clear();
};

const createWorkerController = async (): Promise<WorkerController | null> => {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }

  try {
    const worker = new Worker(new URL("../workers/db-worker.ts", import.meta.url), {
      type: "module",
    });

    const pending = new Map<string, WorkerPendingRequest>();

    worker.addEventListener("message", (event: MessageEvent<DBWorkerResponse>) => {
      const data = event.data;
      if (!data || typeof data !== "object" || typeof data.id !== "string") {
        return;
      }

      const request = pending.get(data.id);
      if (!request) {
        return;
      }

      pending.delete(data.id);
      clearTimeout(request.timer);
      request.resolve(data);
    });

    const handleWorkerFailure = (error: unknown) => {
      teardownWorker({ worker, pending }, error);
      if (workerControllerPromise) {
        workerControllerPromise = null;
      }
    };

    worker.addEventListener("error", (event) => {
      console.warn("[IndexedDB] Worker error", event.message);
      handleWorkerFailure(event);
    });

    worker.addEventListener("messageerror", (event) => {
      console.warn("[IndexedDB] Worker message error", event);
      handleWorkerFailure(event);
    });

    return { worker, pending };
  } catch (error) {
    console.warn("[IndexedDB] Unable to start worker", error);
    return null;
  }
};

const getWorkerController = async (): Promise<WorkerController | null> => {
  if (workerControllerPromise) {
    return workerControllerPromise;
  }

  workerControllerPromise = createWorkerController();
  return workerControllerPromise;
};

const sendWorkerRequest = async <TResult>(
  request: Omit<DBWorkerRequest, "id">
): Promise<TResult | null> => {
  const controller = await getWorkerController();
  if (!controller) {
    return null;
  }

  return new Promise<TResult | null>((resolve) => {
    const id = createMessageId();
    const payload = { ...request, id } as DBWorkerRequest;

    const timer = setTimeout(() => {
      controller.pending.delete(id);
      resolve(null);
    }, WORKER_TIMEOUT);

    controller.pending.set(id, {
      timer,
      resolve: (response: DBWorkerResponse) => {
        resolve(response.success ? ((response.result as TResult | undefined) ?? null) : null);
      },
      reject: () => {
        resolve(null);
      },
    });

    try {
      controller.worker.postMessage(payload);
    } catch (error) {
      clearTimeout(timer);
      controller.pending.delete(id);
      teardownWorker(controller, error);
      if (workerControllerPromise) {
        workerControllerPromise = null;
      }
      resolve(null);
    }
  });
};

const callWorkerBulkGet = async (
  store: StoreName,
  keys: Array<string>
): Promise<Array<BulkGetResult> | null> =>
  sendWorkerRequest<Array<BulkGetResult>>({ method: "bulkGet", store, keys } as Omit<DBWorkerRequest, "id">);

const callWorkerBulkSet = async (
  store: StoreName,
  entries: Array<WorkerBulkSetEntry>
): Promise<WorkerBulkSetSummary | null> =>
  sendWorkerRequest<WorkerBulkSetSummary>({ method: "bulkSet", store, entries } as Omit<DBWorkerRequest, "id">);

const callWorkerCleanup = async (store?: StoreName): Promise<WorkerCleanupSummary | null> =>
  sendWorkerRequest<WorkerCleanupSummary>({ method: "cleanupExpired", store } as Omit<DBWorkerRequest, "id">);

const MIGRATIONS: Record<number, (context: MigrationContext) => Promise<void>> = {
  1: async ({ getBackend }) => {
    const metadataBackend = await getBackend("metadata");
    const existing = await metadataBackend.getRaw("__dbInitializedAt");
    if (!existing) {
      await metadataBackend.setRaw("__dbInitializedAt", {
        value: serializeValue(new Date().toISOString()),
        expiresAt: null,
      });
    }
  },
};

const runMigrations = async (): Promise<void> => {
  const metadataBackend = await getBackend("metadata");
  const versionRecord = await metadataBackend.getRaw(SCHEMA_VERSION_KEY);

  let currentVersion = 0;
  if (versionRecord) {
    if (typeof versionRecord.value === "number") {
      currentVersion = versionRecord.value;
    } else if (typeof versionRecord.value === "string") {
      currentVersion = Number.parseInt(versionRecord.value, 10) || 0;
    }
  }

  if (currentVersion >= TARGET_SCHEMA_VERSION) {
    return;
  }

  for (let version = currentVersion + 1; version <= TARGET_SCHEMA_VERSION; version += 1) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      continue;
    }

    try {
      await migration({ getBackend });
    } catch (error) {
      console.warn(`[IndexedDB] Migration ${version} failed`, error);
    }
  }

  await metadataBackend.setRaw(SCHEMA_VERSION_KEY, {
    value: serializeValue(TARGET_SCHEMA_VERSION),
    expiresAt: null,
  });
};

const ensureMigrations = async (): Promise<void> => {
  if (migrationsCompleted) {
    return;
  }

  if (!migrationsPromise) {
    migrationsPromise = runMigrations()
      .catch((error) => {
        console.warn("[IndexedDB] Migrations failed", error);
      })
      .finally(() => {
        migrationsCompleted = true;
      });
  }

  await migrationsPromise;
};

const cleanupExpiredLocally = async (store?: StoreName): Promise<WorkerCleanupSummary> => {
  const now = Date.now();
  const stores = store ? [store] : STORE_NAMES;
  const totals: Record<StoreName, number> = Object.fromEntries(
    STORE_NAMES.map((storeName) => [storeName, 0])
  ) as Record<StoreName, number>;

  await Promise.all(
    stores.map(async (storeName) => {
      const backend = await getBackend(storeName);
      const keys = await backend.keys();
      let removed = 0;

      for (const key of keys) {
        const record = await backend.getRaw(key);
        if (isExpired(record, now)) {
          await backend.remove(key);
          removed += 1;
        }
      }

      totals[storeName] = removed;
    })
  );

  return { totals };
};

export const initializeIndexedDb = async (): Promise<void> => {
  await ensureMigrations();
};

export const getItem = async <TValue>(
  store: StoreName,
  key: string
): Promise<TValue | null> => {
  await ensureMigrations();
  const backend = await getBackend(store);
  const record = await backend.getRaw(key);

  if (!record) {
    return null;
  }

  if (isExpired(record)) {
    await backend.remove(key);
    return null;
  }

  return deserializeValue(record.value) as TValue;
};

export const setItem = async <TValue>(
  store: StoreName,
  key: string,
  value: TValue,
  options: SetItemOptions = {}
): Promise<void> => {
  await ensureMigrations();
  const backend = await getBackend(store);
  const expiresAt = computeExpiry(options.ttl);

  await backend.setRaw(key, {
    value: serializeValue(value),
    expiresAt,
  });
};

export const removeItem = async (store: StoreName, key: string): Promise<void> => {
  await ensureMigrations();
  const backend = await getBackend(store);
  await backend.remove(key);
};

export const clearStore = async (store: StoreName): Promise<void> => {
  await ensureMigrations();
  const backend = await getBackend(store);
  await backend.clear();
};

export const getAllKeys = async (store: StoreName): Promise<Array<string>> => {
  await ensureMigrations();
  const backend = await getBackend(store);
  return backend.keys();
};

export const bulkGet = async <TValue>(
  store: StoreName,
  keys: Array<string>
): Promise<Record<string, TValue | null>> => {
  await ensureMigrations();

  if (keys.length === 0) {
    return {};
  }

  const now = Date.now();
  const result: Record<string, TValue | null> = {};

  const workerResult = await callWorkerBulkGet(store, keys);
  const backend = await getBackend(store);
  const records =
    workerResult ??
    (await Promise.all(
      keys.map(async (key) => ({
        key,
        record: await backend.getRaw(key),
      }))
    ));

  await Promise.all(
    records.map(async ({ key, record }) => {
      if (!record) {
        result[key] = null;
        return;
      }

      if (isExpired(record, now)) {
        await backend.remove(key);
        result[key] = null;
        return;
      }

      result[key] = deserializeValue(record.value) as TValue;
    })
  );

  return result;
};

export const bulkSet = async <TValue>(
  store: StoreName,
  entries: Array<BulkSetDescriptor<TValue>>
): Promise<void> => {
  await ensureMigrations();

  if (entries.length === 0) {
    return;
  }

  const referenceTime = Date.now();
  const workerEntries: Array<WorkerBulkSetEntry> = entries.map((entry) => ({
    key: entry.key,
    record: {
      value: serializeValue(entry.value),
      expiresAt: computeExpiry(entry.ttl, referenceTime),
    },
  }));

  const workerResult = await callWorkerBulkSet(store, workerEntries);
  if (workerResult) {
    return;
  }

  const backend = await getBackend(store);

  await Promise.all(
    workerEntries.map((entry) => backend.setRaw(entry.key, entry.record))
  );
};

export const cleanupExpired = async (store?: StoreName): Promise<WorkerCleanupSummary> => {
  await ensureMigrations();

  const workerResult = await callWorkerCleanup(store);
  if (workerResult) {
    return workerResult;
  }

  return cleanupExpiredLocally(store);
};

export const getWorkerAvailability = async (): Promise<boolean> => {
  const controller = await getWorkerController();
  return Boolean(controller);
};

export type { StoreName } from "./indexedDB.shared";
export { STORE_NAMES } from "./indexedDB.shared";
