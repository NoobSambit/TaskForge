/// <reference lib="webworker" />

import localforage from "localforage";
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
  WorkerCleanupSummary,
  isExpired,
} from "../lib/indexedDB.shared";

type LocalForageInstance = typeof localforage;

const instances = new Map<StoreName, LocalForageInstance>();

const getInstance = async (store: StoreName): Promise<LocalForageInstance> => {
  const existing = instances.get(store);
  if (existing) {
    return existing;
  }

  const config = STORE_CONFIG[store];
  const instance = localforage.createInstance({
    name: DB_NAME,
    storeName: config.storeName,
    description: config.description,
    version: DB_VERSION,
  });

  try {
    await instance.setDriver([localforage.INDEXEDDB, localforage.LOCALSTORAGE]);
  } catch (error) {
    console.warn(`[DBWorker] Driver selection failed for store ${store}`, error);
  }

  await instance.ready();
  instances.set(store, instance);
  return instance;
};

const respond = (response: DBWorkerResponse) => {
  self.postMessage(response);
};

const handleBulkGet = async (request: DBWorkerRequest & { method: "bulkGet" }): Promise<void> => {
  const instance = await getInstance(request.store);
  const results: Array<BulkGetResult> = [];

  for (const key of request.keys) {
    try {
      const record = await instance.getItem<PersistedRecord | null>(key);
      results.push({ key, record: record ?? null });
    } catch (error) {
      console.warn(`[DBWorker] Failed reading key ${key} from store ${request.store}`, error);
      results.push({ key, record: null });
    }
  }

  respond({ id: request.id, success: true, result: results });
};

const handleBulkSet = async (request: DBWorkerRequest & { method: "bulkSet" }): Promise<void> => {
  const instance = await getInstance(request.store);

  await Promise.all(
    request.entries.map(async (entry) => {
      try {
        await instance.setItem(entry.key, entry.record);
      } catch (error) {
        console.warn(`[DBWorker] Failed writing key ${entry.key} to store ${request.store}`, error);
        throw error;
      }
    })
  );

  respond({
    id: request.id,
    success: true,
    result: { count: request.entries.length },
  });
};

const handleCleanup = async (request: DBWorkerRequest & { method: "cleanupExpired" }): Promise<void> => {
  const stores = request.store ? [request.store] : STORE_NAMES;
  const totals: Record<StoreName, number> = Object.fromEntries(
    STORE_NAMES.map((name) => [name, 0])
  ) as Record<StoreName, number>;

  const now = Date.now();

  await Promise.all(
    stores.map(async (storeName) => {
      const instance = await getInstance(storeName);
      let removed = 0;
      const keys = await instance.keys();

      for (const key of keys) {
        const record = await instance.getItem<PersistedRecord | null>(key);
        if (isExpired(record, now)) {
          await instance.removeItem(key);
          removed += 1;
        }
      }

      totals[storeName] = removed;
    })
  );

  const summary: WorkerCleanupSummary = { totals };

  respond({
    id: request.id,
    success: true,
    result: summary,
  });
};

const handleRequest = async (request: DBWorkerRequest): Promise<void> => {
  switch (request.method) {
    case "bulkGet":
      await handleBulkGet(request);
      return;
    case "bulkSet":
      await handleBulkSet(request);
      return;
    case "cleanupExpired":
      await handleCleanup(request);
      return;
    default: {
      const exhaustiveCheck: never = request;
      respond({ 
        id: (exhaustiveCheck as DBWorkerRequest).id, 
        success: false, 
        error: `Unknown method: ${(exhaustiveCheck as DBWorkerRequest).method}` 
      });
    }
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  const request = data as DBWorkerRequest;
  if (!request || typeof request.id !== "string") {
    return;
  }

  handleRequest(request).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Worker request failed";
    respond({ id: request.id, success: false, error: message });
  });
});

export {};
