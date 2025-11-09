/**
 * Tests for gamification event system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { gamificationEvents, GAMIFICATION_EVENTS } from "../../gamification/events";
import type {
  XpAwardedEvent,
  LevelUpEvent,
  AchievementUnlockedEvent,
  StreakUpdateEvent,
  ThemeUnlockedEvent,
} from "../../gamification/events";

describe("GamificationEvents", () => {
  beforeEach(() => {
    // Remove all listeners before each test
    gamificationEvents.removeAllListeners();
  });

  afterEach(() => {
    // Clean up after each test
    gamificationEvents.removeAllListeners();
  });

  describe("XP Awarded Events", () => {
    it("should emit XP awarded event correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, mockListener);

      const eventData: XpAwardedEvent = {
        userId: "user123",
        taskId: "task456",
        xpDelta: 25,
        totalXp: 150,
        computation: {
          delta: 25,
          appliedRules: [
            { key: "base_xp", value: 10, description: "Base XP for medium task" },
            { key: "priority_multiplier", value: 1.2, description: "Priority 3 multiplier" },
          ],
        },
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };

      gamificationEvents.emitXpAwarded(eventData);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(eventData);
    });

    it("should handle multiple XP awarded event listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener1);
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener2);

      const eventData: XpAwardedEvent = {
        userId: "user123",
        taskId: "task456",
        xpDelta: 25,
        totalXp: 150,
        computation: { delta: 25, appliedRules: [] },
        timestamp: new Date(),
      };

      gamificationEvents.emitXpAwarded(eventData);

      expect(listener1).toHaveBeenCalledWith(eventData);
      expect(listener2).toHaveBeenCalledWith(eventData);
    });
  });

  describe("Level Up Events", () => {
    it("should emit level up event correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_UP, mockListener);

      const eventData: LevelUpEvent = {
        userId: "user123",
        oldLevel: 3,
        newLevel: 4,
        totalXp: 450,
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };

      gamificationEvents.emitLevelUp(eventData);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(eventData);
    });

    it("should handle multiple level-ups in sequence", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_UP, mockListener);

      const events: LevelUpEvent[] = [
        {
          userId: "user123",
          oldLevel: 3,
          newLevel: 4,
          totalXp: 450,
          timestamp: new Date(),
        },
        {
          userId: "user123",
          oldLevel: 4,
          newLevel: 5,
          totalXp: 650,
          timestamp: new Date(),
        },
      ];

      events.forEach(event => gamificationEvents.emitLevelUp(event));

      expect(mockListener).toHaveBeenCalledTimes(2);
      expect(mockListener).toHaveBeenNthCalledWith(1, events[0]);
      expect(mockListener).toHaveBeenNthCalledWith(2, events[1]);
    });
  });

  describe("Achievement Unlocked Events", () => {
    it("should emit achievement unlocked event correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, mockListener);

      const eventData: AchievementUnlockedEvent = {
        userId: "user123",
        achievement: {
          achievement: {
            key: "first_task",
            title: "First Task",
            description: "Complete your first task",
            rarity: "common",
            category: "milestones",
            xpReward: 10,
          },
          unlockedAt: new Date("2024-01-15T10:30:00Z"),
          xpRewardApplied: true,
          xpRewardAmount: 10,
        },
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };

      gamificationEvents.emitAchievementUnlocked(eventData);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(eventData);
    });
  });

  describe("Streak Update Events", () => {
    it("should emit streak update event correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.STREAK_UPDATE, mockListener);

      const eventData: StreakUpdateEvent = {
        userId: "user123",
        oldStreak: 5,
        newStreak: 6,
        lastStreakDate: new Date("2024-01-15T10:30:00Z"),
        timestamp: new Date("2024-01-16T10:30:00Z"),
      };

      gamificationEvents.emitStreakUpdate(eventData);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(eventData);
    });

    it("should handle streak reset events", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.STREAK_UPDATE, mockListener);

      const eventData: StreakUpdateEvent = {
        userId: "user123",
        oldStreak: 10,
        newStreak: 0,
        lastStreakDate: new Date("2024-01-10T10:30:00Z"),
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };

      gamificationEvents.emitStreakUpdate(eventData);

      expect(mockListener).toHaveBeenCalledWith(eventData);
    });
  });

  describe("Theme Unlocked Events", () => {
    it("should emit theme unlocked event correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.on(GAMIFICATION_EVENTS.THEME_UNLOCKED, mockListener);

      const eventData: ThemeUnlockedEvent = {
        userId: "user123",
        themeId: "neon",
        themeName: "Neon Glow",
        unlockedAt: new Date("2024-01-15T10:30:00Z"),
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };

      gamificationEvents.emitThemeUnlocked(eventData);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(eventData);
    });
  });

  describe("Event Listener Management", () => {
    it("should remove specific event listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener1);
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener2);

      const eventData: XpAwardedEvent = {
        userId: "user123",
        taskId: "task456",
        xpDelta: 25,
        totalXp: 150,
        computation: { delta: 25, appliedRules: [] },
        timestamp: new Date(),
      };

      gamificationEvents.emitXpAwarded(eventData);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      gamificationEvents.off(GAMIFICATION_EVENTS.XP_AWARDED, listener1);
      gamificationEvents.emitXpAwarded(eventData);

      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledTimes(2); // Should be called again
    });

    it("should handle once listeners correctly", () => {
      const mockListener = vi.fn();
      gamificationEvents.once(GAMIFICATION_EVENTS.XP_AWARDED, mockListener);

      const eventData: XpAwardedEvent = {
        userId: "user123",
        taskId: "task456",
        xpDelta: 25,
        totalXp: 150,
        computation: { delta: 25, appliedRules: [] },
        timestamp: new Date(),
      };

      gamificationEvents.emitXpAwarded(eventData);
      expect(mockListener).toHaveBeenCalledTimes(1);

      gamificationEvents.emitXpAwarded(eventData);
      expect(mockListener).toHaveBeenCalledTimes(1); // Should still only be called once
    });

    it("should get listener count correctly", () => {
      expect(gamificationEvents.listenerCount(GAMIFICATION_EVENTS.XP_AWARDED)).toBe(0);

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener1);
      expect(gamificationEvents.listenerCount(GAMIFICATION_EVENTS.XP_AWARDED)).toBe(1);

      gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, listener2);
      expect(gamificationEvents.listenerCount(GAMIFICATION_EVENTS.XP_AWARDED)).toBe(2);

      gamificationEvents.off(GAMIFICATION_EVENTS.XP_AWARDED, listener1);
      expect(gamificationEvents.listenerCount(GAMIFICATION_EVENTS.XP_AWARDED)).toBe(1);
    });
  });

  describe("Event Constants", () => {
    it("should have correct event constants", () => {
      expect(GAMIFICATION_EVENTS.XP_AWARDED).toBe("xpAwarded");
      expect(GAMIFICATION_EVENTS.LEVEL_UP).toBe("levelUp");
      expect(GAMIFICATION_EVENTS.LEVEL_CHECK_PENDING).toBe("levelCheckPending");
      expect(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED).toBe("achievementUnlocked");
      expect(GAMIFICATION_EVENTS.STREAK_UPDATE).toBe("streakUpdate");
      expect(GAMIFICATION_EVENTS.THEME_UNLOCKED).toBe("themeUnlocked");
    });
  });
});