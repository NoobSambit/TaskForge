"use client";

/**
 * Offline Tasks Hook
 * 
 * Provides optimistic CRUD operations for tasks with offline-first support.
 * 
 * Features:
 * - Hydrates from IndexedDB cache first, then reconciles with server
 * - Optimistic create with temporary IDs
 * - Optimistic update with debounced persistence
 * - Soft-delete with undo window
 * - Automatic rollback on sync failure
 * - Background worker integration for bulk operations
 * - Per-task state tracking (pending, failed, conflict)
 * 
 * Usage:
 * ```tsx
 * const {
 *   tasks,
 *   isLoading,
 *   isHydrated,
 *   createTask,
 *   updateTask,
 *   deleteTask,
 *   undoDelete,
 *   refreshFromServer,
 *   getTaskState
 * } = useOfflineTasks();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Task, TaskStatus } from "@/types";
import {
  SyncOperation,
  SyncQueueItem,
  SyncQueueItemStatus,
} from "@/types/sync";
import * as indexedDB from "@/lib/indexedDB";
import * as syncQueue from "@/lib/syncQueue";
import { useNetworkStatus } from "./useNetworkStatus";

const TASKS_STORE = "tasks";
const TASKS_ENTITY_TYPE = "tasks";
const SOFT_DELETE_UNDO_WINDOW = 5000; // 5 seconds
const UPDATE_DEBOUNCE_MS = 500;

type TaskState = {
  isPending: boolean;
  isFailed: boolean;
  isConflict: boolean;
  lastError?: string;
};

type SoftDeletedTask = {
  task: Task;
  deletedAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

type PendingUpdate = {
  taskId: string;
  updates: Partial<Task>;
  timeoutId: ReturnType<typeof setTimeout>;
};

const generateTempId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `temp_${crypto.randomUUID()}`;
  }
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const isTempId = (id: string): boolean => id.startsWith("temp_");

export type UseOfflineTasksReturn = {
  tasks: Array<Task>;
  isLoading: boolean;
  isHydrated: boolean;
  isSyncing: boolean;
  createTask: (taskData: Omit<Task, "_id" | "createdAt" | "updatedAt">) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  undoDelete: (taskId: string) => Promise<boolean>;
  refreshFromServer: () => Promise<void>;
  getTaskState: (taskId: string) => TaskState;
};

export function useOfflineTasks(): UseOfflineTasksReturn {
  const [tasks, setTasks] = useState<Array<Task>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(new Map());

  const softDeleted = useRef<Map<string, SoftDeletedTask>>(new Map());
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const optimisticTasks = useRef<Map<string, Task>>(new Map());

  const { isOnline } = useNetworkStatus();

  // Hydrate tasks from IndexedDB on mount
  const hydrateFromCache = useCallback(async () => {
    try {
      const keys = await indexedDB.getAllKeys(TASKS_STORE);
      const cachedTasks: Array<Task> = [];

      for (const key of keys) {
        const task = await indexedDB.getItem<Task>(TASKS_STORE, key);
        if (task) {
          cachedTasks.push(task);
        }
      }

      setTasks(cachedTasks);
      setIsHydrated(true);
    } catch (error) {
      console.error("[useOfflineTasks] Failed to hydrate from cache", error);
    }
  }, []);

  // Fetch tasks from server
  const fetchFromServer = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    try {
      setIsSyncing(true);
      const response = await fetch("/api/tasks");
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const serverTasks: Array<Task> = await response.json();

      // Reconcile with local cache
      const reconciled = new Map<string, Task>();

      // Add server tasks
      serverTasks.forEach((task) => {
        reconciled.set(task._id, task);
      });

      // Add optimistic tasks that don't have server IDs yet
      optimisticTasks.current.forEach((task, id) => {
        if (isTempId(id) && !reconciled.has(id)) {
          reconciled.set(id, task);
        }
      });

      const reconciledTasks = Array.from(reconciled.values());

      // Update IndexedDB cache with server data
      const bulkSetEntries = serverTasks.map((task) => ({
        key: task._id,
        value: task,
      }));

      if (bulkSetEntries.length > 0) {
        await indexedDB.bulkSet(TASKS_STORE, bulkSetEntries);
      }

      setTasks(reconciledTasks);
    } catch (error) {
      console.error("[useOfflineTasks] Failed to fetch from server", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Initial hydration and fetch
  useEffect(() => {
    const initialize = async () => {
      await hydrateFromCache();
      await fetchFromServer();
      setIsLoading(false);
    };

    initialize();
  }, [hydrateFromCache, fetchFromServer]);

  // Fetch from server when coming back online
  useEffect(() => {
    if (isOnline && isHydrated) {
      fetchFromServer();
    }
  }, [isOnline, isHydrated, fetchFromServer]);

  // Listen to sync queue events to update task states
  useEffect(() => {
    const unsubscribe = syncQueue.addEventListener((event) => {
      if (event.item?.entityType !== TASKS_ENTITY_TYPE) {
        return;
      }

      const taskId = event.item.entityId;

      switch (event.type) {
        case "enqueue":
        case "success":
        case "failure":
        case "conflict": {
          updateTaskState(taskId);
          break;
        }
      }
    });

    return unsubscribe;
  }, []);

  // Update task state based on sync queue items
  const updateTaskState = useCallback(async (taskId: string) => {
    try {
      const allKeys = await indexedDB.getAllKeys("syncQueue");
      let isPending = false;
      let isFailed = false;
      let isConflict = false;
      let lastError: string | undefined;

      for (const key of allKeys) {
        const item = await indexedDB.getItem<SyncQueueItem>("syncQueue", key);
        if (item?.entityType === TASKS_ENTITY_TYPE && item.entityId === taskId) {
          if (item.status === SyncQueueItemStatus.Pending || item.status === SyncQueueItemStatus.InFlight) {
            isPending = true;
          }
          if (item.status === SyncQueueItemStatus.Failed) {
            isFailed = true;
            lastError = item.lastError;
          }
          if (item.status === SyncQueueItemStatus.Conflict) {
            isConflict = true;
          }
        }
      }

      setTaskStates((prev) => {
        const next = new Map(prev);
        next.set(taskId, { isPending, isFailed, isConflict, lastError });
        return next;
      });
    } catch (error) {
      console.error("[useOfflineTasks] Failed to update task state", error);
    }
  }, []);

  // Flush pending update
  const flushPendingUpdate = useCallback(async (taskId: string) => {
    const pending = pendingUpdates.current.get(taskId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    pendingUpdates.current.delete(taskId);

    try {
      // Enqueue sync operation
      await syncQueue.enqueue(
        TASKS_ENTITY_TYPE,
        taskId,
        SyncOperation.Update,
        pending.updates as Record<string, unknown>,
        {
          timestamp: new Date().toISOString(),
          mutationType: SyncOperation.Update,
        }
      );

      await updateTaskState(taskId);
    } catch (error) {
      console.error("[useOfflineTasks] Failed to flush pending update", error);
    }
  }, [updateTaskState]);

  // Create task optimistically
  const createTask = useCallback(
    async (taskData: Omit<Task, "_id" | "createdAt" | "updatedAt">): Promise<Task> => {
      const tempId = generateTempId();
      const now = new Date().toISOString();

      const optimisticTask: Task = {
        ...taskData,
        _id: tempId,
        createdAt: now,
        updatedAt: now,
      };

      // Add to optimistic state
      optimisticTasks.current.set(tempId, optimisticTask);

      // Update UI immediately
      setTasks((prev) => [...prev, optimisticTask]);

      try {
        // Save to IndexedDB
        await indexedDB.setItem(TASKS_STORE, tempId, optimisticTask);

        // Enqueue sync operation
        await syncQueue.enqueue(
          TASKS_ENTITY_TYPE,
          tempId,
          SyncOperation.Create,
          taskData as Record<string, unknown>,
          {
            tempId,
            timestamp: now,
            mutationType: SyncOperation.Create,
          }
        );

        await updateTaskState(tempId);

        return optimisticTask;
      } catch (error) {
        // Rollback on error
        optimisticTasks.current.delete(tempId);
        setTasks((prev) => prev.filter((t) => t._id !== tempId));
        throw error;
      }
    },
    [updateTaskState]
  );

  // Update task with debouncing
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>): Promise<void> => {
      // Clear existing pending update
      const existing = pendingUpdates.current.get(taskId);
      if (existing) {
        clearTimeout(existing.timeoutId);
      }

      // Update task immediately (optimistic)
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task))
      );

      // Update in IndexedDB
      const currentTask = tasks.find((t) => t._id === taskId);
      if (currentTask) {
        const updatedTask = { ...currentTask, ...updates, updatedAt: new Date().toISOString() };
        optimisticTasks.current.set(taskId, updatedTask);
        await indexedDB.setItem(TASKS_STORE, taskId, updatedTask);
      }

      // Schedule debounced sync
      const timeoutId = setTimeout(() => {
        flushPendingUpdate(taskId);
      }, UPDATE_DEBOUNCE_MS);

      pendingUpdates.current.set(taskId, {
        taskId,
        updates,
        timeoutId,
      });
    },
    [tasks, flushPendingUpdate]
  );

  // Soft-delete task with undo window
  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) {
        return;
      }

      // Remove from UI immediately
      setTasks((prev) => prev.filter((t) => t._id !== taskId));

      // Store in soft-deleted map
      const timeoutId = setTimeout(async () => {
        softDeleted.current.delete(taskId);

        try {
          // Actually delete from IndexedDB
          await indexedDB.removeItem(TASKS_STORE, taskId);

          // Enqueue sync operation
          await syncQueue.enqueue(
            TASKS_ENTITY_TYPE,
            taskId,
            SyncOperation.Delete,
            {},
            {
              timestamp: new Date().toISOString(),
              mutationType: SyncOperation.Delete,
            }
          );

          optimisticTasks.current.delete(taskId);
          await updateTaskState(taskId);
        } catch (error) {
          console.error("[useOfflineTasks] Failed to complete delete", error);
          // Re-add task on error
          setTasks((prev) => [...prev, task]);
        }
      }, SOFT_DELETE_UNDO_WINDOW);

      softDeleted.current.set(taskId, {
        task,
        deletedAt: Date.now(),
        timeoutId,
      });
    },
    [tasks, updateTaskState]
  );

  // Undo soft-delete
  const undoDelete = useCallback(async (taskId: string): Promise<boolean> => {
    const deleted = softDeleted.current.get(taskId);
    if (!deleted) {
      return false;
    }

    // Cancel the delete timeout
    clearTimeout(deleted.timeoutId);
    softDeleted.current.delete(taskId);

    // Re-add task
    setTasks((prev) => [...prev, deleted.task]);

    return true;
  }, []);

  // Manual refresh from server
  const refreshFromServer = useCallback(async () => {
    await fetchFromServer();
  }, [fetchFromServer]);

  // Get task state
  const getTaskState = useCallback(
    (taskId: string): TaskState => {
      return (
        taskStates.get(taskId) || {
          isPending: false,
          isFailed: false,
          isConflict: false,
        }
      );
    },
    [taskStates]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all soft-delete timeouts
      softDeleted.current.forEach((deleted) => {
        clearTimeout(deleted.timeoutId);
      });

      // Clear all pending update timeouts
      pendingUpdates.current.forEach((pending) => {
        clearTimeout(pending.timeoutId);
      });
    };
  }, []);

  return {
    tasks,
    isLoading,
    isHydrated,
    isSyncing,
    createTask,
    updateTask,
    deleteTask,
    undoDelete,
    refreshFromServer,
    getTaskState,
  };
}
