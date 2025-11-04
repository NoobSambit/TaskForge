/**
 * Level System
 * 
 * Provides helpers for calculating XP requirements for levels,
 * determining next level thresholds, and applying level changes.
 */

import { LEVEL_PROGRESSION } from "./config";

/**
 * Level information including XP requirements
 */
export interface LevelInfo {
  level: number;
  xpRequired: number;
  xpForNextLevel: number;
}

/**
 * Calculate XP required to reach a specific level.
 * 
 * Uses the formula: xp = (level - 1)^exponent * baseXp
 * 
 * @param level - Target level (1-based)
 * @returns XP required to reach that level
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  
  const { BASE_XP, EXPONENT } = LEVEL_PROGRESSION;
  return Math.floor(Math.pow(level - 1, EXPONENT) * BASE_XP);
}

/**
 * Calculate current level from total XP.
 * 
 * Uses the inverse formula: level = floor((xp / baseXp)^(1/exponent)) + 1
 * 
 * @param xp - Total XP amount
 * @returns Current level (minimum 1)
 */
export function calculateLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  
  const { BASE_XP, EXPONENT } = LEVEL_PROGRESSION;
  return Math.floor(Math.pow(xp / BASE_XP, 1 / EXPONENT)) + 1;
}

/**
 * Get the XP threshold for the next level given current XP.
 * 
 * @param currentXp - Current total XP
 * @returns XP required to reach the next level
 */
export function nextLevelThreshold(currentXp: number): number {
  const currentLevel = calculateLevelFromXp(currentXp);
  return xpRequiredForLevel(currentLevel + 1);
}

/**
 * Get detailed level information for a given XP amount.
 * 
 * @param currentXp - Current total XP
 * @returns Level info including current level and next threshold
 */
export function getLevelInfo(currentXp: number): LevelInfo {
  const level = calculateLevelFromXp(currentXp);
  const xpRequired = xpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  
  return {
    level,
    xpRequired,
    xpForNextLevel,
  };
}

/**
 * Precomputed lookup table for levels 1-100.
 * Each entry contains the minimum XP required to reach that level.
 */
export const LEVEL_LOOKUP_TABLE: ReadonlyArray<Readonly<LevelInfo>> = (() => {
  const table: LevelInfo[] = [];
  const { MAX_PRECOMPUTED_LEVEL } = LEVEL_PROGRESSION;
  
  for (let level = 1; level <= MAX_PRECOMPUTED_LEVEL; level++) {
    const xpRequired = xpRequiredForLevel(level);
    const xpForNextLevel = xpRequiredForLevel(level + 1);
    
    table.push({
      level,
      xpRequired,
      xpForNextLevel,
    });
  }
  
  return table;
})();

/**
 * Get level info using the precomputed lookup table (faster for levels 1-100).
 * Falls back to calculation for higher levels.
 * 
 * @param currentXp - Current total XP
 * @returns Level info
 */
export function getLevelInfoFast(currentXp: number): LevelInfo {
  const level = calculateLevelFromXp(currentXp);
  
  // Use lookup table if available
  if (level <= LEVEL_PROGRESSION.MAX_PRECOMPUTED_LEVEL) {
    // Return a copy to avoid returning a reference to the immutable table
    const entry = LEVEL_LOOKUP_TABLE[level - 1];
    return { ...entry };
  }
  
  // Calculate on-demand for higher levels
  return getLevelInfo(currentXp);
}

/**
 * Calculate all level-ups between old and new XP values.
 * Returns an array of levels crossed (e.g., [2, 3, 4] if user went from level 1 to level 4).
 * 
 * @param oldXp - Previous total XP
 * @param newXp - New total XP
 * @returns Array of levels reached (empty if no level-ups)
 */
export function calculateLevelsCrossed(oldXp: number, newXp: number): number[] {
  const oldLevel = calculateLevelFromXp(oldXp);
  const newLevel = calculateLevelFromXp(newXp);
  
  if (newLevel <= oldLevel) {
    return [];
  }
  
  const levelsCrossed: number[] = [];
  for (let level = oldLevel + 1; level <= newLevel; level++) {
    levelsCrossed.push(level);
  }
  
  return levelsCrossed;
}

/**
 * Apply level changes to a user after XP gain.
 * This handles level-up detection, updating user fields, logging activities,
 * and emitting events.
 * 
 * @param user - User document (will be modified)
 * @param gainedXp - Amount of XP gained (delta)
 * @returns Array of LevelUpInfo for each level gained
 */
export async function applyLevelChanges(
  user: any,
  gainedXp: number
): Promise<LevelUpInfo[]> {
  const oldXp = user.xp - gainedXp; // XP before this gain
  const newXp = user.xp;
  
  const oldLevel = calculateLevelFromXp(oldXp);
  const newLevel = calculateLevelFromXp(newXp);
  
  // No level change
  if (newLevel <= oldLevel) {
    // Update nextLevelAt even if no level-up
    const nextThreshold = nextLevelThreshold(newXp);
    if (user.preferences) {
      user.preferences.nextLevelAt = nextThreshold;
    }
    return [];
  }
  
  // Calculate all levels crossed
  const levelsCrossed = calculateLevelsCrossed(oldXp, newXp);
  const levelUps: LevelUpInfo[] = [];
  
  // Dynamic imports to avoid circular dependencies
  const { default: ActivityLog } = await import("../../models/ActivityLog");
  const { gamificationEvents } = await import("./events");
  
  // Process each level-up
  for (const level of levelsCrossed) {
    const xpAtLevel = xpRequiredForLevel(level);
    
    // Create activity log entry
    await ActivityLog.create({
      userId: user._id.toString(),
      activityType: "level_up",
      xpEarned: 0, // No XP earned from leveling up itself
      date: new Date(),
      metadata: {
        oldLevel: level - 1,
        newLevel: level,
        totalXp: level === newLevel ? newXp : xpAtLevel,
        xpForNextLevel: xpRequiredForLevel(level + 1),
      },
    });
    
    const levelUpInfo: LevelUpInfo = {
      oldLevel: level - 1,
      newLevel: level,
      totalXp: newXp,
      unlockedRewards: [], // Can be extended with theme unlocks, etc.
    };
    
    levelUps.push(levelUpInfo);
    
    // Emit level-up event
    gamificationEvents.emitLevelUp({
      userId: user._id.toString(),
      oldLevel: level - 1,
      newLevel: level,
      totalXp: newXp,
      timestamp: new Date(),
    });
  }
  
  // Update user's level and nextLevelAt
  user.level = newLevel;
  if (user.preferences) {
    user.preferences.nextLevelAt = nextLevelThreshold(newXp);
  }
  
  return levelUps;
}

/**
 * Information about a level-up event
 */
export interface LevelUpInfo {
  oldLevel: number;
  newLevel: number;
  totalXp: number;
  unlockedRewards: string[]; // Theme names, titles, etc.
}
