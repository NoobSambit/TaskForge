import { Schema, Model, models, model, Types } from "mongoose";

export type TaskPriority = "low" | "medium" | "high";

export interface ITask {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  { timestamps: true }
);

// Compound indexes to support common query patterns
TaskSchema.index({ userId: 1, completed: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, priority: 1 });

const Task = (models.Task as Model<ITask>) || model<ITask>("Task", TaskSchema);

export default Task;
