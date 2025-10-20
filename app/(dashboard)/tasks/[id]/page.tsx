import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import CompleteTaskButton from "@/components/tasks/CompleteTaskButton";
import DeleteTaskButton from "@/components/tasks/DeleteTaskButton";

async function getTask(id: string) {
  const hdrs = headers();
  const host = hdrs.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const base = host ? `${protocol}://${host}` : "";
  const res = await fetch(`${base}/api/tasks/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  if (!task) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Details</h1>
          <p className="text-sm text-muted-foreground">View information about this task.</p>
        </div>
        <div className="flex items-center gap-2">
          <CompleteTaskButton taskId={params.id} currentStatus={task.status} />
          <Link href={`/tasks/${params.id}/edit`} className="inline-flex">
            <Button variant="outline">Edit</Button>
          </Link>
          <DeleteTaskButton taskId={params.id} redirectTo="/dashboard" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle>{task.title}</CardTitle>
            <span className="inline-flex shrink-0 items-center rounded bg-accent px-2 py-1 text-xs text-accent-foreground">P{task.priority}</span>
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
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back to tasks</Link>
      </div>
    </section>
  );
}
