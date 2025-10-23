import { useEffect, useState, useCallback } from "react";
import {
  registerServiceWorker,
  isServiceWorkerSupported,
  onServiceWorkerMessage,
  getServiceWorkerQueueStatus,
  triggerManualSync,
  clearServiceWorkerCache,
  cleanupServiceWorkerCache,
  logAnalyticsToServiceWorker,
} from "@/lib/serviceWorker";
import type {
  ServiceWorkerIncomingMessage,
  ServiceWorkerSyncEnqueuedMessage,
  ServiceWorkerSyncSuccessMessage,
  ServiceWorkerSyncFailureMessage,
  ServiceWorkerSyncCompletedMessage,
} from "@/types/serviceWorker";

export type ServiceWorkerQueueStatus = {
  total: number;
  pending: number;
  failed: number;
  synced: number;
};

export type ServiceWorkerSyncResult = {
  processed: number;
  failed: number;
};

export type ServiceWorkerState = {
  isSupported: boolean;
  isRegistered: boolean;
  isReady: boolean;
  queueStatus: ServiceWorkerQueueStatus | null;
  lastSyncResult: ServiceWorkerSyncResult | null;
  error: string | null;
};

export type ServiceWorkerActions = {
  sync: () => Promise<ServiceWorkerSyncResult | null>;
  clearCache: () => Promise<boolean>;
  cleanupCache: () => Promise<boolean>;
  refreshQueueStatus: () => Promise<void>;
  logAnalytics: (payload: Record<string, unknown>) => Promise<boolean>;
};

export type UseServiceWorkerOptions = {
  autoRegister?: boolean;
  autoRefreshQueue?: boolean;
  refreshInterval?: number;
  onSyncEnqueued?: (message: ServiceWorkerSyncEnqueuedMessage) => void;
  onSyncSuccess?: (message: ServiceWorkerSyncSuccessMessage) => void;
  onSyncFailure?: (message: ServiceWorkerSyncFailureMessage) => void;
  onSyncCompleted?: (message: ServiceWorkerSyncCompletedMessage) => void;
};

export const useServiceWorker = (
  options: UseServiceWorkerOptions = {}
): [ServiceWorkerState, ServiceWorkerActions] => {
  const {
    autoRegister = true,
    autoRefreshQueue = true,
    refreshInterval = 5000,
    onSyncEnqueued,
    onSyncSuccess,
    onSyncFailure,
    onSyncCompleted,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: isServiceWorkerSupported(),
    isRegistered: false,
    isReady: false,
    queueStatus: null,
    lastSyncResult: null,
    error: null,
  });

  const refreshQueueStatus = useCallback(async () => {
    try {
      const status = await getServiceWorkerQueueStatus();
      setState((prev) => ({
        ...prev,
        queueStatus: status,
        error: null,
      }));
    } catch (error) {
      console.error("[useServiceWorker] Failed to refresh queue status", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to refresh queue status",
      }));
    }
  }, []);

  const sync = useCallback(async (): Promise<ServiceWorkerSyncResult | null> => {
    try {
      const result = await triggerManualSync();
      
      if (result) {
        setState((prev) => ({
          ...prev,
          lastSyncResult: result,
          error: null,
        }));
        
        await refreshQueueStatus();
      }
      
      return result;
    } catch (error) {
      console.error("[useServiceWorker] Sync failed", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
      return null;
    }
  }, [refreshQueueStatus]);

  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const success = await clearServiceWorkerCache();
      
      if (!success) {
        setState((prev) => ({
          ...prev,
          error: "Failed to clear cache",
        }));
      }
      
      return success;
    } catch (error) {
      console.error("[useServiceWorker] Clear cache failed", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Clear cache failed",
      }));
      return false;
    }
  }, []);

  const cleanupCache = useCallback(async (): Promise<boolean> => {
    try {
      const success = await cleanupServiceWorkerCache();
      
      if (!success) {
        setState((prev) => ({
          ...prev,
          error: "Failed to cleanup cache",
        }));
      }
      
      return success;
    } catch (error) {
      console.error("[useServiceWorker] Cleanup cache failed", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Cleanup cache failed",
      }));
      return false;
    }
  }, []);

  const logAnalytics = useCallback(async (payload: Record<string, unknown>): Promise<boolean> => {
    try {
      return await logAnalyticsToServiceWorker(payload);
    } catch (error) {
      console.error("[useServiceWorker] Log analytics failed", error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!state.isSupported || !autoRegister) {
      return;
    }

    let mounted = true;

    registerServiceWorker()
      .then((registration) => {
        if (!mounted) {
          return;
        }

        if (registration) {
          setState((prev) => ({
            ...prev,
            isRegistered: true,
            isReady: true,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: "Service worker registration failed",
          }));
        }
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        console.error("[useServiceWorker] Registration failed", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Registration failed",
        }));
      });

    return () => {
      mounted = false;
    };
  }, [state.isSupported, autoRegister]);

  useEffect(() => {
    if (!state.isReady || !autoRefreshQueue) {
      return;
    }

    refreshQueueStatus();

    const intervalId = setInterval(() => {
      refreshQueueStatus();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [state.isReady, autoRefreshQueue, refreshInterval, refreshQueueStatus]);

  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    const unsubscribe = onServiceWorkerMessage((event) => {
      const message = event.data as ServiceWorkerIncomingMessage;

      switch (message.type) {
        case "SYNC_ENQUEUED":
          if (onSyncEnqueued) {
            onSyncEnqueued(message);
          }
          refreshQueueStatus();
          break;

        case "SYNC_SUCCESS":
          if (onSyncSuccess) {
            onSyncSuccess(message);
          }
          refreshQueueStatus();
          break;

        case "SYNC_FAILURE":
          if (onSyncFailure) {
            onSyncFailure(message);
          }
          refreshQueueStatus();
          break;

        case "SYNC_COMPLETED":
          if (onSyncCompleted) {
            onSyncCompleted(message);
          }
          setState((prev) => ({
            ...prev,
            lastSyncResult: message.result,
          }));
          refreshQueueStatus();
          break;

        case "SYNC_ERROR":
          setState((prev) => ({
            ...prev,
            error: message.error,
          }));
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, [
    state.isSupported,
    onSyncEnqueued,
    onSyncSuccess,
    onSyncFailure,
    onSyncCompleted,
    refreshQueueStatus,
  ]);

  const actions: ServiceWorkerActions = {
    sync,
    clearCache,
    cleanupCache,
    refreshQueueStatus,
    logAnalytics,
  };

  return [state, actions];
};
