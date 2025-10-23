"use client";

/**
 * Network Status Indicator Component
 * 
 * Example component demonstrating the use of useNetworkStatus hook
 * to display network connectivity status in the UI.
 */

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { SyncConnectionStatus } from "@/types/sync";

export function NetworkStatusIndicator() {
  const {
    isOnline,
    wasOffline,
    connectionStatus,
    connectionMetadata,
    failureCount,
    lastTransition,
    recheck,
  } = useNetworkStatus({
    onStatusChange: (status, metadata) => {
      console.log("[NetworkStatus] Status changed:", status, metadata);
    },
    onTransition: (transition) => {
      console.log("[NetworkStatus] Transition:", transition);
    },
  });

  const getStatusColor = () => {
    switch (connectionStatus) {
      case SyncConnectionStatus.Online:
        return "bg-green-500";
      case SyncConnectionStatus.Degraded:
        return "bg-yellow-500";
      case SyncConnectionStatus.Offline:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case SyncConnectionStatus.Online:
        return "Online";
      case SyncConnectionStatus.Degraded:
        return "Degraded";
      case SyncConnectionStatus.Offline:
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const handleRecheck = async () => {
    const result = await recheck();
    console.log("[NetworkStatus] Recheck result:", result);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="font-medium">{getStatusText()}</span>
      
      {connectionMetadata.effectiveType && (
        <span className="text-gray-500">({connectionMetadata.effectiveType})</span>
      )}
      
      {failureCount > 0 && (
        <span className="text-red-500">({failureCount} failures)</span>
      )}
      
      {wasOffline && connectionStatus === SyncConnectionStatus.Online && (
        <span className="text-green-600">(reconnected)</span>
      )}

      <button
        onClick={handleRecheck}
        className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
        disabled={!isOnline}
      >
        Recheck
      </button>

      {lastTransition && (
        <span className="text-xs text-gray-400">
          Last: {new Date(lastTransition.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
