"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CompleteTaskButton from "./CompleteTaskButton";
import DeleteTaskButton from "./DeleteTaskButton";
import type { Task } from "@/types";

export default function TaskCard({ task, onDeleted, onUpdated }: { task: Task; onDeleted?: (id: string) => void; onUpdated?: (task: Task) => void }) {
  const statusLabel = useMemo(() => {
    switch (task.status) {
      case "in_progress":
        return "In progress";
      case "done":
        return "Done";
      default:
        return "To do";
    }
  }, [task.status]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
          <span className="inline-flex shrink-0 items-center rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
            P{task.priority}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{statusLabel}</div>
      </CardHeader>
      {task.description ? (
        <CardContent className="pt-0">
          <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{task.description}</p>
        </CardContent>
      ) : null}
      <CardFooter className="mt-auto gap-2">
        <Link href={`/tasks/${task._id}`} className="inline-flex">
          <Button variant="secondary" size="sm">View</Button>
        </Link>
        <Link href={`/tasks/${task._id}/edit`} className="inline-flex">
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
        <CompleteTaskButton taskId={task._id} currentStatus={task.status} size="sm" onUpdated={onUpdated} />
        <DeleteTaskButton taskId={task._id} size="sm" onDeleted={onDeleted} />
      </CardFooter>
    </Card>
  );
}
