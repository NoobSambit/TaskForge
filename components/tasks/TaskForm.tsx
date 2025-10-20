"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type TaskFormValues = {
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: number;
};

type ZodErrorFlatten = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

export default function TaskForm({
  mode,
  taskId,
  initialValues,
}: {
  mode: "create" | "edit";
  taskId?: string;
  initialValues?: Partial<TaskFormValues>;
}) {
  const router = useRouter();

  const [values, setValues] = useState<TaskFormValues>({
    title: "",
    description: "",
    status: "todo",
    priority: 3,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ZodErrorFlatten>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({
        ...prev,
        ...initialValues,
        priority: Number(initialValues.priority ?? prev.priority),
        status: (initialValues.status as any) ?? prev.status,
      }));
    }
  }, [initialValues]);

  const titleError = errors.fieldErrors?.title?.[0];
  const descError = errors.fieldErrors?.description?.[0];
  const statusError = errors.fieldErrors?.status?.[0];
  const priorityError = errors.fieldErrors?.priority?.[0];
  const formError = useMemo(() => errors.formErrors?.[0] ?? generalError, [errors.formErrors, generalError]);

  function update<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setGeneralError(null);
    setErrors({});

    try {
      const endpoint = mode === "create" ? "/api/tasks" : `/api/tasks/${taskId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && data?.details) {
          setErrors(data.details as ZodErrorFlatten);
        } else {
          setGeneralError(data?.error || `Request failed (status ${res.status})`);
        }
        return;
      }

      const data = await res.json();
      const id = data?._id as string | undefined;
      router.refresh();
      if (id) {
        router.push(`/tasks/${id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setGeneralError((err as Error).message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="What needs to be done?"
          required
        />
        {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Additional details (optional)"
          rows={5}
        />
        {descError ? <p className="text-xs text-destructive">{descError}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={values.status}
            onChange={(e) => update("status", e.target.value as any)}
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
          {statusError ? <p className="text-xs text-destructive">{statusError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            id="priority"
            value={String(values.priority)}
            onChange={(e) => update("priority", Number(e.target.value))}
          >
            <option value="1">1 - Lowest</option>
            <option value="2">2</option>
            <option value="3">3 - Normal</option>
            <option value="4">4</option>
            <option value="5">5 - Highest</option>
          </Select>
          {priorityError ? <p className="text-xs text-destructive">{priorityError}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create task" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
