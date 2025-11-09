/**
 * Achievement Context Builder
 * 
 * Helper functions to build achievement context from database data.
 */

import type { AchievementContext } from "./types";

/**
 * Build achievement context from user data and optional current task
 */
export async function buildAchievementContext(
  userId: string,
  eventType: AchievementContext["eventType"],
  currentTask?: AchievementContext["currentTask"],
  eventData?: Record<string, any>
): Promise<AchievementContext> {
  // Dynamic imports to avoid circular dependencies
  const { default: User } = await import("../../models/User");
  const { default: ActivityLog } = await import("../../models/ActivityLog");
  const { default: Task } = await import("../../models/Task");
  const { default: UserAchievement } = await import("../../models/UserAchievement");

  // Get user data
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Get task statistics
  const [
    totalTasksCompleted,
    totalTasksCreated,
    highPriorityTasksCompleted,
    tasksCompletedToday,
    achievementsUnlocked,
  ] = await Promise.all([
    // Total tasks completed
    ActivityLog.countDocuments({
      userId,
      activityType: "task_completion",
    }),
    // Total tasks created
    Task.countDocuments({ userId }),
    // High priority tasks completed (priority 4-5)
    ActivityLog.countDocuments({
      userId,
      activityType: "task_completion",
      "metadata.taskPriority": { $gte: 4 },
    }),
    // Tasks completed today
    ActivityLog.countDocuments({
      userId,
      activityType: "task_completion",
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    // Total achievements unlocked
    UserAchievement.countDocuments({ userId }),
  ]);

  const context: AchievementContext = {
    userId,
    currentLevel: user.level,
    currentStreak: user.currentStreak,
    totalTasksCompleted,
    totalTasksCreated,
    highPriorityTasksCompleted,
    tasksCompletedToday,
    achievementsUnlocked,
    currentTask: currentTask || null,
    eventType,
    eventData,
  };

  return context;
}

/**
 * Build achievement context for task completion event
 */
export async function buildTaskCompletionContext(
  userId: string,
  taskId: string
): Promise<AchievementContext> {
  const { default: Task } = await import("../../models/Task");

  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const currentTask = {
    id: task._id.toString(),
    priority: task.priority,
    difficulty: task.difficulty,
    tags: task.tags,
    createdAt: task.createdAt,
    completedAt: task.completedAt || undefined,
    dueDate: task.dueDate || undefined,
  };

  return buildAchievementContext(
    userId,
    "task_completed",
    currentTask,
    { taskId }
  );
}

/**
 * Build achievement context for task creation event
 */
export async function buildTaskCreationContext(
  userId: string,
  taskId: string
): Promise<AchievementContext> {
  const { default: Task } = await import("../../models/Task");

  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const currentTask = {
    id: task._id.toString(),
    priority: task.priority,
    difficulty: task.difficulty,
    tags: task.tags,
    createdAt: task.createdAt,
    completedAt: task.completedAt || undefined,
    dueDate: task.dueDate || undefined,
  };

  return buildAchievementContext(
    userId,
    "task_created",
    currentTask,
    { taskId }
  );
}

/**
 * Build achievement context for streak update event
 */
export async function buildStreakUpdateContext(
  userId: string,
  streakData: { currentStreak: number; lastStreakDate?: Date }
): Promise<AchievementContext> {
  return buildAchievementContext(
    userId,
    "streak_updated",
    undefined,
    streakData
  );
}

/**
 * Build achievement context for level up event
 */
export async function buildLevelUpContext(
  userId: string,
  levelData: { oldLevel: number; newLevel: number; totalXp: number }
): Promise<AchievementContext> {
  return buildAchievementContext(
    userId,
    "level_up",
    undefined,
    levelData
  );
}

/**
 * Build achievement context for manual check
 */
export async function buildManualCheckContext(
  userId: string
): Promise<AchievementContext> {
  return buildAchievementContext(userId, "manual_check");
}