/**
 * Network Status Management Module
 * 
 * Tracks and monitors network connectivity status for sync operations.
 * 
 * Features:
 * - Online/offline/degraded status tracking
 * - Event-based status change notifications
 * - Automatic browser online/offline event handling
 * - Wait for online capability with timeout
 * - Manual degraded state management
 * 
 * Usage:
 * ```ts
 * // Check current status
 * const isConnected = isOnline();
 * 
 * // Listen for status changes
 * const unsubscribe = onNetworkStatusChange((status) => {
 *   console.log('Network status:', status);
 * });
 * 
 * // Wait for online with timeout
 * const connected = await waitForOnline(5000);
 * ```
 */

import { SyncConnectionStatus } from "@/types/sync";

type NetworkStatusListener = (status: SyncConnectionStatus) => void;

let currentStatus: SyncConnectionStatus = SyncConnectionStatus.Online;
const listeners = new Set<NetworkStatusListener>();

const detectInitialStatus = (): SyncConnectionStatus => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return SyncConnectionStatus.Online;
  }

  return navigator.onLine ? SyncConnectionStatus.Online : SyncConnectionStatus.Offline;
};

const updateStatus = (newStatus: SyncConnectionStatus) => {
  if (currentStatus === newStatus) {
    return;
  }

  currentStatus = newStatus;
  listeners.forEach((listener) => {
    try {
      listener(newStatus);
    } catch (error) {
      console.error("[NetworkStatus] listener failed", error);
    }
  });
};

const handleOnline = () => {
  updateStatus(SyncConnectionStatus.Online);
};

const handleOffline = () => {
  updateStatus(SyncConnectionStatus.Offline);
};

if (typeof window !== "undefined") {
  currentStatus = detectInitialStatus();

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export const getNetworkStatus = (): SyncConnectionStatus => currentStatus;

export const isOnline = (): boolean => currentStatus !== SyncConnectionStatus.Offline;

export const setDegraded = () => {
  updateStatus(SyncConnectionStatus.Degraded);
};

export const restoreFromDegraded = () => {
  if (currentStatus === SyncConnectionStatus.Degraded) {
    const detectedStatus = detectInitialStatus();
    updateStatus(detectedStatus);
  }
};

export const onNetworkStatusChange = (listener: NetworkStatusListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const waitForOnline = async (timeoutMs?: number): Promise<boolean> => {
  if (isOnline()) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };

    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);
    }

    unsubscribe = onNetworkStatusChange((status) => {
      if (status !== SyncConnectionStatus.Offline) {
        cleanup();
        resolve(true);
      }
    });
  });
};
