"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function SyncRetryBanner() {
  const { queueStatus, isProcessing, retryFailed, refreshStatus } = useSyncStatus();
  const { isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Refresh status periodically
    const interval = setInterval(() => {
      refreshStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryFailed();
    } catch (error) {
      console.error("Failed to retry:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show if no failed items or conflicts
  if (queueStatus.failed === 0 && queueStatus.conflicts === 0) {
    return null;
  }

  return (
    <div className="w-full border-b border-orange-500 bg-orange-50 dark:bg-orange-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex flex-col">
            <span className="font-semibold text-orange-900 dark:text-orange-100">
              Sync Issues Detected
            </span>
            <span className="text-sm text-orange-800 dark:text-orange-200">
              {queueStatus.failed > 0 && `${queueStatus.failed} failed operation(s)`}
              {queueStatus.failed > 0 && queueStatus.conflicts > 0 && " and "}
              {queueStatus.conflicts > 0 && `${queueStatus.conflicts} conflict(s)`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {queueStatus.pending > 0 && (
            <span className="text-sm text-orange-700 dark:text-orange-300">
              {queueStatus.pending} pending
            </span>
          )}
          {isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying || isProcessing}
              className="border-orange-700 text-orange-900 hover:bg-orange-100 dark:border-orange-300 dark:text-orange-100 dark:hover:bg-orange-900"
            >
              {isRetrying || isProcessing ? "Retrying..." : "Retry Failed"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
