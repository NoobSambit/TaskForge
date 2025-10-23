"use client";

/**
 * Sync Status Hook
 * 
 * Provides real-time sync queue status and imperative controls.
 * 
 * Features:
 * - Aggregate queue metrics (pending, processing, failed, conflict counts)
 * - Last sync timestamp tracking
 * - In-flight operation tracking
 * - Imperative sync controls (trigger, clear, retry)
 * - Real-time event updates
 * 
 * Usage:
 * ```tsx
 * const {
 *   queueStatus,
 *   isProcessing,
 *   lastSyncAt,
 *   triggerSync,
 *   clearQueue,
 *   clearSynced,
 *   retryFailed
 * } = useSyncStatus();
 * ```
 */

import { useCallback, useEffect, useState } from "react";
import {
  SyncQueueSnapshot,
  SyncQueueItemStatus,
  SyncQueueItem,
} from "@/types/sync";
import * as syncQueue from "@/lib/syncQueue";
import * as indexedDB from "@/lib/indexedDB";
import { useNetworkStatus } from "./useNetworkStatus";

export type QueueStatus = {
  total: number;
  pending: number;
  inFlight: number;
  synced: number;
  failed: number;
  conflicts: number;
};

export type UseSyncStatusReturn = {
  queueStatus: QueueStatus;
  isProcessing: boolean;
  lastSyncAt: string | null;
  triggerSync: () => Promise<number>;
  clearQueue: () => Promise<number>;
  clearSynced: () => Promise<number>;
  retryFailed: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const SYNC_QUEUE_STORE = "syncQueue";

export function useSyncStatus(): UseSyncStatusReturn {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    total: 0,
    pending: 0,
    inFlight: 0,
    synced: 0,
    failed: 0,
    conflicts: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const { isOnline } = useNetworkStatus();

  // Compute queue status from snapshot
  const computeStatus = useCallback((snapshot: SyncQueueSnapshot): QueueStatus => {
    const inFlight = snapshot.items.filter(
      (item) => item.status === SyncQueueItemStatus.InFlight
    ).length;
    const synced = snapshot.items.filter(
      (item) => item.status === SyncQueueItemStatus.Synced
    ).length;

    return {
      total: snapshot.items.length,
      pending: snapshot.pending,
      inFlight,
      synced,
      failed: snapshot.failed,
      conflicts: snapshot.conflicts,
    };
  }, []);

  // Refresh status from sync queue
  const refreshStatus = useCallback(async () => {
    try {
      const snapshot = await syncQueue.getSnapshot();
      const status = computeStatus(snapshot);
      setQueueStatus(status);

      // Update last sync timestamp if we have synced items
      if (status.synced > 0) {
        const syncedItems = snapshot.items.filter(
          (item) => item.status === SyncQueueItemStatus.Synced
        );
        if (syncedItems.length > 0) {
          const mostRecent = syncedItems.reduce((latest, item) => {
            return new Date(item.updatedAt) > new Date(latest.updatedAt)
              ? item
              : latest;
          });
          setLastSyncAt(mostRecent.updatedAt);
        }
      }
    } catch (error) {
      console.error("[useSyncStatus] Failed to refresh status", error);
    }
  }, [computeStatus]);

  // Listen to sync queue events
  useEffect(() => {
    const unsubscribe = syncQueue.addEventListener((event) => {
      refreshStatus();

      if (event.type === "success") {
        setLastSyncAt(new Date().toISOString());
      }
    });

    return unsubscribe;
  }, [refreshStatus]);

  // Initial status fetch
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Trigger sync manually
  const triggerSync = useCallback(async (): Promise<number> => {
    if (!isOnline) {
      console.warn("[useSyncStatus] Cannot sync while offline");
      return 0;
    }

    try {
      setIsProcessing(true);
      
      // Get auth token if available
      let authToken: string | undefined;
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          authToken = session?.accessToken;
        }
      } catch (error) {
        console.warn("[useSyncStatus] Failed to get auth token", error);
      }

      const synced = await syncQueue.processBatch(authToken);
      await refreshStatus();
      return synced;
    } catch (error) {
      console.error("[useSyncStatus] Sync failed", error);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, refreshStatus]);

  // Clear entire queue
  const clearQueue = useCallback(async (): Promise<number> => {
    try {
      const count = await syncQueue.clearAll();
      await refreshStatus();
      return count;
    } catch (error) {
      console.error("[useSyncStatus] Failed to clear queue", error);
      return 0;
    }
  }, [refreshStatus]);

  // Clear synced items
  const clearSynced = useCallback(async (): Promise<number> => {
    try {
      const count = await syncQueue.clearSynced();
      await refreshStatus();
      return count;
    } catch (error) {
      console.error("[useSyncStatus] Failed to clear synced items", error);
      return 0;
    }
  }, [refreshStatus]);

  // Retry failed items
  const retryFailed = useCallback(async (): Promise<void> => {
    try {
      // Get all queue items
      const keys = await indexedDB.getAllKeys(SYNC_QUEUE_STORE);
      const failedItems: Array<SyncQueueItem> = [];

      for (const key of keys) {
        const item = await indexedDB.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, key);
        if (item && item.status === SyncQueueItemStatus.Failed) {
          failedItems.push(item);
        }
      }

      // Reset failed items to pending
      for (const item of failedItems) {
        const updated: SyncQueueItem = {
          ...item,
          status: SyncQueueItemStatus.Pending,
          attempts: 0,
          lastError: undefined,
          scheduledAt: undefined,
          updatedAt: new Date().toISOString(),
        };
        await indexedDB.setItem(SYNC_QUEUE_STORE, item.id, updated);
      }

      await refreshStatus();

      // Trigger sync if online
      if (isOnline && failedItems.length > 0) {
        await triggerSync();
      }
    } catch (error) {
      console.error("[useSyncStatus] Failed to retry failed items", error);
    }
  }, [isOnline, refreshStatus, triggerSync]);

  return {
    queueStatus,
    isProcessing,
    lastSyncAt,
    triggerSync,
    clearQueue,
    clearSynced,
    retryFailed,
    refreshStatus,
  };
}
