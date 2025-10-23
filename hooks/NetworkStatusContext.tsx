"use client";

/**
 * Network Status Context
 * 
 * Provides a React Context for sharing network status across components
 * with optional heartbeat configuration.
 * 
 * Usage:
 * ```tsx
 * // In your root layout or app component
 * <NetworkStatusProvider heartbeatUrl="/api/health" heartbeatInterval={30000}>
 *   <App />
 * </NetworkStatusProvider>
 * 
 * // In any child component
 * function MyComponent() {
 *   const networkStatus = useNetworkStatusContext();
 *   return <div>{networkStatus.isOnline ? 'Online' : 'Offline'}</div>;
 * }
 * ```
 */

import { createContext, useContext, useEffect, ReactNode } from "react";
import { startHeartbeat, stopHeartbeat } from "@/lib/networkStatus";
import { useNetworkStatus, UseNetworkStatusReturn, UseNetworkStatusOptions } from "./useNetworkStatus";

type NetworkStatusContextValue = UseNetworkStatusReturn;

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

export type NetworkStatusProviderProps = {
  children: ReactNode;
  heartbeatUrl?: string;
  heartbeatInterval?: number;
  onStatusChange?: UseNetworkStatusOptions["onStatusChange"];
  onTransition?: UseNetworkStatusOptions["onTransition"];
};

/**
 * Provider component for network status context
 */
export function NetworkStatusProvider({
  children,
  heartbeatUrl = "/api/health",
  heartbeatInterval = 30000,
  onStatusChange,
  onTransition,
}: NetworkStatusProviderProps) {
  const networkStatus = useNetworkStatus({ onStatusChange, onTransition });

  useEffect(() => {
    if (heartbeatUrl) {
      startHeartbeat(heartbeatUrl, heartbeatInterval);
    }

    return () => {
      if (heartbeatUrl) {
        stopHeartbeat();
      }
    };
  }, [heartbeatUrl, heartbeatInterval]);

  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

/**
 * Hook to access network status from context
 * 
 * @throws Error if used outside of NetworkStatusProvider
 */
export function useNetworkStatusContext(): NetworkStatusContextValue {
  const context = useContext(NetworkStatusContext);
  
  if (!context) {
    throw new Error(
      "useNetworkStatusContext must be used within a NetworkStatusProvider. " +
      "Either wrap your component tree with NetworkStatusProvider or use the useNetworkStatus hook directly."
    );
  }
  
  return context;
}

/**
 * Hook to optionally access network status from context
 * 
 * Returns null if used outside of NetworkStatusProvider, allowing for optional context usage.
 */
export function useOptionalNetworkStatusContext(): NetworkStatusContextValue | null {
  return useContext(NetworkStatusContext);
}
