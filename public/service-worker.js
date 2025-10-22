"use strict";

const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `app-runtime-${CACHE_VERSION}`;
const STATIC_CACHE = `app-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
              return caches.delete(key);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          const isValid = copy.status >= 200 && copy.status < 400;

          if (isValid) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }

          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (PRECACHE_URLS.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (copy.status >= 200 && copy.status < 400) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? networkFetch;
    })
  );
});

self.addEventListener("message", (event) => {
  const { data } = event;
  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (data.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

self.addEventListener("sync", (event) => {
  if (!event.tag) {
    return;
  }

  if (event.tag.startsWith("manual-sync:")) {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "SYNC_COMPLETED",
            tag: event.tag,
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});
