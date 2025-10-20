import type { Metadata } from "next";
import TaskForm from "@/components/tasks/TaskForm";

export const metadata: Metadata = {
  title: "New Task",
};

export default function NewTaskPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Task</h1>
        <p className="text-sm text-muted-foreground">Create a new task.</p>
      </div>
      <TaskForm mode="create" />
    </section>
  );
}
