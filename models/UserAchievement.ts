import { Schema, Model, models, model } from "mongoose";

export interface IUserAchievement {
  userId: string;
  achievementKey: string;
  unlockedAt: Date;
  progress?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: { type: String, required: true, index: true },
    achievementKey: { type: String, required: true, index: true },
    unlockedAt: { type: Date, required: true },
    progress: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Compound index to ensure a user can only unlock an achievement once
UserAchievementSchema.index({ userId: 1, achievementKey: 1 }, { unique: true });
// Index for querying user's achievements sorted by unlock date
UserAchievementSchema.index({ userId: 1, unlockedAt: -1 });

const UserAchievement = (models.UserAchievement as Model<IUserAchievement>) || model<IUserAchievement>("UserAchievement", UserAchievementSchema);

export default UserAchievement;
