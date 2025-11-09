/**
 * XP Awarding Service
 * 
 * Handles awarding XP for task completion with duplicate prevention,
 * atomic database updates, activity logging, and event emission.
 */

import { calculateXp, normalizeTaskData } from "./xpEngine";
import { gamificationEvents } from "./events";
import { applyLevelChanges } from "./levels";
import { evaluateAchievements } from "./achievementsEngine";
import { buildTaskCompletionContext } from "./achievementContext";
import { updateUserStreakWithEvents } from "./streaks";
import type { UserContext, XpCalculationOptions } from "./types";

/**
 * Options for XP awarding
 */
export interface AwardXpOptions extends XpCalculationOptions {
  /** Whether to allow negative XP adjustments (for task re-opening) */
  allowNegativeAdjustment?: boolean;
  /** Custom activity type (defaults to "task_completion") */
  activityType?: string;
  /** Override XP amount (bypasses calculation) */
  xpOverride?: number;
  /** Reason for the XP award (for logging) */
  reason?: string;
}

/**
 * Result of XP awarding operation
 */
export interface AwardXpResult {
  success: boolean;
  xpAwarded: number;
  totalXp: number;
  newLevel: number;
  reason?: string;
  alreadyAwarded?: boolean;
}

/**
 * Calculate level from total XP using a simple exponential formula.
 * Level 1: 0-99 XP
 * Level 2: 100-299 XP
 * Level 3: 300-599 XP
 * And so on...
 * 
 * Formula: level = floor(sqrt(xp / 50)) + 1
 * 
 * @deprecated Use calculateLevelFromXp from './levels' instead
 */
export function calculateLevelFromXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

/**
 * Award XP for completing a task.
 * 
 * This function:
 * 1. Loads the task and user from the database
 * 2. Checks for duplicate awards
 * 3. Calculates XP using the XP engine
 * 4. Atomically updates the user's XP
 * 5. Logs the activity
 * 6. Emits events for downstream consumers
 * 
 * @param taskId - ID of the completed task
 * @param userId - ID of the user who completed the task
 * @param options - Optional calculation parameters
 * @returns Result with XP awarded and updated totals
 */
export async function awardXpForTaskCompletion(
  taskId: string,
  userId: string,
  options: AwardXpOptions = {}
): Promise<AwardXpResult> {
  const {
    allowNegativeAdjustment = false,
    activityType = "task_completion",
    xpOverride,
    reason,
    ...calculationOptions
  } = options;

  try {
    // Dynamic imports to avoid circular dependencies and support server-side execution
    const { default: Task } = await import("../../models/Task");
    const { default: User } = await import("../../models/User");
    const { default: ActivityLog } = await import("../../models/ActivityLog");

    // Load task (skip for achievement rewards)
    let task = null;
    if (!taskId.startsWith("achievement_")) {
      task = await Task.findById(taskId);
      if (!task) {
        return {
          success: false,
          xpAwarded: 0,
          totalXp: 0,
          newLevel: 1,
          reason: "Task not found",
        };
      }

      // Verify task belongs to user
      if (task.userId !== userId) {
        return {
          success: false,
          xpAwarded: 0,
          totalXp: 0,
          newLevel: 1,
          reason: "Task does not belong to user",
        };
      }

      // Verify task is completed
      if (task.status !== "done" || !task.completedAt) {
        return {
          success: false,
          xpAwarded: 0,
          totalXp: 0,
          newLevel: 1,
          reason: "Task is not completed",
        };
      }
    }

    // Load user
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        xpAwarded: 0,
        totalXp: 0,
        newLevel: 1,
        reason: "User not found",
      };
    }

    // Check for duplicate award (idempotency)
    const duplicateQuery: any = {
      userId,
      activityType,
    };

    // Only check taskId for real tasks, not achievement rewards
    if (!taskId.startsWith("achievement_")) {
      duplicateQuery.taskId = taskId;
    } else if (reason?.startsWith("achievement_unlock:")) {
      // For achievement rewards, check by achievement key
      duplicateQuery.achievementKey = reason.replace("achievement_unlock:", "");
    }

    const existingLog = await ActivityLog.findOne(duplicateQuery);

    if (existingLog) {
      // Already awarded XP for this task/achievement
      return {
        success: true,
        xpAwarded: 0,
        totalXp: user.xp,
        newLevel: user.level,
        reason: "XP already awarded for this task/achievement",
        alreadyAwarded: true,
      };
    }

    // Build user context for XP calculation
    const userContext: UserContext = {
      userId: user._id.toString(),
      xpMultiplier: user.xpMultiplier,
      currentStreak: user.currentStreak,
      lastStreakDate: user.lastStreakDate,
    };

    // Normalize task data for XP engine (skip for achievement rewards)
    let taskData = null;
    if (task) {
      taskData = normalizeTaskData({
        priority: task.priority,
        difficulty: task.difficulty,
        tags: task.tags,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        dueDate: null, // Task model doesn't have dueDate yet
      });
    }

    // Calculate XP or use override
    let computation;
    if (xpOverride !== undefined) {
      // Create a mock computation for the override
      computation = {
        delta: xpOverride,
        appliedRules: [
          {
            key: "override" as any,
            value: xpOverride,
            description: reason || "XP override",
          },
        ],
      };
    } else if (taskData) {
      // Calculate XP normally
      computation = calculateXp(taskData, userContext, calculationOptions);
    } else {
      // No task data and no override - cannot calculate XP
      return {
        success: false,
        xpAwarded: 0,
        totalXp: user.xp,
        newLevel: user.level,
        reason: "No task data available for XP calculation",
      };
    }

    // Don't award negative XP unless explicitly allowed
    if (computation.delta < 0 && !allowNegativeAdjustment) {
      return {
        success: false,
        xpAwarded: 0,
        totalXp: user.xp,
        newLevel: user.level,
        reason: "Negative XP adjustment not allowed",
      };
    }

    // Atomically update user XP using $inc
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { xp: computation.delta },
        $set: { lastActiveAt: new Date() },
      },
      { new: true }
    );

    if (!updatedUser) {
      return {
        success: false,
        xpAwarded: 0,
        totalXp: user.xp,
        newLevel: user.level,
        reason: "Failed to update user",
      };
    }

    // Apply level changes (handles level-up detection, logging, and events)
    await applyLevelChanges(updatedUser, computation.delta);
    
    // Save user with updated level and preferences
    await updatedUser.save();
    
    const newLevel = updatedUser.level;

    // Create activity log entry
    const activityLogData: any = {
      userId,
      activityType,
      xpEarned: computation.delta,
      date: new Date(),
      metadata: {
        appliedRules: computation.appliedRules,
      },
    };

    // Only include task-related fields if we have a real task
    if (task && !taskId.startsWith("achievement_")) {
      activityLogData.taskId = taskId;
      activityLogData.metadata.taskTitle = task.title;
      activityLogData.metadata.taskDifficulty = task.difficulty;
      activityLogData.metadata.taskPriority = task.priority;
      activityLogData.metadata.taskTags = task.tags;
    } else if (taskId.startsWith("achievement_")) {
      // For achievement rewards, store achievement key instead of taskId
      const achievementKey = taskId.replace(/^achievement_.*_(\d+)$/, "$1");
      activityLogData.achievementKey = reason?.replace(/^achievement_unlock:/, "") || achievementKey;
    }

    await ActivityLog.create(activityLogData);

    // Update streak for real task completions
    if (task && !taskId.startsWith("achievement_")) {
      try {
        await updateUserStreakWithEvents(userId, 1);
      } catch (streakError) {
        console.error("❌ Error updating user streak:", streakError);
        // Don't fail the XP awarding if streak update fails
      }
    }

    // Emit XP awarded event
    const xpAwardedEvent: any = {
      userId: updatedUser._id.toString(),
      xpDelta: computation.delta,
      totalXp: updatedUser.xp,
      computation,
      timestamp: new Date(),
    };

    // Only include taskId for real tasks
    if (task && !taskId.startsWith("achievement_")) {
      xpAwardedEvent.taskId = task._id.toString();
    }

    gamificationEvents.emitXpAwarded(xpAwardedEvent);

    // Emit level check pending event for downstream processing
    gamificationEvents.emitLevelCheckPending({
      userId: updatedUser._id.toString(),
      currentXp: updatedUser.xp,
      currentLevel: newLevel,
      timestamp: new Date(),
    });

    // Trigger achievement evaluation for real task completions
    if (task && !taskId.startsWith("achievement_")) {
      try {
        console.log(`🏆 Triggering achievement evaluation for task completion: ${taskId}`);
        const achievementContext = await buildTaskCompletionContext(userId, taskId);
        const achievementResults = await evaluateAchievements("task_completed", achievementContext);
        
        if (achievementResults.newlyUnlocked.length > 0) {
          console.log(`🎉 ${achievementResults.newlyUnlocked.length} achievements unlocked from task completion`);
        }
      } catch (achievementError) {
        console.error("❌ Error evaluating achievements after task completion:", achievementError);
        // Don't fail the XP awarding if achievement evaluation fails
      }
    }

    return {
      success: true,
      xpAwarded: computation.delta,
      totalXp: updatedUser.xp,
      newLevel,
    };
  } catch (error: any) {
    // Log error but don't throw - we don't want to block task completion
    console.error("Error awarding XP:", error);

    // Check if it's a duplicate key error (race condition)
    if (error.code === 11000) {
      // Duplicate key error - XP already awarded by another request
      return {
        success: true,
        xpAwarded: 0,
        totalXp: 0,
        newLevel: 1,
        reason: "XP already awarded (concurrent request)",
        alreadyAwarded: true,
      };
    }

    return {
      success: false,
      xpAwarded: 0,
      totalXp: 0,
      newLevel: 1,
      reason: error.message || "Unknown error",
    };
  }
}

/**
 * Adjust XP when a task is re-opened (changed from done to not done).
 * This removes the XP that was previously awarded.
 * 
 * @param taskId - ID of the task being re-opened
 * @param userId - ID of the user
 * @returns Result with XP adjustment
 */
export async function adjustXpForTaskReopen(
  taskId: string,
  userId: string
): Promise<AwardXpResult> {
  try {
    const { default: User } = await import("../../models/User");
    const { default: ActivityLog } = await import("../../models/ActivityLog");

    // Find the original award log
    const originalLog = await ActivityLog.findOne({
      userId,
      taskId,
      activityType: "task_completion",
    });

    if (!originalLog) {
      // No XP was awarded, nothing to adjust
      return {
        success: true,
        xpAwarded: 0,
        totalXp: 0,
        newLevel: 1,
        reason: "No previous XP award found",
      };
    }

    const xpToRemove = originalLog.xpEarned;

    // Remove the original XP
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { xp: -xpToRemove },
        $set: { lastActiveAt: new Date() },
      },
      { new: true }
    );

    if (!updatedUser) {
      return {
        success: false,
        xpAwarded: 0,
        totalXp: 0,
        newLevel: 1,
        reason: "User not found",
      };
    }

    // Ensure XP doesn't go negative
    if (updatedUser.xp < 0) {
      updatedUser.xp = 0;
    }

    // Apply level changes (will handle level down if XP decreased)
    await applyLevelChanges(updatedUser, -xpToRemove);
    
    // Save user with updated level and preferences
    await updatedUser.save();
    
    const newLevel = updatedUser.level;

    // Delete the original activity log
    await ActivityLog.deleteOne({ _id: originalLog._id });

    // Log the adjustment
    await ActivityLog.create({
      userId,
      taskId,
      activityType: "task_reopened",
      xpEarned: -xpToRemove,
      date: new Date(),
      metadata: {
        originalXp: xpToRemove,
        reason: "Task re-opened",
      },
    });

    return {
      success: true,
      xpAwarded: -xpToRemove,
      totalXp: updatedUser.xp,
      newLevel,
    };
  } catch (error: any) {
    console.error("Error adjusting XP for task reopen:", error);
    return {
      success: false,
      xpAwarded: 0,
      totalXp: 0,
      newLevel: 1,
      reason: error.message || "Unknown error",
    };
  }
}
