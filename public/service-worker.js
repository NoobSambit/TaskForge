"use strict";

// ============================================================================
// SERVICE WORKER CONFIGURATION
// ============================================================================

const CACHE_VERSION = "v2";
const STATIC_CACHE = `app-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `app-runtime-${CACHE_VERSION}`;
const API_CACHE = `app-api-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const DB_NAME = "app-client-storage";
const DB_VERSION = 1;
const SYNC_QUEUE_STORE = "sync_queue";

// Cache configuration
const MAX_CACHE_SIZE = 100;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NETWORK_TIMEOUT_MS = 5000;

// Precache URLs
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

// Background sync configuration
const SYNC_TAG = "sync-queue";
const MAX_SYNC_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;

// ============================================================================
// INDEXEDDB UTILITIES
// ============================================================================

let dbInstance = null;

const openDB = () => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("sync_queue")) {
        db.createObjectStore("sync_queue", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }

      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
    };
  });
};

const getFromIndexedDB = async (storeName, key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[SW] IndexedDB get failed", error);
    return null;
  }
};

const saveToIndexedDB = async (storeName, data) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[SW] IndexedDB save failed", error);
    return false;
  }
};

const getAllFromIndexedDB = async (storeName) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("[SW] IndexedDB getAll failed", error);
    return [];
  }
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const getCacheMetadata = async (cacheName) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const metadata = await Promise.all(
    keys.map(async (request) => {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get("date");
      const timestamp = dateHeader ? new Date(dateHeader).getTime() : Date.now();
      return { request, timestamp };
    })
  );
  return metadata;
};

const enforceCacheSizeLimit = async (cacheName, maxSize) => {
  const metadata = await getCacheMetadata(cacheName);
  
  if (metadata.length <= maxSize) {
    return;
  }

  const cache = await caches.open(cacheName);
  metadata.sort((a, b) => a.timestamp - b.timestamp);
  
  const toDelete = metadata.slice(0, metadata.length - maxSize);
  await Promise.all(toDelete.map((item) => cache.delete(item.request)));
};

const cleanupStaleCache = async (cacheName, maxAge) => {
  const metadata = await getCacheMetadata(cacheName);
  const now = Date.now();
  const cache = await caches.open(cacheName);

  const toDelete = metadata.filter((item) => now - item.timestamp > maxAge);
  await Promise.all(toDelete.map((item) => cache.delete(item.request)));
};

const cleanupAllCaches = async () => {
  await Promise.all([
    enforceCacheSizeLimit(RUNTIME_CACHE, MAX_CACHE_SIZE),
    enforceCacheSizeLimit(API_CACHE, MAX_CACHE_SIZE),
    cleanupStaleCache(RUNTIME_CACHE, MAX_CACHE_AGE_MS),
    cleanupStaleCache(API_CACHE, MAX_CACHE_AGE_MS),
  ]);
};

// ============================================================================
// BACKGROUND SYNC QUEUE
// ============================================================================

const createQueueItem = (request, payload) => {
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  
  return {
    id,
    entityType: "tasks",
    entityId: payload.id || id,
    operation: request.method === "POST" ? "create" : request.method === "PUT" ? "update" : "delete",
    payload,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    metadata: {
      url: request.url,
      method: request.method,
      timestamp: now,
    },
  };
};

const enqueueFailedRequest = async (request, payload) => {
  try {
    const queueItem = createQueueItem(request, payload);
    await saveToIndexedDB(SYNC_QUEUE_STORE, queueItem);
    
    // Notify clients about the enqueued item
    await notifyClients({
      type: "SYNC_ENQUEUED",
      itemId: queueItem.id,
      item: queueItem,
    });

    // Try to register background sync
    if (self.registration && self.registration.sync) {
      try {
        await self.registration.sync.register(SYNC_TAG);
      } catch (error) {
        console.warn("[SW] Background sync registration failed", error);
      }
    }

    return true;
  } catch (error) {
    console.error("[SW] Failed to enqueue request", error);
    return false;
  }
};

const computeBackoff = (attempts) => {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attempts);
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return Math.min(exponential + jitter, 300000); // Max 5 minutes
};

const processSyncQueue = async () => {
  try {
    const queueItems = await getAllFromIndexedDB(SYNC_QUEUE_STORE);
    const pendingItems = queueItems.filter(
      (item) => item.status === "pending" && item.attempts < MAX_SYNC_ATTEMPTS
    );

    if (pendingItems.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const result = await replayRequest(item);
      
      if (result.success) {
        item.status = "synced";
        item.updatedAt = new Date().toISOString();
        await saveToIndexedDB(SYNC_QUEUE_STORE, item);
        processed++;

        await notifyClients({
          type: "SYNC_SUCCESS",
          itemId: item.id,
          item,
        });
      } else {
        item.attempts += 1;
        item.lastError = result.error;
        item.lastAttemptAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();

        if (item.attempts >= MAX_SYNC_ATTEMPTS) {
          item.status = "failed";
        } else {
          const backoffMs = computeBackoff(item.attempts);
          item.scheduledAt = new Date(Date.now() + backoffMs).toISOString();
        }

        await saveToIndexedDB(SYNC_QUEUE_STORE, item);
        failed++;

        await notifyClients({
          type: "SYNC_FAILURE",
          itemId: item.id,
          item,
          error: result.error,
        });
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error("[SW] Sync queue processing failed", error);
    return { processed: 0, failed: 0 };
  }
};

const replayRequest = async (item) => {
  try {
    const url = item.metadata?.url || `/api/${item.entityType}/${item.entityId}`;
    const method = item.metadata?.method || "POST";

    const headers = {
      "Content-Type": "application/json",
    };

    const requestInit = {
      method,
      headers,
      credentials: "include",
    };

    if (method !== "DELETE" && item.payload) {
      requestInit.body = JSON.stringify(item.payload);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network request failed",
    };
  }
};

// ============================================================================
// CLIENT MESSAGING
// ============================================================================

const notifyClients = async (message) => {
  try {
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: "window",
    });

    if (clients.length === 0) {
      return;
    }

    clients.forEach((client) => {
      try {
        client.postMessage(message);
      } catch (error) {
        console.error("[SW] Failed to post message to client", error);
      }
    });
  } catch (error) {
    console.error("[SW] Failed to notify clients", error);
  }
};

const getQueueStatus = async () => {
  try {
    const queueItems = await getAllFromIndexedDB(SYNC_QUEUE_STORE);
    return {
      total: queueItems.length,
      pending: queueItems.filter((item) => item.status === "pending").length,
      failed: queueItems.filter((item) => item.status === "failed").length,
      synced: queueItems.filter((item) => item.status === "synced").length,
    };
  } catch (error) {
    console.error("[SW] Failed to get queue status", error);
    return { total: 0, pending: 0, failed: 0, synced: 0 };
  }
};

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

const shouldNotCache = (request) => {
  const url = new URL(request.url);
  
  // Don't cache auth endpoints
  if (url.pathname.startsWith("/api/auth")) {
    return true;
  }

  // Don't cache session endpoints
  if (url.pathname.includes("/session")) {
    return true;
  }

  // Don't cache requests with CSRF tokens
  if (request.headers.has("x-csrf-token")) {
    return true;
  }

  if (request.headers.has("authorization")) {
    return true;
  }

  // Don't cache authenticated mutations
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    return true;
  }

  return false;
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const fallback = await caches.match(OFFLINE_URL);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
};

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then((c) => c.put(request, response.clone())).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
};

const networkFirstWithTimeout = async (request, timeout = NETWORK_TIMEOUT_MS) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }

    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Try IndexedDB for tasks
    const url = new URL(request.url);
    if (url.pathname.includes("/api/tasks")) {
      const pathParts = url.pathname.split("/");
      const taskId = pathParts[pathParts.length - 1];
      
      if (taskId && taskId !== "tasks") {
        const task = await getFromIndexedDB("tasks", taskId);
        if (task) {
          return new Response(JSON.stringify(task), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-From-Cache": "indexeddb",
            },
          });
        }
      }
    }

    throw error;
  }
};

const networkOnly = async (request) => {
  return fetch(request);
};

// ============================================================================
// FETCH EVENT HANDLER
// ============================================================================

const handleFetch = async (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests except for task mutations (handle those separately)
  if (request.method !== "GET") {
    // Intercept failed POST/PUT/DELETE to /api/tasks
    if (url.pathname.startsWith("/api/tasks")) {
      try {
        const response = await fetch(request.clone());
        return response;
      } catch (error) {
        // Network failed, enqueue for background sync
        try {
          const clonedRequest = request.clone();
          let payload = {};
          
          if (request.method !== "DELETE") {
            const text = await clonedRequest.text();
            if (text) {
              payload = JSON.parse(text);
            }
          }

          await enqueueFailedRequest(request, payload);

          return new Response(
            JSON.stringify({
              queued: true,
              message: "Request queued for background sync",
            }),
            {
              status: 202,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (queueError) {
          console.error("[SW] Failed to enqueue request", queueError);
          throw error;
        }
      }
    }

    // For other non-GET requests, just pass through
    return fetch(request);
  }

  // Skip caching for sensitive endpoints
  if (shouldNotCache(request)) {
    return networkOnly(request);
  }

  // Navigation requests
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }

      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      
      const offline = await caches.match(OFFLINE_URL);
      if (offline) {
        return offline;
      }

      throw error;
    }
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.includes("/fonts/") ||
    url.pathname.match(/\.(woff2|woff|ttf|eot|ico|png|jpg|jpeg|svg|webp|gif)$/)
  ) {
    return cacheFirst(request);
  }

  // Network-first with timeout for API tasks reads
  if (url.pathname.startsWith("/api/tasks") && request.method === "GET") {
    return networkFirstWithTimeout(request);
  }

  // Stale-while-revalidate for dashboard and task pages
  if (
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/tasks") ||
    url.pathname === "/"
  ) {
    return staleWhileRevalidate(request);
  }

  // Default: network-first with cache fallback
  return networkFirstWithTimeout(request);
};

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker version", CACHE_VERSION);

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
      openDB(),
    ])
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("[SW] Install failed", error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker version", CACHE_VERSION);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((keys) => {
        const validCaches = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];
        return Promise.all(
          keys.map((key) => {
            if (!validCaches.includes(key)) {
              console.log("[SW] Deleting old cache", key);
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );
      }),
      // Clean up old cache entries
      cleanupAllCaches(),
      // Claim clients
      self.clients.claim(),
    ]).catch((error) => {
      console.error("[SW] Activate failed", error);
    })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

self.addEventListener("fetch", (event) => {
  event.respondWith(handleFetch(event));
});

// ============================================================================
// SYNC EVENT (Background Sync)
// ============================================================================

self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event", event.tag);

  if (event.tag === SYNC_TAG || event.tag.startsWith("manual-sync:")) {
    event.waitUntil(
      processSyncQueue()
        .then(async (result) => {
          console.log("[SW] Sync completed", result);

          await notifyClients({
            type: "SYNC_COMPLETED",
            tag: event.tag,
            result,
            timestamp: Date.now(),
          });

          return result;
        })
        .catch((error) => {
          console.error("[SW] Sync failed", error);

          notifyClients({
            type: "SYNC_ERROR",
            tag: event.tag,
            error: error.message,
            timestamp: Date.now(),
          });

          throw error;
        })
    );
  }
});

// ============================================================================
// MESSAGE EVENT (Client Communication)
// ============================================================================

self.addEventListener("message", (event) => {
  const { data } = event;
  
  if (!data || typeof data !== "object") {
    return;
  }

  console.log("[SW] Received message", data.type);

  if (data.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }

  if (data.type === "CLEAR_CACHE") {
    event.waitUntil(
      Promise.all([
        caches.delete(RUNTIME_CACHE),
        caches.delete(API_CACHE),
      ]).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (data.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }

  if (data.type === "CLEANUP_CACHE") {
    event.waitUntil(
      cleanupAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (data.type === "GET_QUEUE_STATUS") {
    event.waitUntil(
      getQueueStatus().then((status) => {
        event.ports[0]?.postMessage({ success: true, status });
      })
    );
  }

  if (data.type === "SYNC_NOW") {
    event.waitUntil(
      processSyncQueue()
        .then((result) => {
          event.ports[0]?.postMessage({ success: true, result });
        })
        .catch((error) => {
          event.ports[0]?.postMessage({
            success: false,
            error: error.message,
          });
        })
    );
  }

  if (data.type === "LOG_ANALYTICS") {
    // Store analytics data in IndexedDB for later sync
    if (data.payload) {
      event.waitUntil(
        saveToIndexedDB("metadata", {
          id: `analytics-${Date.now()}`,
          type: "analytics",
          data: data.payload,
          timestamp: Date.now(),
        }).catch(() => {})
      );
    }
  }
});

// ============================================================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================================================

self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync event", event.tag);

  if (event.tag === "cleanup-caches") {
    event.waitUntil(cleanupAllCaches());
  }

  if (event.tag === "sync-queue") {
    event.waitUntil(processSyncQueue());
  }
});

// ============================================================================
// PUSH NOTIFICATION (placeholder for future implementation)
// ============================================================================

self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || "Notification", {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        data: data.data || {},
      })
    );
  } catch (error) {
    console.error("[SW] Push notification failed", error);
  }
});

// ============================================================================
// NOTIFICATION CLICK
// ============================================================================

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Check if there's already a window open
        for (const client of clients) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        // Open a new window if no window is open
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});

console.log("[SW] Service worker loaded successfully");
