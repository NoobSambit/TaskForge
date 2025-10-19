import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
});

export type TaskInput = z.input<typeof taskSchema>;
