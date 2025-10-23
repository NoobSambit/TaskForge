"use client";

import { useServiceWorker } from "@/hooks/useServiceWorker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Trash2 } from "lucide-react";

export function SyncStatusWidget() {
  const [state, actions] = useServiceWorker({
    autoRegister: true,
    autoRefreshQueue: true,
    refreshInterval: 5000,
  });

  if (!state.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Service Worker Not Supported
          </CardTitle>
          <CardDescription>
            Your browser does not support service workers. Offline features are unavailable.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!state.isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Service Worker...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { queueStatus, lastSyncResult, error } = state;
  const hasPendingItems = (queueStatus?.pending ?? 0) > 0;
  const hasFailedItems = (queueStatus?.failed ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {hasPendingItems || hasFailedItems ? (
              <Clock className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Sync Status
          </span>
          <Badge variant={hasPendingItems || hasFailedItems ? "secondary" : "default"}>
            {state.isRegistered ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Background synchronization and offline queue management
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {queueStatus && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-2xl font-bold">{queueStatus.total}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {queueStatus.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {queueStatus.failed}
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {queueStatus.synced}
              </div>
              <div className="text-xs text-muted-foreground">Synced</div>
            </div>
          </div>
        )}

        {lastSyncResult && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="font-medium">Last Sync Result</div>
            <div className="mt-1 text-muted-foreground">
              {lastSyncResult.processed} processed, {lastSyncResult.failed} failed
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => actions.sync()}
            disabled={!hasPendingItems}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Now
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.refreshQueueStatus()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.cleanupCache()}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Cleanup Cache
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Clear all caches? This will remove cached resources.")) {
                actions.clearCache();
              }
            }}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </Button>
        </div>

        {hasPendingItems && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {queueStatus?.pending} item(s) waiting to sync. They will be synchronized automatically when
                you&apos;re back online.
              </span>
            </div>
          </div>
        )}

        {hasFailedItems && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>
                {queueStatus?.failed} item(s) failed to sync after multiple attempts. Please check your
                connection and try syncing manually.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
