const SERVICE_WORKER_URL = "/service-worker.js";

const readyListeners = new Set<(registration: ServiceWorkerRegistration) => void>();
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let lastNotifiedRegistration: ServiceWorkerRegistration | null = null;

const scheduleCallback = (callback: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  setTimeout(callback, 0);
};

const notifyReady = (registration: ServiceWorkerRegistration) => {
  if (lastNotifiedRegistration === registration) {
    return;
  }

  lastNotifiedRegistration = registration;

  readyListeners.forEach((listener) => {
    try {
      listener(registration);
    } catch (error) {
      console.error("[ServiceWorker] ready listener failed", error);
    }
  });
};

export const isServiceWorkerSupported = (): boolean =>
  typeof window !== "undefined" && "serviceWorker" in navigator;

if (isServiceWorkerSupported()) {
  navigator.serviceWorker.ready
    .then((registration) => {
      notifyReady(registration);
      return registration;
    })
    .catch((error) => {
      console.warn("[ServiceWorker] ready check failed", error);
    });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    navigator.serviceWorker.ready
      .then((registration) => {
        notifyReady(registration);
        return registration;
      })
      .catch((error) => {
        console.warn("[ServiceWorker] controller change ready wait failed", error);
      });
  });
}

export const registerServiceWorker = async (
  options?: RegistrationOptions
): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = navigator.serviceWorker
    .register(SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none",
      ...options,
    })
    .then((registration) => {
      notifyReady(registration);
      return registration;
    })
    .catch((error) => {
      console.error("[ServiceWorker] registration failed", error);
      registrationPromise = null;
      return null;
    });

  return registrationPromise;
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.getRegistration());

    if (!registration) {
      return false;
    }

    const result = await registration.unregister();
    if (result) {
      lastNotifiedRegistration = null;
    }
    registrationPromise = null;
    return result;
  } catch (error) {
    console.error("[ServiceWorker] unregister failed", error);
    return false;
  }
};

export const postMessageToServiceWorker = async <TMessage>(message: TMessage): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
      return true;
    }

    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage(message);
    return true;
  } catch (error) {
    console.error("[ServiceWorker] postMessage failed", error);
    return false;
  }
};

export const triggerBackgroundSync = async (tag: string): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration && registration.sync) {
      await registration.sync.register(`manual-sync:${tag}`);
      return true;
    }

    console.warn("[ServiceWorker] Background sync is not supported in this browser.");
    return false;
  } catch (error) {
    console.error("[ServiceWorker] trigger background sync failed", error);
    return false;
  }
};

export const onServiceWorkerReady = (
  listener: (registration: ServiceWorkerRegistration) => void
): (() => void) => {
  if (!isServiceWorkerSupported()) {
    return () => undefined;
  }

  readyListeners.add(listener);

  if (lastNotifiedRegistration) {
    scheduleCallback(() => listener(lastNotifiedRegistration as ServiceWorkerRegistration));
  } else {
    navigator.serviceWorker.ready
      .then((registration) => {
        notifyReady(registration);
        return registration;
      })
      .catch((error) => {
        console.warn("[ServiceWorker] ready listener registration failed", error);
      });
  }

  return () => {
    readyListeners.delete(listener);
  };
};

export const waitForServiceWorkerReady = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("[ServiceWorker] waiting for ready failed", error);
    return null;
  }
};

export const postMessageWithResponse = async <TMessage, TResponse>(
  message: TMessage,
  timeout = 5000
): Promise<TResponse | null> => {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      return null;
    }

    return new Promise<TResponse | null>((resolve) => {
      const channel = new MessageChannel();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      channel.port1.onmessage = (event) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(event.data as TResponse);
      };

      timeoutId = setTimeout(() => {
        channel.port1.close();
        resolve(null);
      }, timeout);

      controller.postMessage(message, [channel.port2]);
    });
  } catch (error) {
    console.error("[ServiceWorker] postMessageWithResponse failed", error);
    return null;
  }
};

export const clearServiceWorkerCache = async (): Promise<boolean> => {
  const response = await postMessageWithResponse<{ type: string }, { success: boolean }>(
    { type: "CLEAR_CACHE" },
    5000
  );

  return response?.success ?? false;
};

export const cleanupServiceWorkerCache = async (): Promise<boolean> => {
  const response = await postMessageWithResponse<{ type: string }, { success: boolean }>(
    { type: "CLEANUP_CACHE" },
    5000
  );

  return response?.success ?? false;
};

export const getServiceWorkerQueueStatus = async (): Promise<{
  total: number;
  pending: number;
  failed: number;
  synced: number;
} | null> => {
  const response = await postMessageWithResponse<
    { type: string },
    {
      success: boolean;
      status?: { total: number; pending: number; failed: number; synced: number };
    }
  >({ type: "GET_QUEUE_STATUS" }, 5000);

  return response?.status ?? null;
};

export const triggerManualSync = async (): Promise<{
  processed: number;
  failed: number;
} | null> => {
  const response = await postMessageWithResponse<
    { type: string },
    {
      success: boolean;
      result?: { processed: number; failed: number };
      error?: string;
    }
  >({ type: "SYNC_NOW" }, 30000);

  return response?.result ?? null;
};

export const logAnalyticsToServiceWorker = async (payload: Record<string, unknown>): Promise<boolean> => {
  return postMessageToServiceWorker({
    type: "LOG_ANALYTICS",
    payload,
  });
};

export const onServiceWorkerMessage = (
  listener: (message: MessageEvent) => void
): (() => void) => {
  if (!isServiceWorkerSupported()) {
    return () => undefined;
  }

  navigator.serviceWorker.addEventListener("message", listener);

  return () => {
    navigator.serviceWorker.removeEventListener("message", listener);
  };
};
