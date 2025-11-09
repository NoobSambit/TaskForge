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

/**
 * Get achievements for a user with optional filtering
 */
export async function getUserAchievements(
  userId: string,
  options: {
    unlockedAfter?: Date;
    limit?: number;
    includeProgress?: boolean;
  } = {}
) {
  const query: any = { userId };
  
  if (options.unlockedAfter) {
    query.unlockedAt = { $gte: options.unlockedAfter };
  }

  const achievements = await UserAchievement
    .find(query)
    .sort({ unlockedAt: -1 })
    .limit(options.limit || 50)
    .lean();

  // Populate achievement details if needed
  const populatedAchievements = achievements.map(ua => ({
    ...ua,
    achievementTitle: ua.achievementKey, // Will be populated from Achievement model in a real implementation
  }));

  return populatedAchievements;
}

/**
 * Get achievement count for a user
 */
export async function getUserAchievementCount(userId: string): Promise<number> {
  return await UserAchievement.countDocuments({ userId });
}

/**
 * Check if user has unlocked a specific achievement
 */
export async function hasUserUnlockedAchievement(
  userId: string,
  achievementKey: string
): Promise<boolean> {
  const achievement = await UserAchievement.findOne({ userId, achievementKey });
  return !!achievement;
}

export default UserAchievement;
