/**
 * Gamification XP Engine Configuration
 * 
 * This file contains all coefficients, multipliers, and thresholds used
 * in the XP calculation engine. Values are centralized here for easy tuning
 * without modifying core logic.
 */

import { TaskDifficulty } from "@/types";

/**
 * Base XP values awarded for completing a task of each difficulty level.
 * These serve as the foundation for all XP calculations.
 */
export const BASE_XP: Record<TaskDifficulty, number> = {
  easy: 10,    // Simple tasks worth 10 XP
  medium: 25,  // Standard tasks worth 25 XP
  hard: 50,    // Complex tasks worth 50 XP
};

/**
 * Priority multipliers applied based on task priority (1-5).
 * Higher priority tasks yield more XP to incentivize tackling important work.
 * 
 * Priority 1 (lowest): 0.8x multiplier
 * Priority 2: 0.9x multiplier
 * Priority 3 (default): 1.0x multiplier (no change)
 * Priority 4: 1.25x multiplier
 * Priority 5 (highest): 1.5x multiplier
 */
export const PRIORITY_MULTIPLIERS: Record<number, number> = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.25,
  5: 1.5,
};

/**
 * Tag-based XP bonuses added when specific tags are present.
 * Encourages categorization and rewards tackling special task types.
 * 
 * Multiple tag bonuses stack additively.
 */
export const TAG_BONUSES: Record<string, number> = {
  urgent: 15,      // Urgent tasks get +15 XP
  "bug-fix": 20,   // Bug fixes rewarded with +20 XP
  learning: 10,    // Learning tasks get +10 XP
  refactor: 15,    // Code refactoring tasks get +15 XP
  documentation: 8, // Documentation tasks get +8 XP
  testing: 12,     // Testing tasks get +12 XP
  review: 10,      // Code review tasks get +10 XP
  deployment: 25,  // Deployment tasks get +25 XP
  design: 15,      // Design tasks get +15 XP
  research: 12,    // Research tasks get +12 XP
};

/**
 * Streak multipliers applied based on current streak length.
 * Rewards consistency and daily engagement.
 * 
 * The multiplier increases with longer streaks but caps at reasonable levels.
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 1.5;   // 30+ days: 1.5x
  if (streakDays >= 14) return 1.3;   // 14-29 days: 1.3x
  if (streakDays >= 7) return 1.2;    // 7-13 days: 1.2x
  if (streakDays >= 3) return 1.1;    // 3-6 days: 1.1x
  return 1.0;                          // 0-2 days: no bonus
}

/**
 * Time-based completion bonuses and penalties.
 */
export const TIME_BONUSES = {
  /**
   * Bonus XP awarded for completing a task before its due date.
   * Encourages proactive task completion.
   */
  EARLY_COMPLETION_BONUS: 10,

  /**
   * Penalty applied (as negative XP) for completing overdue tasks.
   * Discourages procrastination while still awarding some XP.
   */
  LATE_COMPLETION_PENALTY: -5,

  /**
   * Bonus for completing tasks early in the morning (5 AM - 9 AM).
   * Rewards early birds.
   */
  EARLY_BIRD_BONUS: 5,

  /**
   * Bonus for completing tasks late at night (10 PM - 2 AM).
   * Rewards night owls.
   */
  NIGHT_OWL_BONUS: 5,

  /**
   * Bonus for completing tasks on weekends.
   * Rewards dedication outside normal work hours.
   */
  WEEKEND_BONUS: 8,
};

/**
 * XP caps and limits to prevent exploitation and maintain game balance.
 */
export const XP_CAPS = {
  /**
   * Maximum XP that can be earned from a single task.
   * Prevents edge cases from yielding unreasonable rewards.
   */
  MAX_XP_PER_TASK: 200,

  /**
   * Maximum total XP that can be earned per day.
   * Encourages balanced daily engagement over grinding.
   */
  MAX_DAILY_XP: 1000,

  /**
   * Minimum XP awarded for any completed task.
   * Ensures all effort is recognized.
   */
  MIN_XP_PER_TASK: 5,
};

/**
 * Rounding configuration for final XP values.
 * Set to true to round to nearest integer, false to allow decimals.
 */
export const ROUND_XP = true;

/**
 * Maximum age (in days) for a task completion to be eligible for XP.
 * Prevents backdating old completions for XP farming.
 */
export const MAX_COMPLETION_AGE_DAYS = 7;

/**
 * Tags that trigger special achievement flags.
 * These can be used by achievement systems to track progress.
 */
export const ACHIEVEMENT_TRIGGER_TAGS = [
  "urgent",
  "bug-fix",
  "deployment",
  "learning",
  "testing",
];

/**
 * Configuration for duplicate completion detection.
 * Prevents XP farming by completing the same task multiple times.
 */
export const DUPLICATE_COMPLETION = {
  /**
   * Whether to allow XP for tasks completed multiple times in the same day.
   * Set to false to prevent XP farming.
   */
  ALLOW_SAME_DAY_RECOMPLETE: false,

  /**
   * Cooldown period (in hours) before a task can be re-completed for XP.
   */
  RECOMPLETE_COOLDOWN_HOURS: 24,
};

/**
 * Level progression configuration.
 * Controls how XP translates into levels using an exponential curve.
 * 
 * Formula: xp = (level - 1)^exponent * baseXp
 * Inverse: level = floor(xp / baseXp)^(1/exponent) + 1
 */
export const LEVEL_PROGRESSION = {
  /**
   * Base XP required for leveling calculations.
   * With exponent=2 and baseXp=50:
   * - Level 1: 0 XP
   * - Level 2: 50 XP
   * - Level 3: 200 XP
   * - Level 4: 450 XP
   * - Level 5: 800 XP
   * - Level 10: 4,050 XP
   * - Level 20: 18,050 XP
   * - Level 50: 120,050 XP
   * - Level 100: 490,050 XP
   */
  BASE_XP: 50,

  /**
   * Exponent for the progression curve.
   * 2.0 = quadratic (gentle curve, recommended)
   * 1.5 = sub-quadratic (more linear)
   * 2.5 = super-quadratic (steeper curve)
   */
  EXPONENT: 2.0,

  /**
   * Maximum level to precompute for lookup table.
   * Levels beyond this will be calculated on-demand.
   */
  MAX_PRECOMPUTED_LEVEL: 100,
};
