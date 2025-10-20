"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

export default function DeleteTaskButton({
  taskId,
  onDeleted,
  redirectTo,
  className,
  ...props
}: {
  taskId: string;
  onDeleted?: (id: string) => void;
  redirectTo?: string;
} & ButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (loading) return;
    const ok = window.confirm("Are you sure you want to delete this task? This action cannot be undone.");
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to delete (status ${res.status})`);
      }
      onDeleted?.(taskId);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading} className={className} {...props}>
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
