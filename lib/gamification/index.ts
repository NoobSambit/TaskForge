/**
 * Gamification Module
 * 
 * Public API for the XP calculation engine and related utilities.
 */

// Export the main calculation function
export { calculateXp, normalizeTaskData } from "./xpEngine";

// Export XP awarding service
export {
  awardXpForTaskCompletion,
  adjustXpForTaskReopen,
  calculateLevelFromXp,
} from "./awardXp";
export type { AwardXpOptions, AwardXpResult } from "./awardXp";

// Export level system
export {
  xpRequiredForLevel,
  nextLevelThreshold,
  getLevelInfo,
  getLevelInfoFast,
  calculateLevelsCrossed,
  applyLevelChanges,
  LEVEL_LOOKUP_TABLE,
} from "./levels";
export type { LevelInfo, LevelUpInfo } from "./levels";

// Export event emitter and types
export { gamificationEvents, GAMIFICATION_EVENTS } from "./events";
export type {
  XpAwardedEvent,
  LevelUpEvent,
  LevelCheckPendingEvent,
  AchievementUnlockedEvent,
} from "./events";

// Export types for consumers
export type {
  XpComputation,
  XpRule,
  XpRuleKey,
  TaskData,
  UserContext,
  XpCalculationOptions,
  Achievement,
  AchievementContext,
  AchievementUnlockResult,
  AchievementEvaluationResult,
} from "./types";

// Export achievements engine
export {
  evaluateAchievements,
  unlockAchievement,
  hasAchievement,
  getUserAchievements,
  getUserAchievementStats,
  evaluateAchievementsByCategory,
} from "./achievementsEngine";

// Export achievement context builders
export {
  buildAchievementContext,
  buildTaskCompletionContext,
  buildTaskCreationContext,
  buildStreakUpdateContext,
  buildLevelUpContext,
  buildManualCheckContext,
} from "./achievementContext";

// Export achievement configurations
export {
  ACHIEVEMENTS_CONFIG,
  getAchievementConfig,
  getAchievementsByCategory,
  getAchievementsByRarity,
} from "./achievementsConfig";
export type { AchievementConfig, AchievementPredicate } from "./achievementsConfig";

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
  LEVEL_PROGRESSION,
} from "./config";
