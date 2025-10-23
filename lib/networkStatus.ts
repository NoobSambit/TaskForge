/**
 * Network Status Management Module
 * 
 * Tracks and monitors network connectivity status for sync operations.
 * 
 * Features:
 * - Online/offline/degraded status tracking
 * - Event-based status change notifications
 * - Automatic browser online/offline event handling
 * - Periodic heartbeat checks with exponential backoff
 * - Network Information API metadata (effectiveType, downlink, rtt, saveData)
 * - Consecutive failure tracking
 * - Manual recheck and failure logging
 * - SSR/Node safe with graceful degradation
 * 
 * Usage:
 * ```ts
 * // Check current status
 * const isConnected = isOnline();
 * 
 * // Listen for status changes
 * const unsubscribe = onNetworkStatusChange((status, metadata) => {
 *   console.log('Network status:', status, metadata);
 * });
 * 
 * // Start heartbeat checks
 * startHeartbeat('/api/health');
 * 
 * // Get connection metadata
 * const metadata = getConnectionMetadata();
 * ```
 */

import { SyncConnectionStatus } from "@/types/sync";

export type NetworkConnectionMetadata = {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number; // Mbps
  rtt?: number; // milliseconds
  saveData?: boolean;
};

export type NetworkStatusTransition = {
  from: SyncConnectionStatus;
  to: SyncConnectionStatus;
  timestamp: number;
};

type NetworkStatusListener = (
  status: SyncConnectionStatus,
  metadata: NetworkConnectionMetadata,
  transition: NetworkStatusTransition | null
) => void;

let currentStatus: SyncConnectionStatus = SyncConnectionStatus.Online;
let lastTransition: NetworkStatusTransition | null = null;
const listeners = new Set<NetworkStatusListener>();

// Heartbeat configuration
let heartbeatUrl: string | null = null;
let heartbeatIntervalMs = 30000; // 30 seconds default
let heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
let heartbeatBackoffMultiplier = 1;
const maxBackoffMultiplier = 16; // Max ~8 minutes with 30s base

// Failure tracking
let consecutiveFailures = 0;

/**
 * Detect if we're in a browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
};

/**
 * Get Network Information API connection metadata
 */
export const getConnectionMetadata = (): NetworkConnectionMetadata => {
  if (!isBrowser()) {
    return {};
  }

  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

  if (!connection) {
    return {};
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
};

/**
 * Detect initial network status
 */
const detectInitialStatus = (): SyncConnectionStatus => {
  if (!isBrowser()) {
    return SyncConnectionStatus.Online;
  }

  return navigator.onLine ? SyncConnectionStatus.Online : SyncConnectionStatus.Offline;
};

/**
 * Update status and notify listeners
 */
const updateStatus = (newStatus: SyncConnectionStatus) => {
  if (currentStatus === newStatus) {
    return;
  }

  const transition: NetworkStatusTransition = {
    from: currentStatus,
    to: newStatus,
    timestamp: Date.now(),
  };

  currentStatus = newStatus;
  lastTransition = transition;

  const metadata = getConnectionMetadata();

  listeners.forEach((listener) => {
    try {
      listener(newStatus, metadata, transition);
    } catch (error) {
      console.error("[NetworkStatus] listener failed", error);
    }
  });
};

/**
 * Handle online event
 */
const handleOnline = () => {
  consecutiveFailures = 0;
  heartbeatBackoffMultiplier = 1;
  updateStatus(SyncConnectionStatus.Online);
};

/**
 * Handle offline event
 */
const handleOffline = () => {
  updateStatus(SyncConnectionStatus.Offline);
};

/**
 * Handle connection change event (Network Information API)
 */
const handleConnectionChange = () => {
  const metadata = getConnectionMetadata();
  
  // Notify listeners even if status hasn't changed (metadata might have)
  listeners.forEach((listener) => {
    try {
      listener(currentStatus, metadata, null);
    } catch (error) {
      console.error("[NetworkStatus] listener failed", error);
    }
  });
};

/**
 * Perform a heartbeat check against the configured endpoint
 */
export const performHeartbeatCheck = async (): Promise<boolean> => {
  if (!isBrowser() || !heartbeatUrl) {
    return currentStatus !== SyncConnectionStatus.Offline;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(heartbeatUrl, {
      method: "HEAD",
      cache: "no-cache",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      consecutiveFailures = 0;
      heartbeatBackoffMultiplier = 1;
      
      if (currentStatus === SyncConnectionStatus.Degraded) {
        updateStatus(SyncConnectionStatus.Online);
      }
      
      return true;
    } else {
      consecutiveFailures++;
      
      if (consecutiveFailures >= 3 && currentStatus === SyncConnectionStatus.Online) {
        updateStatus(SyncConnectionStatus.Degraded);
      }
      
      return false;
    }
  } catch (error) {
    consecutiveFailures++;
    
    // If we have multiple consecutive failures and we're online, mark as degraded
    if (consecutiveFailures >= 3 && currentStatus === SyncConnectionStatus.Online) {
      updateStatus(SyncConnectionStatus.Degraded);
    }
    
    return false;
  }
};

/**
 * Schedule the next heartbeat check with exponential backoff
 */
const scheduleNextHeartbeat = () => {
  if (!isBrowser() || !heartbeatUrl) {
    return;
  }

  if (heartbeatTimeoutId) {
    clearTimeout(heartbeatTimeoutId);
  }

  const interval = heartbeatIntervalMs * heartbeatBackoffMultiplier;

  heartbeatTimeoutId = setTimeout(async () => {
    const success = await performHeartbeatCheck();
    
    if (!success) {
      // Increase backoff on failure
      heartbeatBackoffMultiplier = Math.min(
        heartbeatBackoffMultiplier * 2,
        maxBackoffMultiplier
      );
    }
    
    scheduleNextHeartbeat();
  }, interval);
};

/**
 * Start periodic heartbeat checks
 */
export const startHeartbeat = (url: string = "/api/health", initialIntervalMs: number = 30000) => {
  if (!isBrowser()) {
    return;
  }

  heartbeatUrl = url;
  heartbeatIntervalMs = initialIntervalMs;
  heartbeatBackoffMultiplier = 1;
  
  // Perform an immediate check
  performHeartbeatCheck().then(() => {
    scheduleNextHeartbeat();
  });
};

/**
 * Stop periodic heartbeat checks
 */
export const stopHeartbeat = () => {
  if (heartbeatTimeoutId) {
    clearTimeout(heartbeatTimeoutId);
    heartbeatTimeoutId = null;
  }
  
  heartbeatUrl = null;
  heartbeatBackoffMultiplier = 1;
};

/**
 * Get the current number of consecutive failures
 */
export const getFailureCount = (): number => {
  return consecutiveFailures;
};

/**
 * Reset the consecutive failure count
 */
export const resetFailureCount = () => {
  consecutiveFailures = 0;
  heartbeatBackoffMultiplier = 1;
};

/**
 * Manually increment the failure count
 */
export const logFailure = () => {
  consecutiveFailures++;
  
  if (consecutiveFailures >= 3 && currentStatus === SyncConnectionStatus.Online) {
    updateStatus(SyncConnectionStatus.Degraded);
  }
};

/**
 * Get the current network status
 */
export const getNetworkStatus = (): SyncConnectionStatus => currentStatus;

/**
 * Check if online (not offline)
 */
export const isOnline = (): boolean => currentStatus !== SyncConnectionStatus.Offline;

/**
 * Get the last status transition
 */
export const getLastTransition = (): NetworkStatusTransition | null => lastTransition;

/**
 * Manually set degraded status
 */
export const setDegraded = () => {
  updateStatus(SyncConnectionStatus.Degraded);
};

/**
 * Restore from degraded status to detected status
 */
export const restoreFromDegraded = () => {
  if (currentStatus === SyncConnectionStatus.Degraded) {
    const detectedStatus = detectInitialStatus();
    updateStatus(detectedStatus);
  }
};

/**
 * Subscribe to network status changes
 */
export const onNetworkStatusChange = (listener: NetworkStatusListener): (() => void) => {
  listeners.add(listener);
  
  // Immediately call with current status
  const metadata = getConnectionMetadata();
  try {
    listener(currentStatus, metadata, lastTransition);
  } catch (error) {
    console.error("[NetworkStatus] initial listener call failed", error);
  }
  
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Wait for online status with optional timeout
 */
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

export const __resetNetworkStatusForTesting = () => {
  if (heartbeatTimeoutId) {
    clearTimeout(heartbeatTimeoutId);
    heartbeatTimeoutId = null;
  }

  listeners.clear();
  currentStatus = detectInitialStatus();
  lastTransition = null;
  heartbeatUrl = null;
  heartbeatIntervalMs = 30000;
  heartbeatBackoffMultiplier = 1;
  consecutiveFailures = 0;
};

// Initialize in browser environment
if (isBrowser()) {
  currentStatus = detectInitialStatus();

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  
  // Listen for Network Information API changes
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (connection) {
    connection.addEventListener("change", handleConnectionChange);
  }
}
