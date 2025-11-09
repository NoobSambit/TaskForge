/**
 * Integration test for achievements engine
 * 
 * This test verifies that the achievements system works end-to-end
 * with the XP awarding system and event emission.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock everything before imports
vi.mock("../../../models/User", () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      _id: "user123",
      level: 5,
      currentStreak: 7,
      xp: 500,
      xpMultiplier: 1.0,
    }),
  },
}));

vi.mock("../../../models/UserAchievement", () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockImplementation(function(this: any, data: any) {
      Object.assign(this, data);
      this.save = vi.fn().mockResolvedValue(undefined);
    }),
  },
}));

vi.mock("../../../models/ActivityLog", () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    countDocuments: vi.fn().mockResolvedValue(10),
  },
}));

vi.mock("../../../models/Task", () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      _id: "task123",
      userId: "user123",
      priority: 3,
      difficulty: "medium",
      tags: ["urgent"],
      status: "done",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(),
    }),
    countDocuments: vi.fn().mockResolvedValue(25),
  },
}));

vi.mock("../../gamification/awardXp", () => ({
  awardXpForTaskCompletion: vi.fn().mockResolvedValue({
    success: true,
    xpAwarded: 10,
    totalXp: 510,
    newLevel: 5,
  } as any),
}));

vi.mock("../../gamification/events", () => ({
  gamificationEvents: {
    emitAchievementUnlocked: vi.fn(),
  },
}));

import { evaluateAchievements } from "../../gamification/achievementsEngine";
import { buildTaskCompletionContext } from "../../gamification/achievementContext";

describe("Achievements Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should unlock achievements when user completes task", async () => {
    // Arrange
    const userId = "user123";
    const taskId = "task123";

    // Act
    const context = await buildTaskCompletionContext(userId, taskId);
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

  it("should emit achievement unlocked events", async () => {
    // Arrange
    const userId = "user123";
    const taskId = "task123";

    const { gamificationEvents } = await import("../../gamification/events");

    // Act
    const context = await buildTaskCompletionContext(userId, taskId);
    await evaluateAchievements("task_completed", context);

    // Assert
    expect(gamificationEvents.emitAchievementUnlocked).toHaveBeenCalledTimes(result.newlyUnlocked.length);
    
    // Check that events were emitted for each unlocked achievement
    result.newlyUnlocked.forEach(unlock => {
      expect(gamificationEvents.emitAchievementUnlocked).toHaveBeenCalledWith({
        userId,
        achievement: unlock,
        timestamp: expect.any(Date),
      });
    });
  });
});