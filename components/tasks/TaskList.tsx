"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TaskCard from "./TaskCard";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";

export default function TaskList() {
  const { tasks: allTasks, isLoading, isHydrated } = useOfflineTasks();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");

  // Apply client-side filtering
  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    // Filter by search (title)
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter((task) => task.status === status);
    }

    // Filter by priority
    if (priority) {
      filtered = filtered.filter((task) => String(task.priority) === priority);
    }

    return filtered;
  }, [allTasks, search, status, priority]);

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

      {!isHydrated || isLoading ? (
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No tasks found.</div>
      )}
    </section>
  );
}
