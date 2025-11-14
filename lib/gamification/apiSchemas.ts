/**
 * Zod schemas for gamification API response validation
 * 
 * These schemas define the contracts for API responses and can be used
 * for both runtime validation and TypeScript type generation.
 */

import { z } from "zod";

/**
 * Base user gamification data
 */
export const UserGamificationSchema = z.object({
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  theme: z.string(),
  unlockedThemes: z.array(z.string()),
  xpMultiplier: z.number().min(0),
  preferences: z.object({
    leaderboardOptIn: z.boolean(),
    anonymousMode: z.boolean(),
    timezone: z.string().optional(),
    nextLevelAt: z.number().optional(),
  }),
});

/**
 * Streak information
 */
export const StreakInfoSchema = z.object({
  current: z.number().int().min(0),
  longest: z.number().int().min(0),
  lastDate: z.string().datetime().optional(),
  history: z.array(z.object({
    date: z.string().datetime(),
    count: z.number().int().min(0),
  })),
});

/**
 * Achievement information
 */
export const AchievementSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  category: z.string(),
  xpReward: z.number().int().min(0),
  themeUnlock: z.string().optional(),
});

/**
 * User achievement with unlock information
 */
export const UserAchievementSchema = AchievementSchema.extend({
  unlockedAt: z.string().datetime(),
  progress: z.number().min(0).max(1).optional(), // 0-1 for partial progress
  isUnlocked: z.boolean(),
});

/**
 * Theme information
 */
export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredLevel: z.number().int().min(1),
  isUnlocked: z.boolean(),
  isEquipped: z.boolean(),
  previewColors: z.record(z.string()),
});

/**
 * Activity log entry
 */
export const ActivityLogSchema = z.object({
  id: z.string(),
  activityType: z.enum([
    "task_completed", 
    "level_up", 
    "achievement_unlocked", 
    "streak_updated",
    "theme_unlocked"
  ]),
  description: z.string(),
  xpChange: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
});

/**
 * XP calculation breakdown
 */
export const XpRuleSchema = z.object({
  key: z.string(),
  value: z.number(),
  description: z.string(),
});

export const XpComputationSchema = z.object({
  delta: z.number().int(),
  appliedRules: z.array(XpRuleSchema),
});

/**
 * Level information
 */
export const LevelInfoSchema = z.object({
  currentLevel: z.number().int().min(1),
  currentXp: z.number().int().min(0),
  xpForCurrentLevel: z.number().int().min(0),
  xpForNextLevel: z.number().int().min(0),
  progress: z.number().min(0).max(1), // 0-1 progress to next level
  levelsToNext: z.number().int().min(0),
  totalXpForNextLevel: z.number().int().min(0),
});

/**
 * API response wrapper schemas
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema,
  message: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

/**
 * Specific endpoint response schemas
 */
export const XpResponseSchema = ApiResponseSchema(z.object({
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  nextLevelAt: z.number().optional(),
  todayXp: z.number().int().min(0),
  totalXp: z.number().int().min(0),
}));

export const LevelResponseSchema = ApiResponseSchema(LevelInfoSchema);

export const StreaksResponseSchema = ApiResponseSchema(StreakInfoSchema);

export const AchievementsResponseSchema = ApiResponseSchema(z.object({
  unlocked: z.array(UserAchievementSchema),
  available: z.array(AchievementSchema), // achievements that can be unlocked
  totalUnlocked: z.number().int().min(0),
  totalAvailable: z.number().int().min(0),
  recentUnlocks: z.array(UserAchievementSchema),
}));

export const ThemesResponseSchema = ApiResponseSchema(z.object({
  themes: z.array(ThemeSchema),
  equipped: z.string(),
  unlockedCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  futureUnlocks: z.array(z.object({
    level: z.number().int().min(1),
    themes: z.array(z.object({
      id: z.string(),
      name: z.string(),
      levelRequired: z.number().int().min(1),
    })),
  })).optional(),
}));

export const ActivityResponseSchema = ApiResponseSchema(z.object({
  activities: z.array(ActivityLogSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
}));

/**
 * Request body schemas for mutations
 */
export const UpdateThemeRequestSchema = z.object({
  themeId: z.string().min(1),
});

export const RecomputeStreakRequestSchema = z.object({
  fromDate: z.string().datetime().optional(),
});

/**
 * Query parameter schemas
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ActivityQuerySchema = PaginationQuerySchema.extend({
  activityType: z.enum([
    "task_completed", 
    "level_up", 
    "achievement_unlocked", 
    "streak_updated",
    "theme_unlocked"
  ]).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const AchievementsQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["all", "unlocked", "available", "locked"]).default("all"),
  category: z.string().optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
});

export const ThemesQuerySchema = z.object({
  status: z.enum(["all", "available", "locked", "future"]).default("all"),
});

/**
 * Export types for use in API routes
 */
export type UserGamification = z.infer<typeof UserGamificationSchema>;
export type StreakInfo = z.infer<typeof StreakInfoSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type UserAchievement = z.infer<typeof UserAchievementSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type XpComputation = z.infer<typeof XpComputationSchema>;
export type LevelInfo = z.infer<typeof LevelInfoSchema>;

export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<T>>>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type XpResponse = z.infer<typeof XpResponseSchema>;
export type LevelResponse = z.infer<typeof LevelResponseSchema>;
export type StreaksResponse = z.infer<typeof StreaksResponseSchema>;
export type AchievementsResponse = z.infer<typeof AchievementsResponseSchema>;
export type ThemesResponse = z.infer<typeof ThemesResponseSchema>;
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;

export type UpdateThemeRequest = z.infer<typeof UpdateThemeRequestSchema>;
export type RecomputeStreakRequest = z.infer<typeof RecomputeStreakRequestSchema>;

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;
export type AchievementsQuery = z.infer<typeof AchievementsQuerySchema>;
export type ThemesQuery = z.infer<typeof ThemesQuerySchema>;