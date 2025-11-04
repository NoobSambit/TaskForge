"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineTasks } from "@/hooks/useOfflineTasks";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import SmartTaskInput from "./SmartTaskInput";
import { AiParseResult } from "@/lib/ai";

export type TaskFormValues = {
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
};

type ZodErrorFlatten = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

type AIFilledFields = {
  title?: boolean;
  description?: boolean;
  priority?: boolean;
};

export default function TaskForm({
  mode,
  taskId,
  initialValues,
  enableSmartInput = true,
}: {
  mode: "create" | "edit";
  taskId?: string;
  initialValues?: Partial<TaskFormValues>;
  enableSmartInput?: boolean;
}) {
  const router = useRouter();
  const { createTask, updateTask } = useOfflineTasks();
  const { isOnline } = useNetworkStatus();

  const [values, setValues] = useState<TaskFormValues>({
    title: "",
    description: "",
    status: "todo",
    priority: 3,
    difficulty: "medium",
    tags: [],
  });

  const [smartInputValue, setSmartInputValue] = useState("");
  const [aiFilledFields, setAiFilledFields] = useState<AIFilledFields>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ZodErrorFlatten>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({
        ...prev,
        ...initialValues,
        priority: Number(initialValues.priority ?? prev.priority),
        status: (initialValues.status as any) ?? prev.status,
        difficulty: (initialValues.difficulty as any) ?? prev.difficulty,
        tags: Array.isArray(initialValues.tags) ? initialValues.tags : prev.tags,
      }));
    }
  }, [initialValues]);

  const titleError = errors.fieldErrors?.title?.[0];
  const descError = errors.fieldErrors?.description?.[0];
  const statusError = errors.fieldErrors?.status?.[0];
  const priorityError = errors.fieldErrors?.priority?.[0];
  const difficultyError = errors.fieldErrors?.difficulty?.[0];
  const tagsError = errors.fieldErrors?.tags?.[0];
  const formError = useMemo(() => errors.formErrors?.[0] ?? generalError, [errors.formErrors, generalError]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !values.tags.includes(trimmed) && values.tags.length < 20) {
      setValues((v) => ({ ...v, tags: [...v.tags, trimmed] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  function update<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Clear AI badge when user manually edits
    if (aiFilledFields[key as keyof AIFilledFields]) {
      setAiFilledFields((prev) => ({ ...prev, [key]: false }));
    }
  }

  const handleAISuggestionAccepted = (result: AiParseResult) => {
    const newAiFields: AIFilledFields = {};
    
    if (result.title) {
      setValues((v) => ({ ...v, title: result.title }));
      newAiFields.title = true;
    }
    
    if (result.description) {
      setValues((v) => ({ ...v, description: result.description }));
      newAiFields.description = true;
    }
    
    if (result.priority !== undefined) {
      setValues((v) => ({ ...v, priority: result.priority! }));
      newAiFields.priority = true;
    }
    
    setAiFilledFields(newAiFields);
    setSmartInputValue(""); // Clear the smart input after accepting
  };

  const handleEnterCreate = () => {
    if (mode === "create" && values.title.trim()) {
      // Trigger form submission
      const form = document.querySelector("form");
      if (form) {
        form.requestSubmit();
      }
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setGeneralError(null);
    setErrors({});

    try {
      if (mode === "create") {
        // Create new task
        const task = await createTask({
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          difficulty: values.difficulty,
          tags: values.tags,
          userId: "", // Will be set by the API
        });

        // Only navigate when online to avoid crashes
        if (isOnline) {
          router.push(`/tasks/${task._id}`);
        } else {
          // Stay on page with success message when offline
          alert("Task created! It will be synced when you're back online.");
          router.push("/dashboard");
        }
      } else if (taskId) {
        // Update existing task
        await updateTask(taskId, {
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          difficulty: values.difficulty,
          tags: values.tags,
        });

        // Only navigate when online to avoid crashes
        if (isOnline) {
          router.push(`/tasks/${taskId}`);
        } else {
          // Stay on page with success message when offline
          alert("Task updated! Changes will be synced when you're back online.");
          router.back();
        }
      }
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Something went wrong";
      if (!isOnline) {
        setGeneralError(`${message} - Changes will be synced when you're back online.`);
      } else {
        setGeneralError(message);
      }
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

      {mode === "create" && enableSmartInput && (
        <SmartTaskInput
          value={smartInputValue}
          onChange={setSmartInputValue}
          onSuggestionAccepted={handleAISuggestionAccepted}
          onEnterCreate={handleEnterCreate}
          disabled={submitting}
          enableAI={isOnline}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2">
          Title
          {aiFilledFields.title && (
            <Badge variant="ai" className="text-xs">
              AI
            </Badge>
          )}
        </Label>
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
        <Label htmlFor="description" className="flex items-center gap-2">
          Description
          {aiFilledFields.description && (
            <Badge variant="ai" className="text-xs">
              AI
            </Badge>
          )}
        </Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Additional details (optional)"
          rows={5}
        />
        {descError ? <p className="text-xs text-destructive">{descError}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Label htmlFor="priority" className="flex items-center gap-2">
            Priority
            {aiFilledFields.priority && (
              <Badge variant="ai" className="text-xs">
                AI
              </Badge>
            )}
          </Label>
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

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            id="difficulty"
            value={values.difficulty}
            onChange={(e) => update("difficulty", e.target.value as any)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          {difficultyError ? <p className="text-xs text-destructive">{difficultyError}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add a tag..."
            disabled={values.tags.length >= 20}
          />
          <Button type="button" onClick={handleAddTag} disabled={!tagInput.trim() || values.tags.length >= 20}>
            Add
          </Button>
        </div>
        {values.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {values.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        {tagsError ? <p className="text-xs text-destructive">{tagsError}</p> : null}
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
