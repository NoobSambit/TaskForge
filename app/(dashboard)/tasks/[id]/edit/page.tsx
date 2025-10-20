import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import TaskForm from "@/components/tasks/TaskForm";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Edit Task",
};

async function getTask(id: string) {
  const hdrs = headers();
  const host = hdrs.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = host ? `${protocol}://${host}` : "";
  const res = await fetch(`${base}/api/tasks/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  if (!task) notFound();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Task</h1>
          <p className="text-sm text-muted-foreground">Update task details.</p>
        </div>
        <Link href={`/tasks/${params.id}`} className="inline-flex">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <TaskForm
        mode="edit"
        taskId={params.id}
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
