"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TaskForm from "./TaskForm";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Task } from "@/types";

type TaskEditClientProps = {
  taskId: string;
  serverTask?: Task | null;
};

export default function TaskEditClient({ taskId, serverTask }: TaskEditClientProps) {
  const { tasks, isLoading } = useOfflineTasks();
  const { isOnline } = useNetworkStatus();
  const [task, setTask] = useState<Task | null>(serverTask || null);

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
          Task not found. {!isOnline && "You may need to be online to edit this task."}
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
          <h1 className="text-2xl font-semibold tracking-tight">Edit Task</h1>
          <p className="text-sm text-muted-foreground">Update task details.</p>
        </div>
        <Link href={`/tasks/${taskId}`} className="inline-flex">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <TaskForm
        mode="edit"
        taskId={taskId}
        initialValues={{
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority,
        }}
      />
    </section>
  );
}
