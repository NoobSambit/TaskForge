import { Schema, Model, models, model } from "mongoose";

export interface IActivityLog {
  userId: string;
  activityType: string;
  taskId?: string;
  metadata?: {
    [key: string]: any;
  };
  xpEarned: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, required: true, index: true },
    activityType: { type: String, required: true, index: true },
    taskId: { type: String, sparse: true },
    metadata: { type: Schema.Types.Mixed },
    xpEarned: { type: Number, default: 0 },
    date: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

// Compound index for querying user activities by date
ActivityLogSchema.index({ userId: 1, date: -1 });
// Index for querying specific activity types for a user
ActivityLogSchema.index({ userId: 1, activityType: 1, date: -1 });
// Unique index to prevent duplicate XP awards for the same task completion
ActivityLogSchema.index({ userId: 1, taskId: 1, activityType: 1 }, { unique: true, sparse: true });

const ActivityLog = (models.ActivityLog as Model<IActivityLog>) || model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
