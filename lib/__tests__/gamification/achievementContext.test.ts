/**
 * Achievement Context Builder Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildAchievementContext,
  buildTaskCompletionContext,
  buildTaskCreationContext,
  buildStreakUpdateContext,
  buildLevelUpContext,
  buildManualCheckContext,
} from "../../gamification/achievementContext";
import type { AchievementContext } from "../../gamification/types";

// Mock the models
vi.mock("../../../models/User");
vi.mock("../../../models/ActivityLog");
vi.mock("../../../models/Task");
vi.mock("../../../models/UserAchievement");

describe("Achievement Context Builders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAchievementContext", () => {
    it("should build basic achievement context", async () => {
      // Arrange
      const userId = "user123";
      const mockUser = {
        _id: userId,
        level: 5,
        currentStreak: 7,
      };

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue(mockUser);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(10) // totalTasksCompleted
        .mockResolvedValueOnce(5)  // tasksCompletedToday
        .mockResolvedValueOnce(3); // highPriorityTasksCompleted
      vi.mocked(Task.countDocuments).mockResolvedValue(25); // totalTasksCreated
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(2); // achievementsUnlocked

      const currentTask = {
        id: "task123",
        priority: 3,
        difficulty: "medium",
        tags: ["urgent"],
        createdAt: new Date(),
        completedAt: new Date(),
      };

      // Act
      const context = await buildAchievementContext(
        userId,
        "task_completed",
        currentTask,
        { taskId: "task123" }
      );

      // Assert
      expect(context).toEqual({
        userId,
        currentLevel: 5,
        currentStreak: 7,
        totalTasksCompleted: 10,
        totalTasksCreated: 25,
        highPriorityTasksCompleted: 3,
        tasksCompletedToday: 5,
        achievementsUnlocked: 2,
        currentTask,
        eventType: "task_completed",
        eventData: { taskId: "task123" },
      });
    });

    it("should throw error if user not found", async () => {
      // Arrange
      const userId = "nonexistent";

      const { default: User } = await import("../../../models/User");
      vi.mocked(User.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(buildAchievementContext(userId, "manual_check"))
        .rejects.toThrow("User not found: nonexistent");
    });
  });

  describe("buildTaskCompletionContext", () => {
    it("should build context for task completion", async () => {
      // Arrange
      const userId = "user123";
      const taskId = "task123";
      const mockTask = {
        _id: taskId,
        priority: 3,
        difficulty: "medium",
        tags: ["urgent"],
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
        completedAt: new Date(),
      };

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue({
        _id: userId,
        level: 3,
        currentStreak: 2,
      } as any);
      vi.mocked(Task.findById).mockResolvedValue(mockTask);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      vi.mocked(Task.countDocuments).mockResolvedValue(10);
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(1);

      // Act
      const context = await buildTaskCompletionContext(userId, taskId);

      // Assert
      expect(context.eventType).toBe("task_completed");
      expect(context.currentTask).toEqual({
        id: taskId,
        priority: 3,
        difficulty: "medium",
        tags: ["urgent"],
        createdAt: mockTask.createdAt,
        completedAt: mockTask.completedAt,
      });
      expect(context.eventData).toEqual({ taskId });
    });

    it("should throw error if task not found", async () => {
      // Arrange
      const userId = "user123";
      const taskId = "nonexistent";

      const { default: Task } = await import("../../../models/Task");
      vi.mocked(Task.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(buildTaskCompletionContext(userId, taskId))
        .rejects.toThrow("Task not found: nonexistent");
    });
  });

  describe("buildTaskCreationContext", () => {
    it("should build context for task creation", async () => {
      // Arrange
      const userId = "user123";
      const taskId = "task123";
      const mockTask = {
        _id: taskId,
        priority: 2,
        difficulty: "easy",
        tags: ["planning"],
        createdAt: new Date(),
        completedAt: undefined,
      };

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue({
        _id: userId,
        level: 2,
        currentStreak: 1,
      } as any);
      vi.mocked(Task.findById).mockResolvedValue(mockTask);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      vi.mocked(Task.countDocuments).mockResolvedValue(15);
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(0);

      // Act
      const context = await buildTaskCreationContext(userId, taskId);

      // Assert
      expect(context.eventType).toBe("task_created");
      expect(context.currentTask).toEqual({
        id: taskId,
        priority: 2,
        difficulty: "easy",
        tags: ["planning"],
        createdAt: mockTask.createdAt,
        completedAt: undefined,
      });
      expect(context.eventData).toEqual({ taskId });
    });
  });

  describe("buildStreakUpdateContext", () => {
    it("should build context for streak update", async () => {
      // Arrange
      const userId = "user123";
      const streakData = {
        currentStreak: 14,
        lastStreakDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      };

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue({
        _id: userId,
        level: 4,
        currentStreak: 14,
      } as any);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5);
      vi.mocked(Task.countDocuments).mockResolvedValue(30);
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(3);

      // Act
      const context = await buildStreakUpdateContext(userId, streakData);

      // Assert
      expect(context.eventType).toBe("streak_updated");
      expect(context.currentStreak).toBe(14);
      expect(context.eventData).toEqual(streakData);
    });
  });

  describe("buildLevelUpContext", () => {
    it("should build context for level up", async () => {
      // Arrange
      const userId = "user123";
      const levelData = {
        oldLevel: 4,
        newLevel: 5,
        totalXp: 350,
      };

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue({
        _id: userId,
        level: 5,
        currentStreak: 3,
      } as any);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(4);
      vi.mocked(Task.countDocuments).mockResolvedValue(35);
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(4);

      // Act
      const context = await buildLevelUpContext(userId, levelData);

      // Assert
      expect(context.eventType).toBe("level_up");
      expect(context.currentLevel).toBe(5);
      expect(context.eventData).toEqual(levelData);
    });
  });

  describe("buildManualCheckContext", () => {
    it("should build context for manual achievement check", async () => {
      // Arrange
      const userId = "user123";

      const { default: User } = await import("../../../models/User");
      const { default: ActivityLog } = await import("../../../models/ActivityLog");
      const { default: Task } = await import("../../../models/Task");
      const { default: UserAchievement } = await import("../../../models/UserAchievement");

      vi.mocked(User.findById).mockResolvedValue({
        _id: userId,
        level: 8,
        currentStreak: 5,
      } as any);
      vi.mocked(ActivityLog.countDocuments)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(8);
      vi.mocked(Task.countDocuments).mockResolvedValue(60);
      vi.mocked(UserAchievement.countDocuments).mockResolvedValue(8);

      // Act
      const context = await buildManualCheckContext(userId);

      // Assert
      expect(context.eventType).toBe("manual_check");
      expect(context.currentTask).toBeNull();
      expect(context.eventData).toBeUndefined();
    });
  });
});