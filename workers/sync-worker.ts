/// <reference lib="webworker" />

/**
 * Background Sync Worker
 * 
 * Processes sync queue items off the main thread via Web Worker.
 * 
 * Features:
 * - Network mutation execution (POST, PUT, DELETE)
 * - Automatic retry with exponential backoff (up to 3 attempts per item)
 * - Network status checking before processing
 * - Conflict detection (HTTP 409 responses)
 * - Auth token forwarding
 * - Graceful shutdown support
 * 
 * Message Protocol:
 * - Receives: SyncWorkerProcessMessage with queue items and auth token
 * - Sends: SyncWorkerResultMessage for each processed item
 */

import type {
  SyncQueueItem,
  SyncWorkerProcessMessage,
  SyncWorkerResultMessage,
  SyncWorkerShutdownMessage,
  SyncWorkerMessage,
  SyncOperation,
} from "@/types/sync";

type NetworkMutationResult = {
  success: boolean;
  error?: string;
  conflict?: {
    local: Record<string, unknown> | null;
    remote: Record<string, unknown> | null;
    message?: string;
  };
};

type AuthHeaders = {
  Authorization?: string;
  [key: string]: string | undefined;
};

let isShuttingDown = false;

const getApiEndpoint = (entityType: string, operation: SyncOperation, entityId?: string): string => {
  const base = "/api";
  
  switch (operation) {
    case "create":
      return `${base}/${entityType}`;
    case "update":
    case "upsert":
      return `${base}/${entityType}/${entityId}`;
    case "delete":
      return `${base}/${entityType}/${entityId}`;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

const getHttpMethod = (operation: SyncOperation): string => {
  switch (operation) {
    case "create":
      return "POST";
    case "update":
    case "upsert":
      return "PUT";
    case "delete":
      return "DELETE";
    default:
      return "POST";
  }
};

const performNetworkMutation = async (
  item: SyncQueueItem,
  authToken?: string
): Promise<NetworkMutationResult> => {
  try {
    const endpoint = getApiEndpoint(item.entityType, item.operation, item.entityId);
    const method = getHttpMethod(item.operation);

    const headers: AuthHeaders = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const requestInit: RequestInit = {
      method,
      headers: headers as Record<string, string>,
      credentials: "include",
    };

    if (method !== "DELETE" && item.payload) {
      requestInit.body = JSON.stringify(item.payload);
    }

    const response = await fetch(endpoint, requestInit);

    if (!response.ok) {
      if (response.status === 409) {
        let remote = null;
        try {
          const data = await response.json();
          remote = data.remote ?? data.data ?? null;
        } catch (error) {
          console.warn("[SyncWorker] failed to parse conflict response", error);
        }

        return {
          success: false,
          conflict: {
            local: item.payload,
            remote,
            message: "Conflict detected by server",
          },
        };
      }

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (error) {
        console.warn("[SyncWorker] failed to parse error response", error);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network request failed";
    return {
      success: false,
      error: errorMessage,
    };
  }
};

const checkNetworkStatus = async (): Promise<boolean> => {
  if (typeof navigator === "undefined") {
    return true;
  }

  if (!navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("/api/health", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn("[SyncWorker] network status check failed", error);
    return false;
  }
};

const shouldRetry = (result: NetworkMutationResult, attempt: number): boolean => {
  if (result.success) {
    return false;
  }

  if (result.conflict) {
    return false;
  }

  if (attempt >= 3) {
    return false;
  }

  return true;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const processItem = async (
  item: SyncQueueItem,
  authToken?: string
): Promise<SyncWorkerResultMessage> => {
  let lastResult: NetworkMutationResult | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (isShuttingDown) {
      return {
        type: "result",
        id: item.id,
        itemId: item.id,
        success: false,
        error: "Worker shutting down",
      };
    }

    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      return {
        type: "result",
        id: item.id,
        itemId: item.id,
        success: false,
        error: "Network unavailable",
      };
    }

    lastResult = await performNetworkMutation(item, authToken);

    if (!shouldRetry(lastResult, attempt)) {
      break;
    }

    if (attempt < 3) {
      await delay(1000 * attempt);
    }
  }

  if (!lastResult) {
    return {
      type: "result",
      id: item.id,
      itemId: item.id,
      success: false,
      error: "No result from mutation",
    };
  }

  if (lastResult.success) {
    return {
      type: "result",
      id: item.id,
      itemId: item.id,
      success: true,
    };
  }

  if (lastResult.conflict) {
    return {
      type: "result",
      id: item.id,
      itemId: item.id,
      success: false,
      conflict: lastResult.conflict,
    };
  }

  return {
    type: "result",
    id: item.id,
    itemId: item.id,
    success: false,
    error: lastResult.error ?? "Unknown error",
  };
};

const handleProcessMessage = async (message: SyncWorkerProcessMessage): Promise<void> => {
  const results: Array<SyncWorkerResultMessage> = [];

  for (const item of message.items) {
    if (isShuttingDown) {
      results.push({
        type: "result",
        id: message.id,
        itemId: item.id,
        success: false,
        error: "Worker shutting down",
      });
    } else {
      const result = await processItem(item, message.authToken);
      result.id = message.id;
      results.push(result);
    }
  }

  for (const result of results) {
    self.postMessage(result);
  }
};

const handleShutdownMessage = (message: SyncWorkerShutdownMessage): void => {
  isShuttingDown = true;
  self.close();
};

const handleMessage = async (message: SyncWorkerMessage): Promise<void> => {
  switch (message.type) {
    case "process":
      await handleProcessMessage(message);
      break;
    case "shutdown":
      handleShutdownMessage(message);
      break;
    default:
      console.warn("[SyncWorker] unknown message type", message);
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  const message = data as SyncWorkerMessage;
  if (!message || !message.type) {
    return;
  }

  handleMessage(message).catch((error: unknown) => {
    console.error("[SyncWorker] message handler failed", error);
  });
});

export {};
