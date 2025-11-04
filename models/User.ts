import { Schema, Model, models, model } from "mongoose";

export interface IGamificationPreferences {
  leaderboardOptIn: boolean;
  anonymousMode: boolean;
  timezone?: string;
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
    theme: { type: String, default: "default" },
    unlockedThemes: { type: [String], default: ["default"] },
    lastActiveAt: { type: Date },
    lastStreakDate: { type: Date },
    xpMultiplier: { type: Number, default: 1.0, min: 0 },
    preferences: {
      type: {
        leaderboardOptIn: { type: Boolean, default: true, index: true },
        anonymousMode: { type: Boolean, default: false },
        timezone: { type: String },
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

export default User;
