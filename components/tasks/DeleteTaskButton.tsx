"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function DeleteTaskButton({
  taskId,
  redirectTo,
  className,
  ...props
}: {
  taskId: string;
  redirectTo?: string;
} & ButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const { deleteTask, undoDelete } = useOfflineTasks();
  const { isOnline } = useNetworkStatus();
  const router = useRouter();

  async function handleDelete() {
    if (loading) return;
    const ok = window.confirm("Are you sure you want to delete this task? You'll have 5 seconds to undo.");
    if (!ok) return;

    try {
      setLoading(true);
      await deleteTask(taskId);
      setShowUndo(true);

      // Hide undo after 5 seconds
      setTimeout(() => {
        setShowUndo(false);
        // Only navigate when online
        if (redirectTo && isOnline) {
          router.push(redirectTo);
        }
      }, 5000);
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to delete task";
      if (!isOnline) {
        alert(`${message} - Changes will be synced when you're back online.`);
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    setLoading(true);
    try {
      const undone = await undoDelete(taskId);
      if (undone) {
        setShowUndo(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (showUndo) {
    return (
      <Button variant="secondary" onClick={handleUndo} disabled={loading} className={className} {...props}>
        Undo
      </Button>
    );
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading} className={className} {...props}>
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
