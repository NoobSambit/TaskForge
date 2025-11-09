import { Schema, Model, models, model } from "mongoose";

export interface IGamificationPreferences {
  leaderboardOptIn: boolean;
  anonymousMode: boolean;
  timezone?: string;
  nextLevelAt?: number;
}

export interface IUser {
  name: string;
  email: string;
  // Gamification fields
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  theme: string;
  unlockedThemes: string[];
  lastActiveAt?: Date;
  lastStreakDate?: Date;
  xpMultiplier: number;
  preferences: IGamificationPreferences;
  // Nested structure for streaks (as used in gamification system)
  streaks?: {
    current: number;
    longest: number;
    lastDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    // Gamification fields
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1, index: true },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    theme: { type: String, default: "default", index: true },
    unlockedThemes: { type: [String], default: () => ["default", "dark"] },
    lastActiveAt: { type: Date },
    lastStreakDate: { type: Date },
    xpMultiplier: { type: Number, default: 1.0, min: 0 },
    streaks: {
      current: { type: Number, default: 0, min: 0 },
      longest: { type: Number, default: 0, min: 0 },
      lastDate: { type: Date },
    },
    preferences: {
      type: {
        leaderboardOptIn: { type: Boolean, default: true, index: true },
        anonymousMode: { type: Boolean, default: false },
        timezone: { type: String },
        nextLevelAt: { type: Number },
      },
      default: () => ({
        leaderboardOptIn: true,
        anonymousMode: false,
      }),
    },
  },
  { timestamps: true }
);

const User = (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

/**
 * Get user by ID with lean query
 */
export async function getUserById(userId: string) {
  return await User.findById(userId).lean();
}

/**
 * Update user gamification fields
 */
export async function updateUserGamification(
  userId: string,
  updates: Partial<{
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    theme: string;
    unlockedThemes: string[];
    lastActiveAt: Date;
    lastStreakDate: Date;
    xpMultiplier: number;
    "preferences.nextLevelAt": number;
  }>
) {
  return await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, lean: true }
  );
}

/**
 * Increment user XP atomically
 */
export async function incrementUserXp(
  userId: string,
  amount: number
) {
  return await User.findByIdAndUpdate(
    userId,
    { $inc: { xp: amount } },
    { new: true, lean: true }
  );
}

export default User;
