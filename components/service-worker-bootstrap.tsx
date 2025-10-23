"use client";

import { useEffect } from "react";
import { registerServiceWorker, onServiceWorkerMessage } from "@/lib/serviceWorker";
import type { ServiceWorkerIncomingMessage } from "@/types/serviceWorker";

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    let mounted = true;

    registerServiceWorker()
      .then((registration) => {
        if (!mounted) {
          return;
        }

        if (registration) {
          console.log("[App] Service worker registered successfully");

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) {
              return;
            }

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[App] New service worker available");
              }
            });
          });
        } else {
          console.warn("[App] Service worker registration failed");
        }
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        console.error("[App] Service worker registration error:", error);
      });

    const unsubscribe = onServiceWorkerMessage((event) => {
      const message = event.data as ServiceWorkerIncomingMessage;

      switch (message.type) {
        case "SYNC_ENQUEUED":
          console.log("[App] Request queued for sync:", message.itemId);
          break;

        case "SYNC_SUCCESS":
          console.log("[App] Request synced successfully:", message.itemId);
          break;

        case "SYNC_FAILURE":
          console.warn("[App] Request sync failed:", message.itemId, message.error);
          break;

        case "SYNC_COMPLETED":
          console.log("[App] Background sync completed:", message.result);
          break;

        case "SYNC_ERROR":
          console.error("[App] Background sync error:", message.error);
          break;

        default:
          break;
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return null;
}
