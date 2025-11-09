/**
 * Achievements Engine Tests
 */

// Mock the models before imports
vi.mock("../../../models/UserAchievement", () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn(),
    }),
    find: vi.fn(),
    countDocuments: vi.fn(),
    // Mock constructor
    constructor: vi.fn().mockImplementation(function(this: any, data: any) {
      Object.assign(this, data);
      return this;
    }),
    // Mock save method
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../../models/ActivityLog", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("../../gamification/awardXp", () => ({
  awardXpForTaskCompletion: vi.fn(),
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

describe("Achievements Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateAchievements", () => {
    it("should unlock achievements when criteria are met", async () => {
      // Arrange
      const userId = "user123";
      const context: AchievementContext = {
        userId,
        currentLevel: 5,
        currentStreak: 7,
        totalTasksCompleted: 10,
        totalTasksCreated: 25,
        highPriorityTasksCompleted: 3,
        tasksCompletedToday: 5,
        achievementsUnlocked: 2,
        currentTask: {
          id: "task123",
          priority: 3,
          difficulty: "medium",
          tags: ["urgent"],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          completedAt: new Date(),
        },
        eventType: "task_completed",
      };

      // Mock no existing achievements
      mockUserAchievement.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      // Mock successful save operations
      mockUserAchievement.create.mockResolvedValue({});

      mockActivityLog.create.mockResolvedValue(undefined);
      mockGamificationEvents.emitAchievementUnlocked.mockReturnValue(undefined);

      // Act
      const result = await evaluateAchievements("task_completed", context);

      // Assert
      expect(result.newlyUnlocked.length).toBeGreaterThan(0);
      expect(result.totalXpRewarded).toBeGreaterThan(0);
      
      // Should unlock first_task, task_5, task_10, streak_7, level_5, focus_mode, etc.
      const unlockedKeys = result.newlyUnlocked.map(u => u.achievement.key);
      expect(unlockedKeys).toContain("first_task");
      expect(unlockedKeys).toContain("task_5");
      expect(unlockedKeys).toContain("task_10");
      expect(unlockedKeys).toContain("streak_7");
      expect(unlockedKeys).toContain("level_5");
      expect(unlockedKeys).toContain("focus_mode");
    });

    it("should not unlock already unlocked achievements", async () => {
      // Arrange
      const userId = "user123";
      const context: AchievementContext = {
        userId,
        currentLevel: 1,
        currentStreak: 0,
        totalTasksCompleted: 0,
        totalTasksCreated: 0,
        highPriorityTasksCompleted: 0,
        tasksCompletedToday: 0,
        achievementsUnlocked: 0,
        eventType: "task_completed",
      };

      // Mock first_task already unlocked
      mockUserAchievement.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { achievementKey: "first_task" },
        ]),
      });

      // Act
      const result = await evaluateAchievements("task_completed", context);

      // Assert
      expect(result.newlyUnlocked).toHaveLength(0);
      expect(result.alreadyUnlocked).toContain("first_task");
    });

    it("should handle achievement evaluation errors gracefully", async () => {
      // Arrange
      const userId = "user123";
      const context: AchievementContext = {
        userId,
        currentLevel: 1,
        currentStreak: 0,
        totalTasksCompleted: 0,
        totalTasksCreated: 0,
        highPriorityTasksCompleted: 0,
        tasksCompletedToday: 0,
        achievementsUnlocked: 0,
        eventType: "task_completed",
      };

      // Mock database error
      mockUserAchievement.find.mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("Database error")),
      });

      // Act
      const result = await evaluateAchievements("task_completed", context);

      // Assert
      expect(result.newlyUnlocked).toHaveLength(0);
      // All achievements should be in notUnlocked due to error
      expect(result.notUnlocked.length).toBeGreaterThan(0);
    });
  });

  describe("unlockAchievement", () => {
    it("should unlock achievement and award XP", async () => {
      // Arrange
      const userId = "user123";
      const achievement = {
        key: "first_task",
        title: "Getting Started",
        description: "Complete your first task",
        rarity: "common" as const,
        category: "tasks",
        xpReward: 10,
      };

      // Mock not already unlocked
      mockUserAchievement.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      // Mock successful operations
      const mockSave = vi.fn().mockResolvedValue(undefined);
      (mockUserAchievement as any).constructor.mockImplementation(function(this: any, data: any) {
        Object.assign(this, data);
        this.save = mockSave;
      });

      const { awardXpForTaskCompletion } = await import("../../gamification/awardXp");
      vi.mocked(awardXpForTaskCompletion).mockResolvedValue({
        success: true,
        xpAwarded: 10,
        totalXp: 10,
        newLevel: 1,
      } as any);

      mockActivityLog.create.mockResolvedValue(undefined);

      // Act
      const result = await unlockAchievement(userId, achievement);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.achievement.key).toBe("first_task");
      expect(result!.xpRewardApplied).toBe(true);
      expect(result!.xpRewardAmount).toBe(10);
      expect(mockUserAchievement.findOne).toHaveBeenCalledWith({
        userId,
        achievementKey: "first_task",
      });
      expect(awardXpForTaskCompletion).toHaveBeenCalledWith(
        expect.stringMatching(/^achievement_first_task_\d+$/),
        userId,
        expect.objectContaining({
          xpOverride: 10,
          reason: "achievement_unlock:first_task",
        })
      );
    });

    it("should return null if achievement already unlocked", async () => {
      // Arrange
      const userId = "user123";
      const achievement = {
        key: "first_task",
        title: "Getting Started",
        description: "Complete your first task",
        rarity: "common" as const,
        category: "tasks",
        xpReward: 10,
      };

      // Mock already unlocked
      mockUserAchievement.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({}),
      });

      // Act
      const result = await unlockAchievement(userId, achievement);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle XP awarding failure gracefully", async () => {
      // Arrange
      const userId = "user123";
      const achievement = {
        key: "first_task",
        title: "Getting Started",
        description: "Complete your first task",
        rarity: "common" as const,
        category: "tasks",
        xpReward: 10,
      };

      // Mock not already unlocked
      mockUserAchievement.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      // Mock successful save but XP awarding failure
      const mockSave = vi.fn().mockResolvedValue(undefined);
      (mockUserAchievement as any).constructor.mockImplementation(function(this: any, data: any) {
        Object.assign(this, data);
        this.save = mockSave;
      });

      const { awardXpForTaskCompletion } = await import("../../gamification/awardXp");
      vi.mocked(awardXpForTaskCompletion).mockRejectedValue(new Error("XP awarding failed"));

      mockActivityLog.create.mockResolvedValue(undefined);

      // Act
      const result = await unlockAchievement(userId, achievement);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.achievement.key).toBe("first_task");
      expect(result!.xpRewardApplied).toBe(false);
      expect(result!.xpRewardAmount).toBe(0);
    });
  });

  describe("hasAchievement", () => {
    it("should return true if achievement is unlocked", async () => {
      // Arrange
      const userId = "user123";
      const achievementKey = "first_task";

      mockUserAchievement.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({}),
      });

      // Act
      const result = await hasAchievement(userId, achievementKey);

      // Assert
      expect(result).toBe(true);
      expect(mockUserAchievement.findOne).toHaveBeenCalledWith({
        userId,
        achievementKey,
      });
    });

    it("should return false if achievement is not unlocked", async () => {
      // Arrange
      const userId = "user123";
      const achievementKey = "first_task";

      mockUserAchievement.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      // Act
      const result = await hasAchievement(userId, achievementKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getUserAchievements", () => {
    it("should return user's achievements sorted by unlock date", async () => {
      // Arrange
      const userId = "user123";
      const mockAchievements = [
        { achievementKey: "task_10", unlockedAt: new Date("2023-01-10") },
        { achievementKey: "first_task", unlockedAt: new Date("2023-01-01") },
        { achievementKey: "task_5", unlockedAt: new Date("2023-01-05") },
      ];

      mockUserAchievement.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockAchievements),
          }),
        }),
      });

      // Act
      const result = await getUserAchievements(userId);

      // Assert
      expect(result).toEqual([
        { achievementKey: "task_10", unlockedAt: new Date("2023-01-10") },
        { achievementKey: "task_5", unlockedAt: new Date("2023-01-05") },
        { achievementKey: "first_task", unlockedAt: new Date("2023-01-01") },
      ]);
      expect(mockUserAchievement.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe("getUserAchievementStats", () => {
    it("should return achievement statistics", async () => {
      // Arrange
      const userId = "user123";
      const mockRecentUnlocks = [
        { achievementKey: "task_10", unlockedAt: new Date("2023-01-10") },
        { achievementKey: "task_5", unlockedAt: new Date("2023-01-05") },
      ];

      mockUserAchievement.countDocuments
        .mockResolvedValueOnce(5) // totalUnlocked
        .mockResolvedValueOnce(5); // total count for recentUnlocks query
      
      mockUserAchievement.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockRecentUnlocks),
            }),
          }),
        }),
      });

      // Act
      const result = await getUserAchievementStats(userId);

      // Assert
      expect(result).toEqual({
        totalUnlocked: 5,
        totalAchievements: ACHIEVEMENTS_CONFIG.length,
        completionPercentage: Math.round((5 / ACHIEVEMENTS_CONFIG.length) * 100),
        recentUnlocks: mockRecentUnlocks,
      });
    });
  });

  describe("evaluateAchievementsByCategory", () => {
    it("should only evaluate achievements from specified category", async () => {
      // Arrange
      const userId = "user123";
      const context: AchievementContext = {
        userId,
        currentLevel: 5,
        currentStreak: 0,
        totalTasksCompleted: 10,
        totalTasksCreated: 0,
        highPriorityTasksCompleted: 0,
        tasksCompletedToday: 0,
        achievementsUnlocked: 0,
        eventType: "task_completed",
      };

      mockUserAchievement.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });
      mockUserAchievement.create.mockResolvedValue({});
      mockActivityLog.create.mockResolvedValue(undefined);
      mockGamificationEvents.emitAchievementUnlocked.mockReturnValue(undefined);

      // Act
      const result = await evaluateAchievementsByCategory("task_completed", context, "tasks");

      // Assert
      expect(result.newlyUnlocked.length).toBeGreaterThan(0);
      
      // Should only unlock task-related achievements
      const unlockedKeys = result.newlyUnlocked.map(u => u.achievement.key);
      expect(unlockedKeys.some(key => key.startsWith("task_"))).toBe(true);
      
      // Should not unlock streak achievements
      expect(unlockedKeys.some(key => key.startsWith("streak_"))).toBe(false);
    });
  });
});