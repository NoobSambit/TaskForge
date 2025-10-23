"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CompleteTaskButton from "./CompleteTaskButton";
import DeleteTaskButton from "./DeleteTaskButton";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Task } from "@/types";

export default function TaskCard({ task }: { task: Task }) {
  const { getTaskState } = useOfflineTasks();
  const { retryFailed } = useSyncStatus();
  const { isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);
  const taskState = getTaskState(task._id);

  const handleRetry = async () => {
    if (!isOnline) {
      alert("Cannot retry while offline. Please connect to the internet first.");
      return;
    }

    setIsRetrying(true);
    try {
      await retryFailed();
    } catch (error) {
      console.error("Failed to retry:", error);
      alert("Failed to retry sync. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (task.status) {
      case "in_progress":
        return "In progress";
      case "done":
        return "Done";
      default:
        return "To do";
    }
  }, [task.status]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <span className="inline-flex items-center rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
              P{task.priority}
            </span>
            {taskState.isPending && (
              <span className="inline-flex items-center rounded bg-blue-500 px-2 py-1 text-xs text-white" title="Syncing...">
                ⟳
              </span>
            )}
            {taskState.isFailed && (
              <span className="inline-flex items-center rounded bg-red-500 px-2 py-1 text-xs text-white" title={taskState.lastError || "Sync failed"}>
                ✕
              </span>
            )}
            {taskState.isConflict && (
              <span className="inline-flex items-center rounded bg-orange-500 px-2 py-1 text-xs text-white" title="Conflict detected">
                ⚠
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{statusLabel}</div>
      </CardHeader>
      {task.description ? (
        <CardContent className="pt-0">
          <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{task.description}</p>
        </CardContent>
      ) : null}
      <CardFooter className="mt-auto flex-col gap-2">
        {(taskState.isFailed || taskState.isConflict) && (
          <div className="flex w-full items-center gap-2 rounded bg-red-50 p-2 dark:bg-red-950">
            <span className="flex-1 text-xs text-red-800 dark:text-red-200">
              {taskState.lastError || "Sync failed"}
            </span>
            {isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-7 text-xs"
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </Button>
            )}
          </div>
        )}
        <div className="flex w-full gap-2">
          <Link href={`/tasks/${task._id}`} className="inline-flex">
            <Button variant="secondary" size="sm">View</Button>
          </Link>
          <Link href={`/tasks/${task._id}/edit`} className="inline-flex">
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <CompleteTaskButton taskId={task._id} currentStatus={task.status} size="sm" />
          <DeleteTaskButton taskId={task._id} size="sm" />
        </div>
      </CardFooter>
    </Card>
  );
}
