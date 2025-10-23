"use client";

import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SyncState = "synced" | "syncing" | "offline" | "failed" | "conflict";

export function SyncIndicator() {
  const { queueStatus, isProcessing, lastSyncAt, triggerSync, retryFailed } = useSyncStatus();

  const getSyncState = (): SyncState => {
    if (queueStatus.conflicts > 0) return "conflict";
    if (queueStatus.failed > 0) return "failed";
    if (isProcessing || queueStatus.inFlight > 0) return "syncing";
    if (queueStatus.pending > 0) return "offline";
    return "synced";
  };

  const syncState = getSyncState();

  const getStateConfig = (state: SyncState) => {
    switch (state) {
      case "synced":
        return {
          icon: "✓",
          text: "Synced",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "syncing":
        return {
          icon: "↻",
          text: "Syncing",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "offline":
        return {
          icon: "⚠",
          text: "Offline",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "failed":
        return {
          icon: "✕",
          text: "Failed",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "conflict":
        return {
          icon: "⚡",
          text: "Conflict",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
    }
  };

  const config = getStateConfig(syncState);

  const handleManualSync = async () => {
    try {
      await triggerSync();
    } catch (error) {
      console.error("Manual sync failed", error);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailed();
    } catch (error) {
      console.error("Retry failed items failed", error);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
        config.bgColor,
        config.borderColor
      )}
    >
      <span className={cn("text-base", config.color, syncState === "syncing" && "animate-spin")}>
        {config.icon}
      </span>
      <div className="flex flex-col">
        <span className={cn("font-medium", config.color)}>{config.text}</span>
        {queueStatus.pending > 0 && (
          <span className="text-xs text-muted-foreground">{queueStatus.pending} pending</span>
        )}
        {queueStatus.failed > 0 && (
          <span className="text-xs text-muted-foreground">{queueStatus.failed} failed</span>
        )}
        {queueStatus.conflicts > 0 && (
          <span className="text-xs text-muted-foreground">{queueStatus.conflicts} conflicts</span>
        )}
        {syncState === "synced" && lastSyncAt && (
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(lastSyncAt)}
          </span>
        )}
      </div>
      {(syncState === "offline" || syncState === "failed") && (
        <Button
          size="sm"
          variant="ghost"
          onClick={syncState === "failed" ? handleRetryFailed : handleManualSync}
          disabled={isProcessing}
          className={cn("ml-2 h-6 px-2 text-xs", config.color)}
        >
          {syncState === "failed" ? "Retry" : "Sync"}
        </Button>
      )}
    </div>
  );
}
