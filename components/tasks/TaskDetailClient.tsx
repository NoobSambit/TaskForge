"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CompleteTaskButton from "./CompleteTaskButton";
import DeleteTaskButton from "./DeleteTaskButton";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Task } from "@/types";

type TaskDetailClientProps = {
  taskId: string;
  serverTask?: Task | null;
};

export default function TaskDetailClient({ taskId, serverTask }: TaskDetailClientProps) {
  const { tasks, isLoading, getTaskState } = useOfflineTasks();
  const { retryFailed } = useSyncStatus();
  const { isOnline } = useNetworkStatus();
  const [task, setTask] = useState<Task | null>(serverTask || null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Use cached task from offline hook
  useEffect(() => {
    const cachedTask = tasks.find((t) => t._id === taskId);
    if (cachedTask) {
      setTask(cachedTask);
    } else if (!isLoading && !cachedTask && !task) {
      // No cached task and not loading - likely a new task or error
      setTask(null);
    }
  }, [tasks, taskId, isLoading, task]);

  const taskState = task ? getTaskState(task._id) : null;

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

  if (isLoading && !task) {
    return (
      <section className="space-y-6">
        <div className="text-sm text-muted-foreground">Loading task...</div>
      </section>
    );
  }

  if (!task) {
    return (
      <section className="space-y-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Task not found. {!isOnline && "You may need to be online to view this task."}
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Back to tasks
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Details</h1>
          <p className="text-sm text-muted-foreground">View information about this task.</p>
        </div>
        <div className="flex items-center gap-2">
          <CompleteTaskButton taskId={task._id} currentStatus={task.status} />
          <Link href={`/tasks/${task._id}/edit`} className="inline-flex">
            <Button variant="outline">Edit</Button>
          </Link>
          <DeleteTaskButton taskId={task._id} redirectTo="/dashboard" />
        </div>
      </div>

      {(taskState?.isFailed || taskState?.isConflict) && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <span className="flex-1 text-sm text-red-800 dark:text-red-200">
            ⚠️ {taskState.lastError || "This task has sync issues"}
          </span>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry Sync"}
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle>{task.title}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              <span className="inline-flex items-center rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
                P{task.priority}
              </span>
              {taskState?.isPending && (
                <span className="inline-flex items-center rounded bg-blue-500 px-2 py-1 text-xs text-white" title="Syncing...">
                  ⟳
                </span>
              )}
              {taskState?.isFailed && (
                <span className="inline-flex items-center rounded bg-red-500 px-2 py-1 text-xs text-white" title={taskState.lastError || "Sync failed"}>
                  ✕
                </span>
              )}
              {taskState?.isConflict && (
                <span className="inline-flex items-center rounded bg-orange-500 px-2 py-1 text-xs text-white" title="Conflict detected">
                  ⚠
                </span>
              )}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {task.status === "in_progress" ? "In progress" : task.status === "done" ? "Done" : "To do"}
          </div>
        </CardHeader>
        {task.description ? (
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-line">{task.description}</p>
            </div>
          </CardContent>
        ) : null}
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>Created: {task.createdAt ? new Date(task.createdAt).toLocaleString() : ""}</span>
          <span>Updated: {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : ""}</span>
        </CardFooter>
      </Card>

      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Back to tasks
        </Link>
      </div>
    </section>
  );
}
