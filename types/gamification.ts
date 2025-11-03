// Gamification types for client consumption

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export type GamificationPreferences = {
  leaderboardOptIn: boolean;
  anonymousMode: boolean;
  timezone?: string;
};

export type Achievement = {
  _id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: AchievementRarity;
  themeUnlock?: string;
  criteria: {
    type: string;
    target?: number;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type UserAchievement = {
  _id: string;
  userId: string;
  achievementKey: string;
  unlockedAt: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StreakLog = {
  _id: string;
  userId: string;
  date: string;
  taskCount: number;
  streakLength: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ActivityLog = {
  _id: string;
  userId: string;
  activityType: string;
  metadata?: {
    [key: string]: any;
  };
  xpEarned: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserGamificationStats = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  theme: string;
  unlockedThemes: string[];
  xpMultiplier: number;
  lastActiveAt?: string;
  lastStreakDate?: string;
  preferences: GamificationPreferences;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  level: number;
  xp: number;
  rank: number;
  isAnonymous: boolean;
};
