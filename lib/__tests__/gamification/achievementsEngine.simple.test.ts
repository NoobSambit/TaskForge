/**
 * Simple Achievements Engine Test - Core functionality only
 */

// Mock models before imports
vi.mock("../../../models/UserAchievement", () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../../models/ActivityLog", () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock("../../gamification/awardXp", () => ({
  awardXpForTaskCompletion: vi.fn().mockResolvedValue({
    success: true,
    xpAwarded: 10,
    totalXp: 10,
    newLevel: 1,
  } as any),
}));

// Mock gamification events
vi.mock("../../gamification/events", () => ({
  gamificationEvents: {
    emitAchievementUnlocked: vi.fn(),
  },
}));

import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  evaluateAchievements, 
  unlockAchievement, 
  hasAchievement, 
  getUserAchievements,
  getUserAchievementStats,
  evaluateAchievementsByCategory
} from "../../gamification/achievementsEngine";
import { buildAchievementContext } from "../../gamification/achievementContext";
import { gamificationEvents } from "../../gamification/events";
import UserAchievement from "../../../models/UserAchievement";
import ActivityLog from "../../../models/ActivityLog";
import { ACHIEVEMENTS_CONFIG } from "../../gamification/achievementsConfig";
import type { AchievementContext } from "../../gamification/types";

// Get mocked instances
const mockUserAchievement = vi.mocked(UserAchievement);
const mockActivityLog = vi.mocked(ActivityLog);
const mockGamificationEvents = vi.mocked(gamificationEvents);

describe("Achievements Engine - Core Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should have correct number of achievements configured", () => {
      expect(ACHIEVEMENTS_CONFIG).toHaveLength(32);
      
      const achievementKeys = ACHIEVEMENTS_CONFIG.map(a => a.key);
      expect(achievementKeys).toContain("first_task");
      expect(achievementKeys).toContain("task_100");
      expect(achievementKeys).toContain("streak_30");
      expect(achievementKeys).toContain("level_50");
      expect(achievementKeys).toContain("platinum");
    });

    it("should validate achievement structure", () => {
      ACHIEVEMENTS_CONFIG.forEach(achievement => {
        expect(achievement.key).toBeDefined();
        expect(achievement.title).toBeDefined();
        expect(achievement.description).toBeDefined();
        expect(achievement.rarity).toMatch(/^(common|rare|epic|legendary)$/);
        expect(achievement.category).toBeDefined();
        expect(typeof achievement.xpReward).toBe("number");
        expect(achievement.xpReward).toBeGreaterThanOrEqual(0);
        expect(typeof achievement.predicate).toBe("function");
      });
    });

    it("should check hasAchievement correctly", async () => {
      // Mock achievement exists
      mockUserAchievement.findOne.mockResolvedValue({} as any);
      
      const result = await hasAchievement("user123", "first_task");
      
      expect(result).toBe(true);
      expect(mockUserAchievement.findOne).toHaveBeenCalledWith({
        userId: "user123",
        achievementKey: "first_task",
      });
    });

    it("should return false for non-existent achievement", async () => {
      // Mock achievement doesn't exist
      mockUserAchievement.findOne.mockResolvedValue(null);
      
      const result = await hasAchievement("user123", "first_task");
      
      expect(result).toBe(false);
    });
  });

  describe("achievement predicates", () => {
    it("should evaluate first_task predicate correctly", () => {
      const config = ACHIEVEMENTS_CONFIG.find(a => a.key === "first_task")!;
      
      // Should unlock with 1 task completed
      expect(config.predicate({
        userId: "user123",
        currentLevel: 1,
        currentStreak: 0,
        totalTasksCompleted: 1,
        totalTasksCreated: 0,
        highPriorityTasksCompleted: 0,
        tasksCompletedToday: 1,
        achievementsUnlocked: 0,
        eventType: "task_completed",
      })).toBe(true);

      // Should not unlock with 0 tasks completed
      expect(config.predicate({
        userId: "user123",
        currentLevel: 1,
        currentStreak: 0,
        totalTasksCompleted: 0,
        totalTasksCreated: 0,
        highPriorityTasksCompleted: 0,
        tasksCompletedToday: 0,
        achievementsUnlocked: 0,
        eventType: "task_completed",
      })).toBe(false);
    });

    it("should evaluate level_10 predicate correctly", () => {
      const config = ACHIEVEMENTS_CONFIG.find(a => a.key === "level_10")!;
      
      // Should unlock at level 10
      expect(config.predicate({
        userId: "user123",
        currentLevel: 10,
        currentStreak: 0,
        totalTasksCompleted: 50,
        totalTasksCreated: 60,
        highPriorityTasksCompleted: 10,
        tasksCompletedToday: 3,
        achievementsUnlocked: 5,
        eventType: "level_up",
      })).toBe(true);

      // Should not unlock at level 9
      expect(config.predicate({
        userId: "user123",
        currentLevel: 9,
        currentStreak: 0,
        totalTasksCompleted: 45,
        totalTasksCreated: 50,
        highPriorityTasksCompleted: 8,
        tasksCompletedToday: 2,
        achievementsUnlocked: 4,
        eventType: "level_up",
      })).toBe(false);
    });

    it("should evaluate streak_7 predicate correctly", () => {
      const config = ACHIEVEMENTS_CONFIG.find(a => a.key === "streak_7")!;
      
      // Should unlock with 7-day streak
      expect(config.predicate({
        userId: "user123",
        currentLevel: 5,
        currentStreak: 7,
        totalTasksCompleted: 15,
        totalTasksCreated: 20,
        highPriorityTasksCompleted: 3,
        tasksCompletedToday: 2,
        achievementsUnlocked: 3,
        eventType: "task_completed",
      })).toBe(true);

      // Should not unlock with 6-day streak
      expect(config.predicate({
        userId: "user123",
        currentLevel: 4,
        currentStreak: 6,
        totalTasksCompleted: 12,
        totalTasksCreated: 15,
        highPriorityTasksCompleted: 2,
        tasksCompletedToday: 1,
        achievementsUnlocked: 2,
        eventType: "task_completed",
      })).toBe(false);
    });

    it("should evaluate early_bird predicate correctly", () => {
      const config = ACHIEVEMENTS_CONFIG.find(a => a.key === "early_bird")!;
      
      const earlyTime = new Date();
      earlyTime.setHours(7, 30, 0, 0);

      // Should unlock for task completed before 8 AM
      expect(config.predicate({
        userId: "user123",
        currentLevel: 2,
        currentStreak: 1,
        totalTasksCompleted: 5,
        totalTasksCreated: 6,
        highPriorityTasksCompleted: 1,
        tasksCompletedToday: 1,
        achievementsUnlocked: 1,
        currentTask: {
          id: "task123",
          priority: 2,
          difficulty: "easy",
          tags: [],
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
          completedAt: earlyTime,
        },
        eventType: "task_completed",
      })).toBe(true);

      const lateTime = new Date();
      lateTime.setHours(9, 30, 0, 0);

      // Should not unlock for task completed after 8 AM
      expect(config.predicate({
        userId: "user123",
        currentLevel: 2,
        currentStreak: 1,
        totalTasksCompleted: 5,
        totalTasksCreated: 6,
        highPriorityTasksCompleted: 1,
        tasksCompletedToday: 1,
        achievementsUnlocked: 1,
        currentTask: {
          id: "task124",
          priority: 2,
          difficulty: "easy",
          tags: [],
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
          completedAt: lateTime,
        },
        eventType: "task_completed",
      })).toBe(false);
    });

    it("should handle missing currentTask gracefully", () => {
      const config = ACHIEVEMENTS_CONFIG.find(a => a.key === "early_bird")!;
      
      // Should return false when no current task provided
      expect(config.predicate({
        userId: "user123",
        currentLevel: 2,
        currentStreak: 1,
        totalTasksCompleted: 5,
        totalTasksCreated: 6,
        highPriorityTasksCompleted: 1,
        tasksCompletedToday: 1,
        achievementsUnlocked: 1,
        eventType: "task_completed",
      })).toBe(false);
    });
  });
});