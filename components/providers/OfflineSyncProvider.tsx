"use client";

/**
 * Offline Sync Provider
 * 
 * Initializes and manages the offline-first infrastructure.
 * 
 * Responsibilities:
 * - Initialize IndexedDB with schema migrations
 * - Register and manage sync worker lifecycle
 * - Provide context for downstream hooks
 * - Handle automatic sync on network status changes
 * - Expose initialization state
 * 
 * Usage:
 * ```tsx
 * <OfflineSyncProvider>
 *   <App />
 * </OfflineSyncProvider>
 * ```
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import * as indexedDB from "@/lib/indexedDB";
import * as syncQueue from "@/lib/syncQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { NetworkStatusProvider } from "@/hooks/NetworkStatusContext";

type OfflineSyncContextValue = {
  isInitialized: boolean;
  isWorkerRegistered: boolean;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function useOfflineSync(): OfflineSyncContextValue {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return context;
}

type OfflineSyncProviderProps = {
  children: React.ReactNode;
  autoSync?: boolean;
  syncInterval?: number;
};

function OfflineSyncProviderInner({
  children,
  autoSync = true,
  syncInterval = 30000, // 30 seconds
}: OfflineSyncProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWorkerRegistered, setIsWorkerRegistered] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(autoSync);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<number>(0);

  const { isOnline } = useNetworkStatus();

  // Initialize IndexedDB
  const initialize = useCallback(async () => {
    try {
      await indexedDB.initializeIndexedDb();
      setIsInitialized(true);
    } catch (error) {
      console.error("[OfflineSyncProvider] Failed to initialize IndexedDB", error);
    }
  }, []);

  // Register sync worker
  const registerWorker = useCallback(() => {
    try {
      const registered = syncQueue.registerWorker();
      setIsWorkerRegistered(registered);
      if (!registered) {
        console.warn("[OfflineSyncProvider] Sync worker not available");
      }
    } catch (error) {
      console.error("[OfflineSyncProvider] Failed to register sync worker", error);
    }
  }, []);

  // Process pending sync items
  const processPendingSync = useCallback(async () => {
    if (!isOnline || !isInitialized) {
      return;
    }

    const now = Date.now();
    // Throttle sync attempts to avoid rapid-fire syncing
    if (now - lastSyncRef.current < 5000) {
      return;
    }

    lastSyncRef.current = now;

    try {
      // Get auth token if available
      let authToken: string | undefined;
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          authToken = session?.accessToken;
        }
      } catch (error) {
        // Session fetch failed, continue without token
      }

      const synced = await syncQueue.processBatch(authToken);
      if (synced > 0) {
        console.log(`[OfflineSyncProvider] Synced ${synced} items`);
      }
    } catch (error) {
      console.error("[OfflineSyncProvider] Auto-sync failed", error);
    }
  }, [isOnline, isInitialized]);

  // Initialize on mount
  useEffect(() => {
    initialize();
    registerWorker();
  }, [initialize, registerWorker]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && isInitialized && autoSyncEnabled) {
      processPendingSync();
    }
  }, [isOnline, isInitialized, autoSyncEnabled, processPendingSync]);

  // Set up periodic auto-sync
  useEffect(() => {
    if (!autoSyncEnabled || !isOnline || !isInitialized) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      processPendingSync();
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSyncEnabled, isOnline, isInitialized, syncInterval, processPendingSync]);

  // Listen to sync queue events
  useEffect(() => {
    const unsubscribe = syncQueue.addEventListener((event) => {
      // Auto-trigger sync on new queue items if online
      if (event.type === "enqueue" && isOnline && autoSyncEnabled) {
        // Debounce to avoid too frequent syncs
        setTimeout(() => {
          processPendingSync();
        }, 1000);
      }
    });

    return unsubscribe;
  }, [isOnline, autoSyncEnabled, processPendingSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      syncQueue.deregisterWorker();
    };
  }, []);

  const value: OfflineSyncContextValue = {
    isInitialized,
    isWorkerRegistered,
    autoSyncEnabled,
    setAutoSyncEnabled,
  };

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function OfflineSyncProvider(props: OfflineSyncProviderProps) {
  return (
    <NetworkStatusProvider>
      <OfflineSyncProviderInner {...props} />
    </NetworkStatusProvider>
  );
}
