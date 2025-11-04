// Central app types aligned with Mongoose models and API JSON shapes

// Keep in sync with models/Task.ts TaskStatus union and API layer
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskDifficulty = "easy" | "medium" | "hard";

// JSON shape returned by our Tasks API (Mongoose document serialized to JSON)
export type Task = {
  _id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number; // 1..5
  difficulty: TaskDifficulty;
  tags: string[];
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// JSON shape returned by a User document (if/when exposed via API)
export type User = {
  _id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  theme: string;
  unlockedThemes: string[];
  lastActiveAt?: string;
  lastStreakDate?: string;
  xpMultiplier: number;
  preferences: {
    leaderboardOptIn: boolean;
    anonymousMode: boolean;
    timezone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

// Export gamification types
export * from "./gamification";
