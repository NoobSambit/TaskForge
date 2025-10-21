"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "@/lib/serviceWorker";

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    registerServiceWorker()
      .then((registration) => {
        if (!registration && process.env.NODE_ENV !== "production") {
          console.warn("[ServiceWorker] registration returned null");
        }
        return registration;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[ServiceWorker] registration rejected", error);
        }
      });
  }, []);

  return null;
}
