"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Task } from "@/types";

export default function CompleteTaskButton({
  taskId,
  currentStatus,
  className,
  ...props
}: {
  taskId: string;
  currentStatus: Task["status"];
} & ButtonProps) {
  const [loading, setLoading] = useState(false);
  const { updateTask } = useOfflineTasks();
  const { isOnline } = useNetworkStatus();

  const isDone = currentStatus === "done";
  const nextStatus: Task["status"] = isDone ? "todo" : "done";

  async function handleClick() {
    if (loading) return;
    try {
      setLoading(true);
      await updateTask(taskId, { status: nextStatus });
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to update task";
      if (!isOnline) {
        alert(`${message} - Changes will be synced when you're back online.`);
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isDone ? "secondary" : "default"}
      onClick={handleClick}
      disabled={loading}
      className={className}
      {...props}
    >
      {loading ? (isDone ? "Reopening..." : "Completing...") : isDone ? "Reopen" : "Complete"}
    </Button>
  );
}
