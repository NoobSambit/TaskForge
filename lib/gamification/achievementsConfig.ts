/**
 * Achievement Configuration
 * 
 * Defines achievement metadata and evaluation hooks for the gamification system.
 * This file contains the complete list of achievements with their criteria,
 * rewards, and evaluation functions.
 */

import type { Achievement, AchievementContext } from "./types";

/**
 * Achievement evaluation hook function type
 * Returns true if the achievement criteria is met, false otherwise
 */
export type AchievementPredicate = (context: AchievementContext) => boolean;

/**
 * Achievement configuration interface
 */
export interface AchievementConfig {
  key: string;
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string;
  xpReward: number;
  themeUnlock?: string;
  predicate: AchievementPredicate;
}

/**
 * Helper function to check if time is before 8 AM
 */
function isBefore8AM(date: Date): boolean {
  return date.getHours() < 8;
}

/**
 * Helper function to check if time is after 10 PM
 */
function isAfter10PM(date: Date): boolean {
  return date.getHours() >= 22;
}

/**
 * Helper function to check if date is weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Helper function to get start of day
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Helper function to get start of hour
 */
function startOfHour(date: Date): Date {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
}

/**
 * Achievement configurations
 */
export const ACHIEVEMENTS_CONFIG: AchievementConfig[] = [
  // Task completion milestones
  {
    key: "first_task",
    title: "Getting Started",
    description: "Complete your first task",
    rarity: "common",
    category: "tasks",
    xpReward: 10,
    predicate: (ctx) => ctx.totalTasksCompleted >= 1,
  },
  {
    key: "task_5",
    title: "Task Warrior",
    description: "Complete 5 tasks",
    rarity: "common",
    category: "tasks",
    xpReward: 25,
    predicate: (ctx) => ctx.totalTasksCompleted >= 5,
  },
  {
    key: "task_10",
    title: "Productive",
    description: "Complete 10 tasks",
    rarity: "common",
    category: "tasks",
    xpReward: 50,
    predicate: (ctx) => ctx.totalTasksCompleted >= 10,
  },
  {
    key: "task_25",
    title: "Task Master",
    description: "Complete 25 tasks",
    rarity: "rare",
    category: "tasks",
    xpReward: 100,
    predicate: (ctx) => ctx.totalTasksCompleted >= 25,
  },
  {
    key: "task_50",
    title: "Task Legend",
    description: "Complete 50 tasks",
    rarity: "rare",
    category: "tasks",
    xpReward: 200,
    themeUnlock: "royal",
    predicate: (ctx) => ctx.totalTasksCompleted >= 50,
  },
  {
    key: "task_100",
    title: "Centurion",
    description: "Complete 100 tasks",
    rarity: "epic",
    category: "tasks",
    xpReward: 500,
    themeUnlock: "gold",
    predicate: (ctx) => ctx.totalTasksCompleted >= 100,
  },
  {
    key: "task_250",
    title: "Task Titan",
    description: "Complete 250 tasks",
    rarity: "epic",
    category: "tasks",
    xpReward: 1000,
    themeUnlock: "lightning",
    predicate: (ctx) => ctx.totalTasksCompleted >= 250,
  },
  {
    key: "task_500",
    title: "Task God",
    description: "Complete 500 tasks",
    rarity: "legendary",
    category: "tasks",
    xpReward: 2500,
    themeUnlock: "cosmic",
    predicate: (ctx) => ctx.totalTasksCompleted >= 500,
  },

  // Streak achievements
  {
    key: "streak_3",
    title: "Consistency",
    description: "Maintain a 3-day streak",
    rarity: "common",
    category: "streaks",
    xpReward: 30,
    predicate: (ctx) => ctx.currentStreak >= 3,
  },
  {
    key: "streak_7",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    rarity: "common",
    category: "streaks",
    xpReward: 75,
    predicate: (ctx) => ctx.currentStreak >= 7,
  },
  {
    key: "streak_14",
    title: "Two Weeks Strong",
    description: "Maintain a 14-day streak",
    rarity: "rare",
    category: "streaks",
    xpReward: 150,
    predicate: (ctx) => ctx.currentStreak >= 14,
  },
  {
    key: "streak_30",
    title: "Monthly Dedication",
    description: "Maintain a 30-day streak",
    rarity: "rare",
    category: "streaks",
    xpReward: 300,
    themeUnlock: "fire",
    predicate: (ctx) => ctx.currentStreak >= 30,
  },
  {
    key: "streak_60",
    title: "Unstoppable",
    description: "Maintain a 60-day streak",
    rarity: "epic",
    category: "streaks",
    xpReward: 750,
    themeUnlock: "inferno",
    predicate: (ctx) => ctx.currentStreak >= 60,
  },
  {
    key: "streak_100",
    title: "Streak Legend",
    description: "Maintain a 100-day streak",
    rarity: "legendary",
    category: "streaks",
    xpReward: 1500,
    themeUnlock: "phoenix",
    predicate: (ctx) => ctx.currentStreak >= 100,
  },

  // Time-based achievements
  {
    key: "early_bird",
    title: "Early Bird",
    description: "Complete a task before 8 AM",
    rarity: "common",
    category: "time",
    xpReward: 20,
    predicate: (ctx) => {
      if (!ctx.currentTask) return false;
      return isBefore8AM(ctx.currentTask.completedAt || new Date());
    },
  },
  {
    key: "night_owl",
    title: "Night Owl",
    description: "Complete a task after 10 PM",
    rarity: "common",
    category: "time",
    xpReward: 20,
    predicate: (ctx) => {
      if (!ctx.currentTask) return false;
      return isAfter10PM(ctx.currentTask.completedAt || new Date());
    },
  },
  {
    key: "weekend_warrior",
    title: "Weekend Warrior",
    description: "Complete tasks on both Saturday and Sunday",
    rarity: "rare",
    category: "time",
    xpReward: 40,
    predicate: (ctx) => {
      // This would need to track weekend activity across multiple days
      // For now, check if current task is completed on weekend
      if (!ctx.currentTask) return false;
      return isWeekend(ctx.currentTask.completedAt || new Date());
    },
  },

  // Priority-based achievements
  {
    key: "priority_master",
    title: "Priority Master",
    description: "Complete 10 high-priority tasks",
    rarity: "common",
    category: "priority",
    xpReward: 60,
    predicate: (ctx) => ctx.highPriorityTasksCompleted >= 10,
  },

  // Daily achievements
  {
    key: "focus_mode",
    title: "Focus Mode",
    description: "Complete 5 tasks in one day",
    rarity: "common",
    category: "daily",
    xpReward: 50,
    predicate: (ctx) => ctx.tasksCompletedToday >= 5,
  },
  {
    key: "super_productive",
    title: "Super Productive",
    description: "Complete 10 tasks in one day",
    rarity: "rare",
    category: "daily",
    xpReward: 100,
    predicate: (ctx) => ctx.tasksCompletedToday >= 10,
  },

  // Speed achievements
  {
    key: "speed_demon",
    title: "Speed Demon",
    description: "Complete 3 tasks within 1 hour",
    rarity: "rare",
    category: "speed",
    xpReward: 75,
    predicate: (ctx) => {
      if (!ctx.currentTask || !ctx.currentTask.createdAt) return false;
      const completedAt = ctx.currentTask.completedAt || new Date();
      const timeDiff = completedAt.getTime() - ctx.currentTask.createdAt.getTime();
      return timeDiff <= 3600000; // 1 hour in milliseconds
    },
  },

  // Task creation achievements
  {
    key: "organized",
    title: "Organized",
    description: "Create 20 tasks",
    rarity: "common",
    category: "creation",
    xpReward: 30,
    predicate: (ctx) => ctx.totalTasksCreated >= 20,
  },
  {
    key: "planner",
    title: "Master Planner",
    description: "Create 50 tasks",
    rarity: "rare",
    category: "creation",
    xpReward: 80,
    predicate: (ctx) => ctx.totalTasksCreated >= 50,
  },

  // Level progression achievements
  {
    key: "level_5",
    title: "Rising Star",
    description: "Reach level 5",
    rarity: "common",
    category: "progression",
    xpReward: 50,
    predicate: (ctx) => ctx.currentLevel >= 5,
  },
  {
    key: "level_10",
    title: "Experienced",
    description: "Reach level 10",
    rarity: "rare",
    category: "progression",
    xpReward: 100,
    themeUnlock: "scholar",
    predicate: (ctx) => ctx.currentLevel >= 10,
  },
  {
    key: "level_25",
    title: "Expert",
    description: "Reach level 25",
    rarity: "epic",
    category: "progression",
    xpReward: 250,
    themeUnlock: "champion",
    predicate: (ctx) => ctx.currentLevel >= 25,
  },
  {
    key: "level_50",
    title: "Master",
    description: "Reach level 50",
    rarity: "legendary",
    category: "progression",
    xpReward: 500,
    themeUnlock: "diamond",
    predicate: (ctx) => ctx.currentLevel >= 50,
  },

  // Meta achievements
  {
    key: "completionist",
    title: "Completionist",
    description: "Unlock 10 achievements",
    rarity: "epic",
    category: "meta",
    xpReward: 200,
    predicate: (ctx) => ctx.achievementsUnlocked >= 10,
  },
  {
    key: "achievement_hunter",
    title: "Achievement Hunter",
    description: "Unlock 20 achievements",
    rarity: "epic",
    category: "meta",
    xpReward: 500,
    themeUnlock: "hunter",
    predicate: (ctx) => ctx.achievementsUnlocked >= 20,
  },
  {
    key: "platinum",
    title: "Platinum Trophy",
    description: "Unlock all achievements",
    rarity: "legendary",
    category: "meta",
    xpReward: 5000,
    themeUnlock: "platinum",
    predicate: (ctx) => ctx.achievementsUnlocked >= 32, // Total number of achievements
  },
];

/**
 * Get achievement configuration by key
 */
export function getAchievementConfig(key: string): AchievementConfig | undefined {
  return ACHIEVEMENTS_CONFIG.find(config => config.key === key);
}

/**
 * Get all achievements for a category
 */
export function getAchievementsByCategory(category: string): AchievementConfig[] {
  return ACHIEVEMENTS_CONFIG.filter(config => config.category === category);
}

/**
 * Get all achievements for a rarity
 */
export function getAchievementsByRarity(rarity: string): AchievementConfig[] {
  return ACHIEVEMENTS_CONFIG.filter(config => config.rarity === rarity);
}