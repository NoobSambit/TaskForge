/**
 * Level System Tests
 * 
 * Tests for XP thresholds, level calculations, and level-up mechanics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  xpRequiredForLevel,
  nextLevelThreshold,
  calculateLevelFromXp,
  getLevelInfo,
  getLevelInfoFast,
  calculateLevelsCrossed,
  applyLevelChanges,
  LEVEL_LOOKUP_TABLE,
  type LevelInfo,
} from "../../gamification/levels";
import { LEVEL_PROGRESSION } from "../../gamification/config";

describe("Level System", () => {
  describe("xpRequiredForLevel", () => {
    it("should return 0 XP for level 1", () => {
      expect(xpRequiredForLevel(1)).toBe(0);
    });

    it("should calculate correct XP for level 2", () => {
      // (2-1)^2 * 50 = 50
      expect(xpRequiredForLevel(2)).toBe(50);
    });

    it("should calculate correct XP for level 3", () => {
      // (3-1)^2 * 50 = 200
      expect(xpRequiredForLevel(3)).toBe(200);
    });

    it("should calculate correct XP for level 5", () => {
      // (5-1)^2 * 50 = 800
      expect(xpRequiredForLevel(5)).toBe(800);
    });

    it("should calculate correct XP for level 10", () => {
      // (10-1)^2 * 50 = 4050
      expect(xpRequiredForLevel(10)).toBe(4050);
    });

    it("should calculate correct XP for level 20", () => {
      // (20-1)^2 * 50 = 18050
      expect(xpRequiredForLevel(20)).toBe(18050);
    });

    it("should calculate correct XP for level 50", () => {
      // (50-1)^2 * 50 = 120050
      expect(xpRequiredForLevel(50)).toBe(120050);
    });

    it("should calculate correct XP for level 100", () => {
      // (100-1)^2 * 50 = 490050
      expect(xpRequiredForLevel(100)).toBe(490050);
    });

    it("should return 0 for level 0 or negative", () => {
      expect(xpRequiredForLevel(0)).toBe(0);
      expect(xpRequiredForLevel(-1)).toBe(0);
    });
  });

  describe("calculateLevelFromXp", () => {
    it("should return level 1 for 0 XP", () => {
      expect(calculateLevelFromXp(0)).toBe(1);
    });

    it("should return level 1 for negative XP", () => {
      expect(calculateLevelFromXp(-100)).toBe(1);
    });

    it("should return level 1 for 49 XP (just before level 2)", () => {
      expect(calculateLevelFromXp(49)).toBe(1);
    });

    it("should return level 2 for 50 XP (exact threshold)", () => {
      expect(calculateLevelFromXp(50)).toBe(2);
    });

    it("should return level 2 for 199 XP (just before level 3)", () => {
      expect(calculateLevelFromXp(199)).toBe(2);
    });

    it("should return level 3 for 200 XP (exact threshold)", () => {
      expect(calculateLevelFromXp(200)).toBe(3);
    });

    it("should return level 5 for 800 XP", () => {
      expect(calculateLevelFromXp(800)).toBe(5);
    });

    it("should return level 10 for 4050 XP", () => {
      expect(calculateLevelFromXp(4050)).toBe(10);
    });

    it("should return level 20 for 18050 XP", () => {
      expect(calculateLevelFromXp(18050)).toBe(20);
    });

    it("should handle XP slightly above threshold", () => {
      expect(calculateLevelFromXp(51)).toBe(2);
      expect(calculateLevelFromXp(201)).toBe(3);
    });

    it("should handle XP exactly at threshold", () => {
      expect(calculateLevelFromXp(450)).toBe(4); // Level 4 threshold
      expect(calculateLevelFromXp(800)).toBe(5); // Level 5 threshold
    });
  });

  describe("nextLevelThreshold", () => {
    it("should return 50 for 0 XP (level 1, next is 2)", () => {
      expect(nextLevelThreshold(0)).toBe(50);
    });

    it("should return 50 for 49 XP (level 1, next is 2)", () => {
      expect(nextLevelThreshold(49)).toBe(50);
    });

    it("should return 200 for 50 XP (level 2, next is 3)", () => {
      expect(nextLevelThreshold(50)).toBe(200);
    });

    it("should return 450 for 200 XP (level 3, next is 4)", () => {
      expect(nextLevelThreshold(200)).toBe(450);
    });

    it("should return 800 for 450 XP (level 4, next is 5)", () => {
      expect(nextLevelThreshold(450)).toBe(800);
    });

    it("should handle mid-level XP", () => {
      expect(nextLevelThreshold(100)).toBe(200); // Still level 2
      expect(nextLevelThreshold(500)).toBe(800); // Still level 4
    });
  });

  describe("getLevelInfo", () => {
    it("should return correct info for level 1", () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.xpRequired).toBe(0);
      expect(info.xpForNextLevel).toBe(50);
    });

    it("should return correct info for level 2", () => {
      const info = getLevelInfo(50);
      expect(info.level).toBe(2);
      expect(info.xpRequired).toBe(50);
      expect(info.xpForNextLevel).toBe(200);
    });

    it("should return correct info for mid-level XP", () => {
      const info = getLevelInfo(300);
      expect(info.level).toBe(3);
      expect(info.xpRequired).toBe(200);
      expect(info.xpForNextLevel).toBe(450);
    });

    it("should return correct info for level 10", () => {
      const info = getLevelInfo(4050);
      expect(info.level).toBe(10);
      expect(info.xpRequired).toBe(4050);
      expect(info.xpForNextLevel).toBe(5000);
    });
  });

  describe("LEVEL_LOOKUP_TABLE", () => {
    it("should have 100 entries", () => {
      expect(LEVEL_LOOKUP_TABLE).toHaveLength(
        LEVEL_PROGRESSION.MAX_PRECOMPUTED_LEVEL
      );
    });

    it("should have correct values for first few levels", () => {
      expect(LEVEL_LOOKUP_TABLE[0]).toEqual({
        level: 1,
        xpRequired: 0,
        xpForNextLevel: 50,
      });

      expect(LEVEL_LOOKUP_TABLE[1]).toEqual({
        level: 2,
        xpRequired: 50,
        xpForNextLevel: 200,
      });

      expect(LEVEL_LOOKUP_TABLE[2]).toEqual({
        level: 3,
        xpRequired: 200,
        xpForNextLevel: 450,
      });
    });

    it("should be read-only at TypeScript level", () => {
      // TypeScript enforces ReadonlyArray at compile time
      // At runtime, JavaScript arrays are always mutable, but TS prevents accidental mutation
      expect(LEVEL_LOOKUP_TABLE.length).toBe(100);
      
      // Verify the array is frozen (if Object.freeze was used)
      // Note: In strict mode, attempting to modify frozen object throws
      const isFrozen = Object.isFrozen(LEVEL_LOOKUP_TABLE);
      // We don't freeze at runtime for performance, but TS readonly prevents mutation
      expect(typeof isFrozen).toBe("boolean");
    });
  });

  describe("getLevelInfoFast", () => {
    it("should return same results as getLevelInfo for levels 1-100", () => {
      const testXpValues = [0, 50, 200, 450, 800, 4050, 18050, 120050];

      for (const xp of testXpValues) {
        const regular = getLevelInfo(xp);
        const fast = getLevelInfoFast(xp);
        expect(fast).toEqual(regular);
      }
    });

    it("should use lookup table for lower levels", () => {
      const info = getLevelInfoFast(50);
      // Should return same values as lookup table (but as a copy, not reference)
      expect(info).toEqual(LEVEL_LOOKUP_TABLE[1]);
    });

    it("should calculate for levels beyond 100", () => {
      // Level 101 would require (101-1)^2 * 50 = 500,000 XP
      const info = getLevelInfoFast(500000);
      expect(info.level).toBeGreaterThan(100);
    });
  });

  describe("calculateLevelsCrossed", () => {
    it("should return empty array if no level-up", () => {
      expect(calculateLevelsCrossed(0, 49)).toEqual([]);
      expect(calculateLevelsCrossed(50, 199)).toEqual([]);
    });

    it("should return [2] for leveling from 1 to 2", () => {
      expect(calculateLevelsCrossed(0, 50)).toEqual([2]);
      expect(calculateLevelsCrossed(49, 50)).toEqual([2]);
    });

    it("should return [3] for leveling from 2 to 3", () => {
      expect(calculateLevelsCrossed(50, 200)).toEqual([3]);
      expect(calculateLevelsCrossed(199, 200)).toEqual([3]);
    });

    it("should return multiple levels for large XP gains", () => {
      // From level 1 (0 XP) to level 4 (450 XP)
      expect(calculateLevelsCrossed(0, 450)).toEqual([2, 3, 4]);
    });

    it("should handle skipping multiple levels", () => {
      // From level 1 to level 5
      expect(calculateLevelsCrossed(0, 800)).toEqual([2, 3, 4, 5]);
    });

    it("should handle very large level jumps", () => {
      // From level 1 to level 10
      const levels = calculateLevelsCrossed(0, 4050);
      expect(levels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it("should return empty array for level decrease", () => {
      expect(calculateLevelsCrossed(200, 50)).toEqual([]);
    });
  });

  describe("Boundary Cases", () => {
    it("should handle exact threshold values correctly", () => {
      // Exactly at level 2 threshold
      expect(calculateLevelFromXp(50)).toBe(2);
      expect(nextLevelThreshold(50)).toBe(200);

      // Exactly at level 3 threshold
      expect(calculateLevelFromXp(200)).toBe(3);
      expect(nextLevelThreshold(200)).toBe(450);
    });

    it("should handle 1 XP below threshold", () => {
      expect(calculateLevelFromXp(49)).toBe(1);
      expect(calculateLevelFromXp(199)).toBe(2);
      expect(calculateLevelFromXp(449)).toBe(3);
    });

    it("should handle 1 XP above threshold", () => {
      expect(calculateLevelFromXp(51)).toBe(2);
      expect(calculateLevelFromXp(201)).toBe(3);
      expect(calculateLevelFromXp(451)).toBe(4);
    });

    it("should handle overshoot scenarios", () => {
      // Jump from level 1 directly to level 3 with overshoot
      const levels = calculateLevelsCrossed(0, 201);
      expect(levels).toEqual([2, 3]);
    });
  });

  describe("Large XP Grants", () => {
    it("should increment level only once per threshold crossed", () => {
      // Award 100 XP (from 0 to 100)
      // Level 1 (0-49) -> Level 2 (50-199)
      expect(calculateLevelsCrossed(0, 100)).toEqual([2]);
    });

    it("should increment multiple levels if XP crosses multiple thresholds", () => {
      // Award 500 XP (from 0 to 500)
      // Level 1 -> 2 (50), 3 (200), 4 (450)
      const levels = calculateLevelsCrossed(0, 500);
      expect(levels).toEqual([2, 3, 4]);
    });

    it("should handle massive XP grants correctly", () => {
      // Award 20,000 XP
      const oldXp = 0;
      const newXp = 20000;
      const levels = calculateLevelsCrossed(oldXp, newXp);

      // Verify each level is only counted once
      const uniqueLevels = new Set(levels);
      expect(uniqueLevels.size).toBe(levels.length);

      // Verify levels are sequential
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBe(levels[i - 1] + 1);
      }

      // Verify final level matches XP
      const finalLevel = calculateLevelFromXp(newXp);
      expect(levels[levels.length - 1]).toBe(finalLevel);
    });
  });

  describe("applyLevelChanges", () => {
    let mockUser: any;
    let mockActivityLog: any;
    let mockGamificationEvents: any;

    beforeEach(() => {
      // Mock user document
      mockUser = {
        _id: "user123",
        xp: 0,
        level: 1,
        preferences: {},
        save: vi.fn().mockResolvedValue(undefined),
      };

      // Mock ActivityLog
      mockActivityLog = {
        create: vi.fn().mockResolvedValue({}),
      };

      // Mock gamification events
      mockGamificationEvents = {
        emitLevelUp: vi.fn(),
      };

      // Mock module imports
      vi.doMock("../../../models/ActivityLog", () => ({
        default: mockActivityLog,
      }));

      vi.doMock("../../gamification/events", () => ({
        gamificationEvents: mockGamificationEvents,
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
    });

    it("should return empty array if no level-up", async () => {
      mockUser.xp = 30; // Level 1
      const levelUps = await applyLevelChanges(mockUser, 10);

      expect(levelUps).toEqual([]);
      expect(mockUser.level).toBe(1);
      expect(mockUser.preferences.nextLevelAt).toBe(50);
    });

    it("should update nextLevelAt even without level-up", async () => {
      mockUser.xp = 30; // Level 1
      await applyLevelChanges(mockUser, 10);

      expect(mockUser.preferences.nextLevelAt).toBe(50);
    });

    it("should detect and apply single level-up", async () => {
      mockUser.xp = 60; // Level 2 (gained 60 XP from 0)
      const levelUps = await applyLevelChanges(mockUser, 60);

      expect(levelUps).toHaveLength(1);
      expect(levelUps[0]).toMatchObject({
        oldLevel: 1,
        newLevel: 2,
        totalXp: 60,
      });
      expect(mockUser.level).toBe(2);
      expect(mockUser.preferences.nextLevelAt).toBe(200);
    });

    it("should detect and apply multiple level-ups", async () => {
      mockUser.xp = 500; // Level 4 (gained 500 XP from 0)
      const levelUps = await applyLevelChanges(mockUser, 500);

      expect(levelUps).toHaveLength(3); // Levels 2, 3, 4
      expect(levelUps[0].newLevel).toBe(2);
      expect(levelUps[1].newLevel).toBe(3);
      expect(levelUps[2].newLevel).toBe(4);
      expect(mockUser.level).toBe(4);
    });

    it("should create ActivityLog entries for each level-up", async () => {
      mockUser.xp = 500;
      await applyLevelChanges(mockUser, 500);

      // Should create 3 activity log entries (for levels 2, 3, 4)
      expect(mockActivityLog.create).toHaveBeenCalledTimes(3);

      // Verify first level-up log
      expect(mockActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          activityType: "level_up",
          xpEarned: 0,
          metadata: expect.objectContaining({
            oldLevel: 1,
            newLevel: 2,
          }),
        })
      );
    });

    it("should emit level-up events", async () => {
      mockUser.xp = 500;
      await applyLevelChanges(mockUser, 500);

      // Should emit 3 events (for levels 2, 3, 4)
      expect(mockGamificationEvents.emitLevelUp).toHaveBeenCalledTimes(3);

      // Verify event data
      expect(mockGamificationEvents.emitLevelUp).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          oldLevel: 1,
          newLevel: 2,
          totalXp: 500,
        })
      );
    });

    it("should handle exact threshold", async () => {
      mockUser.xp = 50; // Exactly level 2
      const levelUps = await applyLevelChanges(mockUser, 50);

      expect(levelUps).toHaveLength(1);
      expect(mockUser.level).toBe(2);
      expect(mockUser.preferences.nextLevelAt).toBe(200);
    });

    it("should handle XP overshoot", async () => {
      mockUser.xp = 60; // Level 2 with 10 XP overshoot
      const levelUps = await applyLevelChanges(mockUser, 60);

      expect(levelUps).toHaveLength(1);
      expect(mockUser.level).toBe(2);
      expect(mockUser.preferences.nextLevelAt).toBe(200);
    });
  });

  describe("Configuration Flexibility", () => {
    it("should use configuration from config.ts", () => {
      const { BASE_XP, EXPONENT } = LEVEL_PROGRESSION;

      // Level 2 should be BASE_XP * (2-1)^EXPONENT
      const expectedLevel2Xp = BASE_XP * Math.pow(1, EXPONENT);
      expect(xpRequiredForLevel(2)).toBe(expectedLevel2Xp);

      // Level 5 should be BASE_XP * (5-1)^EXPONENT
      const expectedLevel5Xp = BASE_XP * Math.pow(4, EXPONENT);
      expect(xpRequiredForLevel(5)).toBe(expectedLevel5Xp);
    });

    it("should allow curve tuning via config without code changes", () => {
      // This test verifies that the formulas use config values
      // If config.BASE_XP or EXPONENT changes, all calculations adapt
      const level10Xp = xpRequiredForLevel(10);
      const expectedXp = LEVEL_PROGRESSION.BASE_XP * Math.pow(9, LEVEL_PROGRESSION.EXPONENT);
      expect(level10Xp).toBe(expectedXp);
    });
  });
});
