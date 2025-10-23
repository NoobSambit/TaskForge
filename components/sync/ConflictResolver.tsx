"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "@/types";
import { SyncQueueItem, SyncQueueItemStatus } from "@/types/sync";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import * as indexedDB from "@/lib/indexedDB";
import * as syncQueue from "@/lib/syncQueue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ConflictedTask = {
  queueItem: SyncQueueItem;
  local: Task | null;
  remote: Task | null;
};

export function ConflictResolver() {
  const [conflicts, setConflicts] = useState<ConflictedTask[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { refreshFromServer } = useOfflineTasks();

  const loadConflicts = useCallback(async () => {
    try {
      const keys = await indexedDB.getAllKeys("syncQueue");
      const conflictedItems: ConflictedTask[] = [];

      for (const key of keys) {
        const item = await indexedDB.getItem<SyncQueueItem>("syncQueue", key);
        if (item && item.status === SyncQueueItemStatus.Conflict && item.entityType === "tasks") {
          const localTask = await indexedDB.getItem<Task>("tasks", item.entityId);
          
          let remoteTask: Task | null = null;
          try {
            const response = await fetch(`/api/tasks/${item.entityId}`);
            if (response.ok) {
              remoteTask = await response.json();
            }
          } catch (error) {
            console.error("Failed to fetch remote task", error);
          }

          conflictedItems.push({
            queueItem: item,
            local: localTask || null,
            remote: remoteTask,
          });
        }
      }

      setConflicts(conflictedItems);
      setIsVisible(conflictedItems.length > 0);
    } catch (error) {
      console.error("Failed to load conflicts", error);
    }
  }, []);

  useEffect(() => {
    loadConflicts();

    const unsubscribe = syncQueue.addEventListener((event) => {
      if (event.type === "conflict") {
        loadConflicts();
      }
    });

    return unsubscribe;
  }, [loadConflicts]);

  const resolveWithServer = async (conflict: ConflictedTask) => {
    try {
      if (!conflict.remote) {
        await indexedDB.removeItem("tasks", conflict.queueItem.entityId);
      } else {
        await indexedDB.setItem("tasks", conflict.queueItem.entityId, conflict.remote);
      }

      await indexedDB.removeItem("syncQueue", conflict.queueItem.id);
      await refreshFromServer();
      await loadConflicts();
    } catch (error) {
      console.error("Failed to resolve with server", error);
    }
  };

  const resolveWithLocal = async (conflict: ConflictedTask) => {
    try {
      if (conflict.local) {
        const updated: SyncQueueItem = {
          ...conflict.queueItem,
          status: SyncQueueItemStatus.Pending,
          attempts: 0,
          lastError: undefined,
          updatedAt: new Date().toISOString(),
        };
        await indexedDB.setItem("syncQueue", conflict.queueItem.id, updated);
      } else {
        await indexedDB.removeItem("syncQueue", conflict.queueItem.id);
      }

      await loadConflicts();
    } catch (error) {
      console.error("Failed to resolve with local", error);
    }
  };

  const resolveWithMerge = async (conflict: ConflictedTask) => {
    try {
      if (!conflict.local || !conflict.remote) {
        return;
      }

      const merged: Task = {
        ...conflict.remote,
        title: conflict.local.title || conflict.remote.title,
        description: conflict.local.description || conflict.remote.description,
        status: conflict.local.status,
        priority: conflict.local.priority,
      };

      await indexedDB.setItem("tasks", conflict.queueItem.entityId, merged);

      const updated: SyncQueueItem = {
        ...conflict.queueItem,
        status: SyncQueueItemStatus.Pending,
        payload: merged as unknown as Record<string, unknown>,
        attempts: 0,
        lastError: undefined,
        updatedAt: new Date().toISOString(),
      };
      await indexedDB.setItem("syncQueue", conflict.queueItem.id, updated);

      await loadConflicts();
    } catch (error) {
      console.error("Failed to merge conflict", error);
    }
  };

  const dismissConflict = async (conflict: ConflictedTask) => {
    try {
      await indexedDB.removeItem("syncQueue", conflict.queueItem.id);
      await loadConflicts();
    } catch (error) {
      console.error("Failed to dismiss conflict", error);
    }
  };

  if (!isVisible || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-purple-600">⚡</span>
            Sync Conflicts Detected
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The following items have conflicting changes. Choose how to resolve each conflict.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflicts.map((conflict) => (
            <div key={conflict.queueItem.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">
                    Task: {conflict.local?.title || conflict.remote?.title || "Unknown"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last-write-wins context: Both local and server versions were modified
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium text-blue-600">Your Changes (Local)</div>
                  {conflict.local ? (
                    <div className="text-xs space-y-1">
                      <div>Title: {conflict.local.title}</div>
                      <div>Status: {conflict.local.status}</div>
                      <div>Priority: {conflict.local.priority}</div>
                      {conflict.local.updatedAt && (
                        <div className="text-muted-foreground">
                          Updated: {new Date(conflict.local.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Deleted locally</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-green-600">Server Version</div>
                  {conflict.remote ? (
                    <div className="text-xs space-y-1">
                      <div>Title: {conflict.remote.title}</div>
                      <div>Status: {conflict.remote.status}</div>
                      <div>Priority: {conflict.remote.priority}</div>
                      {conflict.remote.updatedAt && (
                        <div className="text-muted-foreground">
                          Updated: {new Date(conflict.remote.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Deleted on server</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveWithLocal(conflict)}
                  className="flex-1"
                >
                  Keep Local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveWithServer(conflict)}
                  className="flex-1"
                >
                  Keep Server
                </Button>
                {conflict.local && conflict.remote && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => resolveWithMerge(conflict)}
                    className="flex-1"
                  >
                    Merge
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissConflict(conflict)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
