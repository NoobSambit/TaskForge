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
