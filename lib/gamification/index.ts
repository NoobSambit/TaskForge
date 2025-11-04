/**
 * Gamification Module
 * 
 * Public API for the XP calculation engine and related utilities.
 */

// Export the main calculation function
export { calculateXp, normalizeTaskData } from "./xpEngine";

// Export types for consumers
export type {
  XpComputation,
  XpRule,
  XpRuleKey,
  TaskData,
  UserContext,
  XpCalculationOptions,
} from "./types";

// Export configuration for reference (read-only)
export {
  BASE_XP,
  PRIORITY_MULTIPLIERS,
  TAG_BONUSES,
  getStreakMultiplier,
  TIME_BONUSES,
  XP_CAPS,
  MAX_COMPLETION_AGE_DAYS,
  ACHIEVEMENT_TRIGGER_TAGS,
} from "./config";
