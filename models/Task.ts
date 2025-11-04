import { Schema, Model, models, model } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskDifficulty = "easy" | "medium" | "hard";

export interface ITask {
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number; // 1 (lowest) .. 5 (highest)
  difficulty: TaskDifficulty;
  tags: string[];
  completedAt?: Date | null;
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
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 20; // Max 20 tags
        },
        message: "Cannot have more than 20 tags",
      },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Useful indexes to support common query patterns
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: -1, createdAt: -1 });
TaskSchema.index({ userId: 1, title: 1 });
TaskSchema.index({ userId: 1, completedAt: -1 });
TaskSchema.index({ userId: 1, tags: 1 });

// Pre-save hook to automatically set/clear completedAt based on status
TaskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "done" && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== "done" && this.completedAt) {
      this.completedAt = null;
    }
  }
  next();
});

// Pre-update hook for findOneAndUpdate
TaskSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as any;
  
  if (update && update.status) {
    if (update.status === "done" && !update.completedAt) {
      update.completedAt = new Date();
    } else if (update.status !== "done") {
      update.completedAt = null;
    }
  }
  
  next();
});

const Task = (models.Task as Model<ITask>) || model<ITask>("Task", TaskSchema);

export default Task;
