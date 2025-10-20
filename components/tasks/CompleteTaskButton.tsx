"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { Task } from "@/types";

export default function CompleteTaskButton({
  taskId,
  currentStatus,
  onUpdated,
  className,
  ...props
}: {
  taskId: string;
  currentStatus: Task["status"];
  onUpdated?: (task: Task) => void;
} & ButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Task["status"]>(currentStatus);
  const router = useRouter();

  const isDone = status === "done";
  const nextStatus: Task["status"] = isDone ? "todo" : "done";

  async function handleClick() {
    if (loading) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to update (status ${res.status})`);
      }
      const updated = (await res.json()) as Task;
      setStatus(updated.status);
      onUpdated?.(updated);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Failed to update task");
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
