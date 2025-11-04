import { Schema, Model, models, model } from "mongoose";

export interface IStreakLog {
  userId: string;
  date: Date;
  taskCount: number;
  streakLength: number;
  createdAt: Date;
  updatedAt: Date;
}

const StreakLogSchema = new Schema<IStreakLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    taskCount: { type: Number, required: true, min: 0 },
    streakLength: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Compound index for querying user streaks by date
StreakLogSchema.index({ userId: 1, date: -1 });
// Ensure one entry per user per day
StreakLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const StreakLog = (models.StreakLog as Model<IStreakLog>) || model<IStreakLog>("StreakLog", StreakLogSchema);

export default StreakLog;
