import { Schema, Model, models, model } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface ITask {
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number; // 1 (lowest) .. 5 (highest)
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo", index: true },
    priority: { type: Number, min: 1, max: 5, default: 3, index: true },
  },
  { timestamps: true }
);

// Useful indexes to support common query patterns
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: -1, createdAt: -1 });
TaskSchema.index({ userId: 1, title: 1 });

const Task = (models.Task as Model<ITask>) || model<ITask>("Task", TaskSchema);

export default Task;
