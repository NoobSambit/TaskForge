"use client";

/**
 * React Hook for Network Status Monitoring
 * 
 * Provides a React-friendly interface to the network status utilities
 * with automatic cleanup and state management.
 * 
 * Features:
 * - Reactive network status tracking
 * - Connection metadata (Network Information API)
 * - Timestamped transitions tracking
 * - Manual recheck capability
 * - Failure logging helpers
 * - Automatic cleanup on unmount
 * - SSR-safe with graceful degradation
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isOnline,
 *     wasOffline,
 *     connectionStatus,
 *     connectionMetadata,
 *     failureCount,
 *     lastTransition,
 *     recheck,
 *     logFailure,
 *     resetFailures
 *   } = useNetworkStatus();
 * 
 *   return (
 *     <div>
 *       {isOnline ? 'Online' : 'Offline'}
 *       {connectionMetadata.effectiveType && (
 *         <span>Connection: {connectionMetadata.effectiveType}</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getNetworkStatus,
  isOnline as isOnlineUtil,
  getConnectionMetadata,
  getFailureCount,
  getLastTransition,
  onNetworkStatusChange,
  performHeartbeatCheck,
  logFailure as logFailureUtil,
  resetFailureCount,
  type NetworkConnectionMetadata,
  type NetworkStatusTransition,
} from "@/lib/networkStatus";
import { SyncConnectionStatus } from "@/types/sync";

export type UseNetworkStatusOptions = {
  onStatusChange?: (status: SyncConnectionStatus, metadata: NetworkConnectionMetadata) => void;
  onTransition?: (transition: NetworkStatusTransition) => void;
};

export type UseNetworkStatusReturn = {
  isOnline: boolean;
  wasOffline: boolean;
  connectionStatus: SyncConnectionStatus;
  connectionMetadata: NetworkConnectionMetadata;
  failureCount: number;
  lastTransition: NetworkStatusTransition | null;
  recheck: () => Promise<boolean>;
  logFailure: () => void;
  resetFailures: () => void;
};

/**
 * Hook to monitor network status with React state management
 */
export function useNetworkStatus(options?: UseNetworkStatusOptions): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => isOnlineUtil());
  const [connectionStatus, setConnectionStatus] = useState<SyncConnectionStatus>(() => getNetworkStatus());
  const [connectionMetadata, setConnectionMetadata] = useState<NetworkConnectionMetadata>(() => getConnectionMetadata());
  const [failureCount, setFailureCount] = useState<number>(() => getFailureCount());
  const [lastTransition, setLastTransition] = useState<NetworkStatusTransition | null>(() => getLastTransition());
  
  const wasOfflineRef = useRef<boolean>(false);
  
  // Track if we've ever been offline
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    }
  }, [isOnline]);

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = onNetworkStatusChange((status, metadata, transition) => {
      setConnectionStatus(status);
      setIsOnline(status !== SyncConnectionStatus.Offline);
      setConnectionMetadata(metadata);
      setFailureCount(getFailureCount());
      
      if (transition) {
        setLastTransition(transition);
        options?.onTransition?.(transition);
      }
      
      options?.onStatusChange?.(status, metadata);
    });

    return unsubscribe;
  }, [options]);

  // Manual recheck function
  const recheck = useCallback(async (): Promise<boolean> => {
    const result = await performHeartbeatCheck();
    
    // Update state after recheck
    setConnectionStatus(getNetworkStatus());
    setIsOnline(isOnlineUtil());
    setConnectionMetadata(getConnectionMetadata());
    setFailureCount(getFailureCount());
    setLastTransition(getLastTransition());
    
    return result;
  }, []);

  // Log a failure
  const logFailure = useCallback(() => {
    logFailureUtil();
    setFailureCount(getFailureCount());
    setConnectionStatus(getNetworkStatus());
    setIsOnline(isOnlineUtil());
  }, []);

  // Reset failures
  const resetFailures = useCallback(() => {
    resetFailureCount();
    setFailureCount(0);
  }, []);

  return {
    isOnline,
    wasOffline: wasOfflineRef.current,
    connectionStatus,
    connectionMetadata,
    failureCount,
    lastTransition,
    recheck,
    logFailure,
    resetFailures,
  };
}
