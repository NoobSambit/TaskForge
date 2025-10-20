"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TaskCard from "./TaskCard";
import type { Task } from "@/types";

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    return p.toString();
  }, [search, status, priority]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = query ? `/api/tasks?${query}` : "/api/tasks";
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to fetch tasks (status ${res.status})`);
        }
        const data = (await res.json()) as Task[];
        if (!ignore) setTasks(data);
      } catch (err) {
        if ((err as any).name === "AbortError") return;
        console.error(err);
        if (!ignore) setError((err as Error).message || "Failed to load tasks");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [query]);

  function handleDeleted(id: string) {
    setTasks((prev) => (prev ? prev.filter((t) => t._id !== id) : prev));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="sm:w-40">
            <option value="">All priorities</option>
            <option value="5">5 - Highest</option>
            <option value="4">4</option>
            <option value="3">3 - Normal</option>
            <option value="2">2</option>
            <option value="1">1 - Lowest</option>
          </Select>
        </div>
        <Link href="/tasks/new" className="inline-flex">
          <Button>Create task</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : tasks && tasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onDeleted={handleDeleted} />)
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No tasks found.</div>
      )}
    </section>
  );
}
