/**
 * Streak Management Service
 * 
 * Handles user streak tracking and emits events for streak changes.
 * Integrates with task completion to maintain accurate streak data.
 */

import { updateUserStreak, getCurrentStreak } from "@/models/StreakLog";
import { updateUserGamification } from "@/models/User";
import { gamificationEvents } from "./events";

/**
 * Update user's streak and emit appropriate events
 * 
 * @param userId - The user ID to update streak for
 * @param taskCount - Number of tasks completed (default: 1)
 * @returns Streak update result with current streak information
 */
export async function updateUserStreakWithEvents(
  userId: string,
  taskCount: number = 1
): Promise<{
  currentStreak: number;
  previousStreak: number;
  streakExtended: boolean;
  streakReset: boolean;
}> {
  // Update streak in database
  const streakResult = await updateUserStreak(userId, taskCount);
  
  // Update user's current streak field
  await updateUserGamification(userId, {
    currentStreak: streakResult.currentStreak,
    lastStreakDate: new Date(),
  });

  // Emit streak update event if there was a change
  if (streakResult.streakExtended || streakResult.streakReset) {
    gamificationEvents.emitStreakUpdate({
      userId,
      oldStreak: streakResult.previousStreak,
      newStreak: streakResult.currentStreak,
      lastStreakDate: new Date(),
      timestamp: new Date(),
    });
  }

  return streakResult;
}

/**
 * Get user's current streak with additional context
 * 
 * @param userId - The user ID to get streak for
 * @returns Streak information with additional metadata
 */
export async function getUserStreakInfo(userId: string): Promise<{
  currentStreak: number;
  lastStreakDate?: Date;
  isActive: boolean;
}> {
  const currentStreak = await getCurrentStreak(userId);
  
  // A streak is considered active if it's at least 1 day
  const isActive = currentStreak > 0;
  
  return {
    currentStreak,
    isActive,
  };
}

/**
 * Check and update user's longest streak if current streak exceeds it
 * 
 * @param userId - The user ID to check
 * @returns Whether the longest streak was updated
 */
export async function updateLongestStreakIfNeeded(userId: string): Promise<boolean> {
  const currentStreak = await getCurrentStreak(userId);
  
  if (currentStreak > 0) {
    // Update longest streak if current is higher
    const result = await updateUserGamification(userId, {
      longestStreak: currentStreak,
    });
    
    return result.longestStreak === currentStreak;
  }
  
  return false;
}

/**
 * Initialize streak tracking for a new user
 * 
 * @param userId - The user ID to initialize
 * @returns Initialization result
 */
export async function initializeUserStreak(userId: string): Promise<{
  currentStreak: number;
  initialized: boolean;
}> {
  const currentStreak = await getCurrentStreak(userId);
  
  // Initialize user's streak fields if not already set
  await updateUserGamification(userId, {
    currentStreak,
    longestStreak: currentStreak,
  });
  
  return {
    currentStreak,
    initialized: true,
  };
}