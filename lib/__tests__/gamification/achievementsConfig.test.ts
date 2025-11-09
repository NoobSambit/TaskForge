/**
 * Achievements Configuration Tests
 */

import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENTS_CONFIG,
  getAchievementConfig,
  getAchievementsByCategory,
  getAchievementsByRarity,
} from "../../gamification/achievementsConfig";
import type { AchievementConfig } from "../../gamification/achievementsConfig";

describe("Achievements Configuration", () => {
  describe("ACHIEVEMENTS_CONFIG", () => {
    it("should contain all expected achievements", () => {
      expect(ACHIEVEMENTS_CONFIG).toHaveLength(32); // Total number of achievements
      
      // Check for key achievements
      const achievementKeys = ACHIEVEMENTS_CONFIG.map(a => a.key);
      expect(achievementKeys).toContain("first_task");
      expect(achievementKeys).toContain("task_100");
      expect(achievementKeys).toContain("streak_30");
      expect(achievementKeys).toContain("early_bird");
      expect(achievementKeys).toContain("night_owl");
      expect(achievementKeys).toContain("level_50");
      expect(achievementKeys).toContain("platinum");
    });

    it("should have valid achievement structure", () => {
      ACHIEVEMENTS_CONFIG.forEach((achievement) => {
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

    it("should have unique achievement keys", () => {
      const keys = ACHIEVEMENTS_CONFIG.map(a => a.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have reasonable XP rewards by rarity", () => {
      const byRarity = ACHIEVEMENTS_CONFIG.reduce((acc, achievement) => {
        if (!acc[achievement.rarity]) {
          acc[achievement.rarity] = [];
        }
        acc[achievement.rarity].push(achievement.xpReward);
        return acc;
      }, {} as Record<string, number[]>);

      // Common achievements should have lower XP rewards
      if (byRarity.common) {
        byRarity.common.forEach(xp => {
          expect(xp).toBeLessThanOrEqual(100);
        });
      }

      // Legendary achievements should have higher XP rewards
      if (byRarity.legendary) {
        byRarity.legendary.forEach(xp => {
          expect(xp).toBeGreaterThanOrEqual(500);
        });
      }
    });
  });

  describe("getAchievementConfig", () => {
    it("should return achievement config by key", () => {
      const config = getAchievementConfig("first_task");
      
      expect(config).toBeDefined();
      expect(config!.key).toBe("first_task");
      expect(config!.title).toBe("Getting Started");
      expect(config!.rarity).toBe("common");
      expect(config!.category).toBe("tasks");
      expect(config!.xpReward).toBe(10);
    });

    it("should return undefined for non-existent achievement", () => {
      const config = getAchievementConfig("non_existent");
      expect(config).toBeUndefined();
    });
  });

  describe("getAchievementsByCategory", () => {
    it("should return achievements by category", () => {
      const tasks = getAchievementsByCategory("tasks");
      const streaks = getAchievementsByCategory("streaks");
      const time = getAchievementsByCategory("time");
      const progression = getAchievementsByCategory("progression");
      const meta = getAchievementsByCategory("meta");

      expect(tasks.length).toBeGreaterThan(0);
      expect(streaks.length).toBeGreaterThan(0);
      expect(time.length).toBeGreaterThan(0);
      expect(progression.length).toBeGreaterThan(0);
      expect(meta.length).toBeGreaterThan(0);

      // Verify all returned achievements belong to the correct category
      tasks.forEach(a => expect(a.category).toBe("tasks"));
      streaks.forEach(a => expect(a.category).toBe("streaks"));
      time.forEach(a => expect(a.category).toBe("time"));
      progression.forEach(a => expect(a.category).toBe("progression"));
      meta.forEach(a => expect(a.category).toBe("meta"));
    });

    it("should return empty array for non-existent category", () => {
      const achievements = getAchievementsByCategory("non_existent");
      expect(achievements).toEqual([]);
    });
  });

  describe("getAchievementsByRarity", () => {
    it("should return achievements by rarity", () => {
      const common = getAchievementsByRarity("common");
      const rare = getAchievementsByRarity("rare");
      const epic = getAchievementsByRarity("epic");
      const legendary = getAchievementsByRarity("legendary");

      expect(common.length).toBeGreaterThan(0);
      expect(rare.length).toBeGreaterThan(0);
      expect(epic.length).toBeGreaterThan(0);
      expect(legendary.length).toBeGreaterThan(0);

      // Verify all returned achievements have the correct rarity
      common.forEach(a => expect(a.rarity).toBe("common"));
      rare.forEach(a => expect(a.rarity).toBe("rare"));
      epic.forEach(a => expect(a.rarity).toBe("epic"));
      legendary.forEach(a => expect(a.rarity).toBe("legendary"));
    });

    it("should return empty array for non-existent rarity", () => {
      const achievements = getAchievementsByRarity("mythic");
      expect(achievements).toEqual([]);
    });
  });

  describe("Achievement Predicates", () => {
    describe("Task completion predicates", () => {
      it("should evaluate first_task correctly", () => {
        const config = getAchievementConfig("first_task")!;
        
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

      it("should evaluate task_100 correctly", () => {
        const config = getAchievementConfig("task_100")!;
        
        // Should unlock with 100+ tasks completed
        expect(config.predicate({
          userId: "user123",
          currentLevel: 10,
          currentStreak: 5,
          totalTasksCompleted: 100,
          totalTasksCreated: 120,
          highPriorityTasksCompleted: 20,
          tasksCompletedToday: 3,
          achievementsUnlocked: 5,
          eventType: "task_completed",
        })).toBe(true);

        // Should not unlock with 99 tasks completed
        expect(config.predicate({
          userId: "user123",
          currentLevel: 9,
          currentStreak: 5,
          totalTasksCompleted: 99,
          totalTasksCreated: 100,
          highPriorityTasksCompleted: 15,
          tasksCompletedToday: 2,
          achievementsUnlocked: 4,
          eventType: "task_completed",
        })).toBe(false);
      });
    });

    describe("Streak predicates", () => {
      it("should evaluate streak_30 correctly", () => {
        const config = getAchievementConfig("streak_30")!;
        
        // Should unlock with 30+ day streak
        expect(config.predicate({
          userId: "user123",
          currentLevel: 8,
          currentStreak: 30,
          totalTasksCompleted: 60,
          totalTasksCreated: 70,
          highPriorityTasksCompleted: 10,
          tasksCompletedToday: 2,
          achievementsUnlocked: 8,
          eventType: "task_completed",
        })).toBe(true);

        // Should not unlock with 29 day streak
        expect(config.predicate({
          userId: "user123",
          currentLevel: 7,
          currentStreak: 29,
          totalTasksCompleted: 58,
          totalTasksCreated: 65,
          highPriorityTasksCompleted: 9,
          tasksCompletedToday: 2,
          achievementsUnlocked: 7,
          eventType: "task_completed",
        })).toBe(false);
      });
    });

    describe("Time-based predicates", () => {
      it("should evaluate early_bird correctly", () => {
        const config = getAchievementConfig("early_bird")!;
        
        const earlyTime = new Date();
        earlyTime.setHours(7, 30, 0, 0);

        // Should unlock for tasks completed before 8 AM
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

        // Should not unlock for tasks completed after 8 AM
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
        const config = getAchievementConfig("early_bird")!;
        
        // Should return false when no current task
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

    describe("Speed predicates", () => {
      it("should evaluate speed_demon correctly", () => {
        const config = getAchievementConfig("speed_demon")!;
        
        // Should unlock for tasks completed within 1 hour
        expect(config.predicate({
          userId: "user123",
          currentLevel: 3,
          currentStreak: 2,
          totalTasksCompleted: 15,
          totalTasksCreated: 18,
          highPriorityTasksCompleted: 3,
          tasksCompletedToday: 3,
          achievementsUnlocked: 3,
          currentTask: {
            id: "task123",
            priority: 3,
            difficulty: "medium",
            tags: [],
            createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            completedAt: new Date(),
          },
          eventType: "task_completed",
        })).toBe(true);

        // Should not unlock for tasks completed after 1 hour
        expect(config.predicate({
          userId: "user123",
          currentLevel: 3,
          currentStreak: 2,
          totalTasksCompleted: 15,
          totalTasksCreated: 18,
          highPriorityTasksCompleted: 3,
          tasksCompletedToday: 2,
          achievementsUnlocked: 2,
          currentTask: {
            id: "task124",
            priority: 3,
            difficulty: "medium",
            tags: [],
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            completedAt: new Date(),
          },
          eventType: "task_completed",
        })).toBe(false);
      });
    });

    describe("Level predicates", () => {
      it("should evaluate level_25 correctly", () => {
        const config = getAchievementConfig("level_25")!;
        
        // Should unlock at level 25
        expect(config.predicate({
          userId: "user123",
          currentLevel: 25,
          currentStreak: 10,
          totalTasksCompleted: 100,
          totalTasksCreated: 120,
          highPriorityTasksCompleted: 25,
          tasksCompletedToday: 5,
          achievementsUnlocked: 10,
          eventType: "level_up",
        })).toBe(true);

        // Should not unlock at level 24
        expect(config.predicate({
          userId: "user123",
          currentLevel: 24,
          currentStreak: 9,
          totalTasksCompleted: 95,
          totalTasksCreated: 110,
          highPriorityTasksCompleted: 20,
          tasksCompletedToday: 3,
          achievementsUnlocked: 9,
          eventType: "level_up",
        })).toBe(false);
      });
    });

    describe("Meta predicates", () => {
      it("should evaluate completionist correctly", () => {
        const config = getAchievementConfig("completionist")!;
        
        // Should unlock with 10+ achievements
        expect(config.predicate({
          userId: "user123",
          currentLevel: 10,
          currentStreak: 5,
          totalTasksCompleted: 50,
          totalTasksCreated: 60,
          highPriorityTasksCompleted: 12,
          tasksCompletedToday: 3,
          achievementsUnlocked: 10,
          eventType: "manual_check",
        })).toBe(true);

        // Should not unlock with 9 achievements
        expect(config.predicate({
          userId: "user123",
          currentLevel: 9,
          currentStreak: 4,
          totalTasksCompleted: 45,
          totalTasksCreated: 50,
          highPriorityTasksCompleted: 10,
          tasksCompletedToday: 2,
          achievementsUnlocked: 9,
          eventType: "manual_check",
        })).toBe(false);
      });
    });
  });
});