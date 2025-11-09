/**
 * Type definitions for the XP engine
 */

import { TaskDifficulty } from "@/types";

/**
 * All possible XP rule keys that can be applied during calculation.
 * This enum ensures type safety and prevents magic strings.
 */
export type XpRuleKey =
  | "base_xp"
  | "priority_multiplier"
  | "tag_bonus"
  | "streak_multiplier"
  | "early_completion"
  | "late_completion"
  | "early_bird"
  | "night_owl"
  | "weekend_bonus"
  | "user_multiplier"
  | "min_cap"
  | "max_cap"
  | "rounding";

/**
 * Represents a single rule applied during XP calculation.
 * Used for transparency and debugging.
 */
export interface XpRule {
  /** The rule identifier */
  key: XpRuleKey;
  /** The numeric value or multiplier applied */
  value: number;
  /** Human-readable description of what this rule did */
  description: string;
}

/**
 * The result of an XP calculation.
 */
export interface XpComputation {
  /** Final XP amount to award */
  delta: number;
  /** Ordered list of all rules applied during calculation */
  appliedRules: XpRule[];
}

/**
 * Normalized task data required for XP calculation.
 * This interface abstracts away database-specific details.
 */
export interface TaskData {
  /** Task priority (1-5) */
  priority: number;
  /** Task difficulty level */
  difficulty: TaskDifficulty;
  /** Task tags for bonus calculation */
  tags: string[];
  /** When the task was completed (required for XP calculation) */
  completedAt: Date;
  /** When the task was created (for age validation) */
  createdAt: Date;
  /** Optional due date (for early/late calculation) */
  dueDate?: Date | null;
}

/**
 * User context information needed for XP calculation.
 */
export interface UserContext {
  /** User's current XP multiplier (from achievements, etc.) */
  xpMultiplier: number;
  /** Current consecutive days streak */
  currentStreak: number;
  /** Last date counted toward streak (for validation) */
  lastStreakDate?: Date | null;
  /** User ID for logging/tracking */
  userId: string;
}

/**
 * Options for XP calculation behavior.
 */
export interface XpCalculationOptions {
  /** Current time reference (defaults to now, mainly for testing) */
  now?: Date;
  /** Whether to apply daily XP cap (defaults to false) */
  applyDailyCap?: boolean;
  /** XP already earned today (for daily cap calculation) */
  dailyXpEarned?: number;
  /** Whether to validate completion age (defaults to true) */
  validateAge?: boolean;
}

/**
 * Achievement metadata interface
 */
export interface Achievement {
  key: string;
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string;
  xpReward: number;
  themeUnlock?: string;
}

/**
 * Context data for achievement evaluation
 */
export interface AchievementContext {
  /** User ID */
  userId: string;
  /** Current user level */
  currentLevel: number;
  /** Current streak */
  currentStreak: number;
  /** Total tasks completed */
  totalTasksCompleted: number;
  /** Total tasks created */
  totalTasksCreated: number;
  /** High priority tasks completed */
  highPriorityTasksCompleted: number;
  /** Tasks completed today */
  tasksCompletedToday: number;
  /** Number of achievements already unlocked */
  achievementsUnlocked: number;
  /** Current task being processed (if applicable) */
  currentTask?: {
    id: string;
    priority: number;
    difficulty: string;
    tags: string[];
    createdAt: Date;
    completedAt?: Date;
    dueDate?: Date | null;
  } | null;
  /** Event type that triggered this evaluation */
  eventType: "task_completed" | "task_created" | "streak_updated" | "level_up" | "manual_check";
  /** Additional event data */
  eventData?: Record<string, any>;
}

/**
 * Achievement unlock result
 */
export interface AchievementUnlockResult {
  /** Achievement that was unlocked */
  achievement: Achievement;
  /** When it was unlocked */
  unlockedAt: Date;
  /** Whether XP reward was applied */
  xpRewardApplied: boolean;
  /** Amount of XP rewarded */
  xpRewardAmount: number;
}

/**
 * Achievement evaluation result
 */
export interface AchievementEvaluationResult {
  /** Newly unlocked achievements */
  newlyUnlocked: AchievementUnlockResult[];
  /** Already unlocked achievements (that were evaluated) */
  alreadyUnlocked: string[];
  /** Achievements that didn't meet criteria */
  notUnlocked: string[];
  /** Total XP rewards earned from new unlocks */
  totalXpRewarded: number;
}
