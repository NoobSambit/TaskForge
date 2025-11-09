/**
 * Theme Unlock Service
 * 
 * Handles theme unlocking logic when users level up.
 * Integrates with the level system to automatically unlock eligible themes.
 */

import { User, IUser } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { 
  getThemesUnlockedAtLevel, 
  getThemesAvailableAtLevel, 
  THEMES, 
  ThemeDefinition 
} from "./themes";

/**
 * Unlock themes for a user when they reach a new level
 * 
 * @param userId - The user ID to unlock themes for
 * @param newLevel - The new level the user reached
 * @param previousLevel - The previous level before the level up
 * @returns Array of unlocked theme definitions
 */
export async function unlockThemesForLevelUp(
  userId: string,
  newLevel: number,
  previousLevel: number
): Promise<ThemeDefinition[]> {
  // Get themes that should be unlocked at this new level
  const newlyUnlockedThemes = getThemesUnlockedAtLevel(newLevel);
  
  if (newlyUnlockedThemes.length === 0) {
    return [];
  }

  // Get current user to check unlocked themes
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const currentlyUnlocked = new Set(user.unlockedThemes || []);
  const themesToUnlock: ThemeDefinition[] = [];

  // Find themes that are newly unlocked
  for (const theme of newlyUnlockedThemes) {
    if (!currentlyUnlocked.has(theme.id)) {
      themesToUnlock.push(theme);
      currentlyUnlocked.add(theme.id);
    }
  }

  if (themesToUnlock.length === 0) {
    return [];
  }

  // Update user's unlocked themes
  await User.updateOne(
    { _id: userId },
    { 
      $addToSet: { 
        unlockedThemes: { $each: themesToUnlock.map(t => t.id) }
      }
    }
  );

  // Log theme unlocks in activity log
  const activityPromises = themesToUnlock.map(theme => 
    ActivityLog.create({
      userId,
      activityType: "themeUnlock",
      metadata: {
        themeId: theme.id,
        themeName: theme.name,
        themeRarity: theme.rarity,
        levelUnlocked: newLevel,
      },
      xpEarned: 0,
      date: new Date(),
    })
  );

  await Promise.all(activityPromises);

  return themesToUnlock;
}

/**
 * Get all available themes for a user based on their unlocked themes
 * 
 * @param userId - The user ID
 * @returns Array of available theme definitions
 */
export async function getAvailableThemesForUser(userId: string): Promise<ThemeDefinition[]> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const unlockedThemeIds = user.unlockedThemes || [];
  return unlockedThemeIds
    .map(themeId => THEMES[themeId])
    .filter(Boolean); // Filter out any undefined themes
}

/**
 * Update a user's active theme
 * 
 * @param userId - The user ID
 * @param themeId - The theme ID to activate
 * @returns Updated user document
 */
export async function updateUserTheme(userId: string, themeId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Check if the theme is unlocked
  const isUnlocked = user.unlockedThemes?.includes(themeId);
  if (!isUnlocked) {
    throw new Error(`Theme "${themeId}" is not unlocked for user ${userId}`);
  }

  // Validate theme exists
  const theme = THEMES[themeId];
  if (!theme) {
    throw new Error(`Theme "${themeId}" does not exist`);
  }

  // Update user's active theme
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { theme: themeId },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error(`Failed to update theme for user ${userId}`);
  }

  return updatedUser;
}

/**
 * Check what themes a user could unlock at their current level
 * 
 * @param userId - The user ID
 * @returns Object with available, unlocked, and locked themes
 */
export async function getUserThemeStatus(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const unlockedThemeIds = new Set(user.unlockedThemes || []);
  const userLevel = user.level || 1;
  
  const allThemes = Object.values(THEMES);
  const availableAtLevel = getThemesAvailableAtLevel(userLevel);
  
  const unlocked = allThemes.filter(theme => unlockedThemeIds.has(theme.id));
  const available = availableAtLevel.filter(theme => !unlockedThemeIds.has(theme.id));
  const locked = allThemes.filter(theme => theme.levelRequired > userLevel);

  return {
    currentTheme: user.theme || 'default',
    unlocked,
    available,
    locked,
    userLevel,
  };
}

/**
 * Initialize themes for a new user
 * 
 * @param userId - The user ID to initialize themes for
 * @returns Updated user document
 */
export async function initializeThemesForUser(userId: string): Promise<IUser> {
  // Get default themes (level 1)
  const defaultThemes = Object.values(THEMES).filter(theme => theme.levelRequired === 1);
  const defaultThemeIds = defaultThemes.map(theme => theme.id);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { 
      $set: { 
        theme: 'default',
        unlockedThemes: defaultThemeIds 
      }
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error(`Failed to initialize themes for user ${userId}`);
  }

  return updatedUser;
}

/**
 * Get themes that will be unlocked at future levels
 * 
 * @param userId - The user ID
 * @returns Array of themes that will be unlocked in the future
 */
export async function getFutureThemeUnlocks(userId: string): Promise<Array<{level: number, themes: ThemeDefinition[]}>> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const userLevel = user.level || 1;
  const unlockedThemeIds = new Set(user.unlockedThemes || []);
  
  // Get all themes and group by level
  const themesByLevel = new Map<number, ThemeDefinition[]>();
  
  Object.values(THEMES).forEach(theme => {
    if (theme.levelRequired > userLevel && !unlockedThemeIds.has(theme.id)) {
      if (!themesByLevel.has(theme.levelRequired)) {
        themesByLevel.set(theme.levelRequired, []);
      }
      themesByLevel.get(theme.levelRequired)!.push(theme);
    }
  });

  // Convert to sorted array
  const futureUnlocks = Array.from(themesByLevel.entries())
    .map(([level, themes]) => ({ level, themes }))
    .sort((a, b) => a.level - b.level);

  return futureUnlocks;
}