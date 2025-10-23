import { headers } from "next/headers";
import TaskDetailClient from "@/components/tasks/TaskDetailClient";

async function getTask(id: string) {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const base = host ? `${protocol}://${host}` : "";
    const res = await fetch(`${base}/api/tasks/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch task on server:", error);
    return null;
  }
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params for Next.js 15
  const { id } = await params;
  
  // Try to fetch from server, but don't fail if it's not available
  const serverTask = await getTask(id);

  // Let the client component handle the task display with offline cache fallback
  return <TaskDetailClient taskId={id} serverTask={serverTask} />;
}
