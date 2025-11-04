/**
 * Streak Tracking Service
 * 
 * Handles daily streak computation with timezone awareness, including:
 * - Updating streaks on task completion
 * - Recomputing streaks from historical data
 * - Handling DST transitions and timezone boundaries
 */

import type { IUser } from "@/models/User";

/**
 * Result of applying a completion to a user's streak
 */
export interface StreakUpdateResult {
  updated: boolean;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: Date;
  isNewDay: boolean;
  taskCount: number;
  reason?: string;
}

/**
 * Convert a Date to ISO date string (YYYY-MM-DD) in a specific timezone
 * 
 * @param date - Date to convert
 * @param timezone - IANA timezone (e.g., "America/New_York", "UTC")
 * @returns ISO date string in the specified timezone
 */
export function toDateStringInTimezone(date: Date, timezone: string = "UTC"): string {
  try {
    // Use Intl.DateTimeFormat to get date parts in the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.warn(`Invalid timezone "${timezone}", falling back to UTC`);
    return date.toISOString().split("T")[0];
  }
}

/**
 * Get the start of day (midnight) for a date in a specific timezone
 * 
 * @param date - Date to get start of day for
 * @param timezone - IANA timezone
 * @returns Date object representing midnight in the specified timezone
 */
export function getStartOfDayInTimezone(date: Date, timezone: string = "UTC"): Date {
  const dateStr = toDateStringInTimezone(date, timezone);
  // Parse the date string as if it's in the target timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create a date string that includes timezone offset
  const isoString = `${dateStr}T00:00:00`;
  
  // Use toLocaleString to get the date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Create a date at midnight in the target timezone
  // We need to find the UTC time that corresponds to midnight in the target timezone
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Adjust for timezone offset
  const utcDateStr = targetDate.toISOString().split("T")[0];
  const localDateStr = toDateStringInTimezone(targetDate, timezone);
  
  // If they don't match, we need to adjust
  if (utcDateStr !== localDateStr) {
    // Binary search or iterative approach to find midnight
    // Simpler approach: use the formatter to parse
    let testDate = new Date(`${dateStr}T00:00:00Z`);
    let testStr = toDateStringInTimezone(testDate, timezone);
    
    // Adjust by timezone offset
    const offset = testDate.getTimezoneOffset();
    testDate = new Date(testDate.getTime() - offset * 60 * 1000);
    testStr = toDateStringInTimezone(testDate, timezone);
    
    // Keep adjusting until we get the right date
    let iterations = 0;
    while (testStr !== dateStr && iterations < 48) {
      if (testStr < dateStr) {
        testDate = new Date(testDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      } else {
        testDate = new Date(testDate.getTime() - 60 * 60 * 1000); // Subtract 1 hour
      }
      testStr = toDateStringInTimezone(testDate, timezone);
      iterations++;
    }
    
    return testDate;
  }
  
  return targetDate;
}

/**
 * Calculate days between two date strings (YYYY-MM-DD)
 * 
 * @param dateStr1 - First date string
 * @param dateStr2 - Second date string
 * @returns Number of days between dates (positive if dateStr2 is after dateStr1)
 */
export function daysBetweenDateStrings(dateStr1: string, dateStr2: string): number {
  const date1 = new Date(dateStr1 + "T00:00:00Z");
  const date2 = new Date(dateStr2 + "T00:00:00Z");
  const diffMs = date2.getTime() - date1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Apply a task completion to a user's streak.
 * 
 * This function:
 * 1. Converts completedAt to user's timezone
 * 2. Checks if completion is on same day, next day, or breaks streak
 * 3. Updates currentStreak, longestStreak, lastStreakDate
 * 4. Upserts StreakLog entry with incremented taskCount
 * 
 * @param user - User document (will be modified in place)
 * @param completedAt - When the task was completed
 * @returns Result with updated streak information
 */
export async function applyCompletionToStreak(
  user: IUser & { _id: any; save: () => Promise<any> },
  completedAt: Date
): Promise<StreakUpdateResult> {
  try {
    // Dynamic imports to avoid circular dependencies
    const { default: StreakLog } = await import("@/models/StreakLog");
    
    // Get user's timezone (default to UTC)
    const timezone = user.preferences?.timezone || "UTC";
    
    // Convert completion date to user's timezone
    const completionDateStr = toDateStringInTimezone(completedAt, timezone);
    const completionDate = new Date(completionDateStr + "T00:00:00Z");
    
    // Get last streak date in user's timezone
    let lastStreakDateStr: string | null = null;
    if (user.lastStreakDate) {
      lastStreakDateStr = toDateStringInTimezone(user.lastStreakDate, timezone);
    }
    
    // Determine if this is the same day, next day, or breaks streak
    let isNewDay = true;
    let daysDiff = 0;
    
    if (lastStreakDateStr) {
      daysDiff = daysBetweenDateStrings(lastStreakDateStr, completionDateStr);
      isNewDay = daysDiff > 0;
    }
    
    let currentStreak = user.currentStreak || 0;
    let longestStreak = user.longestStreak || 0;
    
    if (!lastStreakDateStr) {
      // First ever completion
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, 1);
    } else if (daysDiff === 0) {
      // Same day - don't change streak, just increment task count
      isNewDay = false;
    } else if (daysDiff === 1) {
      // Next consecutive day - increment streak
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (daysDiff > 1) {
      // Broke streak - reset to 1
      currentStreak = 1;
    } else {
      // Completion is in the past (daysDiff < 0)
      // This can happen with backfilling or clock adjustments
      // Don't update current streak, but still log it
      return {
        updated: false,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        lastStreakDate: user.lastStreakDate || completedAt,
        isNewDay: false,
        taskCount: 0,
        reason: "Completion date is before last streak date",
      };
    }
    
    // Update user's streak fields
    user.currentStreak = currentStreak;
    user.longestStreak = longestStreak;
    user.lastStreakDate = completionDate;
    
    // Upsert StreakLog entry
    const streakLog = await StreakLog.findOneAndUpdate(
      {
        userId: user._id.toString(),
        date: completionDate,
      },
      {
        $inc: { taskCount: 1 },
        $set: { streakLength: currentStreak },
      },
      {
        upsert: true,
        new: true,
      }
    );
    
    return {
      updated: true,
      currentStreak,
      longestStreak,
      lastStreakDate: completionDate,
      isNewDay,
      taskCount: streakLog.taskCount,
    };
  } catch (error: any) {
    console.error("Error applying completion to streak:", error);
    return {
      updated: false,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastStreakDate: user.lastStreakDate || completedAt,
      isNewDay: false,
      taskCount: 0,
      reason: error.message || "Unknown error",
    };
  }
}

/**
 * Result of recomputing streaks from history
 */
export interface RecomputeStreaksResult {
  success: boolean;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  totalCompletions: number;
  streakLogsCreated: number;
  reason?: string;
}

/**
 * Recompute a user's streaks from historical ActivityLog data.
 * 
 * This function:
 * 1. Queries all task completions from ActivityLog
 * 2. Groups completions by date in user's timezone
 * 3. Rebuilds streak history chronologically
 * 4. Updates User record and creates/updates StreakLog entries
 * 
 * @param userId - User ID to recompute streaks for
 * @returns Result with recomputed streak information
 */
export async function recomputeStreaksFromHistory(
  userId: string
): Promise<RecomputeStreaksResult> {
  try {
    // Dynamic imports
    const { default: User } = await import("@/models/User");
    const { default: ActivityLog } = await import("@/models/ActivityLog");
    const { default: StreakLog } = await import("@/models/StreakLog");
    
    // Load user
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        totalCompletions: 0,
        streakLogsCreated: 0,
        reason: "User not found",
      };
    }
    
    const timezone = user.preferences?.timezone || "UTC";
    
    // Query all task completions for this user, sorted by date
    const completions = await ActivityLog.find({
      userId,
      activityType: "task_completion",
    }).sort({ date: 1 });
    
    if (completions.length === 0) {
      // No completions found - reset streaks to 0
      user.currentStreak = 0;
      user.longestStreak = 0;
      user.lastStreakDate = undefined;
      await user.save();
      
      return {
        success: true,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        totalCompletions: 0,
        streakLogsCreated: 0,
      };
    }
    
    // Group completions by date in user's timezone
    const dateMap = new Map<string, { date: Date; count: number; completions: typeof completions }>();
    
    for (const completion of completions) {
      const dateStr = toDateStringInTimezone(completion.date, timezone);
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: new Date(dateStr + "T00:00:00Z"),
          count: 0,
          completions: [],
        });
      }
      
      const entry = dateMap.get(dateStr)!;
      entry.count += 1;
      entry.completions.push(completion);
    }
    
    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    // Compute streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDateStr: string | null = null;
    const streakLogs: Array<{ userId: string; date: Date; taskCount: number; streakLength: number }> = [];
    
    for (const dateStr of sortedDates) {
      const entry = dateMap.get(dateStr)!;
      
      if (!lastDateStr) {
        // First day
        currentStreak = 1;
      } else {
        const daysDiff = daysBetweenDateStrings(lastDateStr, dateStr);
        
        if (daysDiff === 1) {
          // Consecutive day
          currentStreak += 1;
        } else if (daysDiff > 1) {
          // Broke streak
          currentStreak = 1;
        }
        // daysDiff === 0 shouldn't happen since we're using a Map with unique keys
      }
      
      longestStreak = Math.max(longestStreak, currentStreak);
      
      streakLogs.push({
        userId,
        date: entry.date,
        taskCount: entry.count,
        streakLength: currentStreak,
      });
      
      lastDateStr = dateStr;
    }
    
    // Update user's streak fields
    // Current streak is only valid if the last activity was yesterday or today
    const now = new Date();
    const todayStr = toDateStringInTimezone(now, timezone);
    const daysSinceLastActivity = lastDateStr ? daysBetweenDateStrings(lastDateStr, todayStr) : 999;
    
    // If last activity was today (0) or yesterday (1), keep current streak
    // Otherwise, streak is broken
    const finalCurrentStreak = daysSinceLastActivity <= 1 ? currentStreak : 0;
    
    user.currentStreak = finalCurrentStreak;
    user.longestStreak = longestStreak;
    user.lastStreakDate = lastDateStr ? new Date(lastDateStr + "T00:00:00Z") : undefined;
    await user.save();
    
    // Bulk upsert StreakLog entries
    let streakLogsCreated = 0;
    for (const log of streakLogs) {
      await StreakLog.findOneAndUpdate(
        { userId: log.userId, date: log.date },
        { taskCount: log.taskCount, streakLength: log.streakLength },
        { upsert: true }
      );
      streakLogsCreated++;
    }
    
    return {
      success: true,
      currentStreak: finalCurrentStreak,
      longestStreak,
      totalDaysActive: sortedDates.length,
      totalCompletions: completions.length,
      streakLogsCreated,
    };
  } catch (error: any) {
    console.error("Error recomputing streaks from history:", error);
    return {
      success: false,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      totalCompletions: 0,
      streakLogsCreated: 0,
      reason: error.message || "Unknown error",
    };
  }
}
