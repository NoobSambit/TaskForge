/**
 * Theme Unlock Service Tests
 * 
 * Tests for theme unlocking logic, user theme management, and level-up integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { 
  unlockThemesForLevelUp,
  getAvailableThemesForUser,
  updateUserTheme,
  getUserThemeStatus,
  initializeThemesForUser,
  getFutureThemeUnlocks
} from "@/lib/gamification/themeUnlock";
import { THEMES } from "@/lib/gamification/themes";

// Mock the models
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  id: "user123",
  level: 1,
  theme: "default",
  unlockedThemes: ["default", "dark"],
  save: vi.fn(),
};

// Mock before importing
vi.mock("@/models/User", () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  __esModule: true,
}));

vi.mock("@/models/ActivityLog", () => ({
  default: {
    create: vi.fn(),
  },
  __esModule: true,
}));

describe("Theme Unlock Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unlockThemesForLevelUp", () => {
    it("should unlock themes when reaching required level", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(mockUser);
      vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 });
      
      const unlockedThemes = await unlockThemesForLevelUp("user123", 5, 4);
      
      // Should unlock ocean theme at level 5
      expect(unlockedThemes.length).toBe(1);
      expect(unlockedThemes[0].id).toBe("ocean");
      expect(unlockedThemes[0].name).toBe("Ocean Depths");
      
      // Should update user's unlocked themes
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: "user123" },
        { $addToSet: { unlockedThemes: { $each: ["ocean"] } } }
      );
      
      // Get ActivityLog mock to check calls
      const { default: ActivityLog } = await import("@/models/ActivityLog");
      
      // Should create activity log entry
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          activityType: "themeUnlock",
          metadata: expect.objectContaining({
            themeId: "ocean",
            themeName: "Ocean Depths",
            levelUnlocked: 5,
          }),
        })
      );
    });

    it("should not unlock already unlocked themes", async () => {
      const { default: User } = await import("@/models/User");
      const userWithOcean = {
        ...mockUser,
        unlockedThemes: ["default", "dark", "ocean"],
      };
      
      vi.mocked(User.findById).mockResolvedValue(userWithOcean);
      
      const unlockedThemes = await unlockThemesForLevelUp("user123", 5, 4);
      
      const { default: ActivityLog } = await import("@/models/ActivityLog");
      
      expect(unlockedThemes.length).toBe(0);
      expect(User.updateOne).not.toHaveBeenCalled();
      expect(ActivityLog.create).not.toHaveBeenCalled();
    });

    it("should return empty array when no themes available at level", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(mockUser);
      
      const unlockedThemes = await unlockThemesForLevelUp("user123", 2, 1);
      
      expect(unlockedThemes.length).toBe(0);
    });

    it("should throw error when user not found", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(null);
      
      await expect(unlockThemesForLevelUp("nonexistent", 5, 4))
        .rejects.toThrow("User not found: nonexistent");
    });
  });

  describe("getAvailableThemesForUser", () => {
    it("should return user's unlocked themes", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue({
        ...mockUser,
        unlockedThemes: ["default", "dark", "ocean"],
      });
      
      const themes = await getAvailableThemesForUser("user123");
      
      expect(themes.length).toBe(3);
      expect(themes.map(t => t.id)).toEqual(["default", "dark", "ocean"]);
      themes.forEach(theme => {
        expect(THEMES[theme.id]).toBeDefined();
      });
    });

    it("should throw error when user not found", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(null);
      
      await expect(getAvailableThemesForUser("nonexistent"))
        .rejects.toThrow("User not found: nonexistent");
    });
  });

  describe("updateUserTheme", () => {
    it("should update user's active theme when unlocked", async () => {
      const { default: User } = await import("@/models/User");
      const updatedUser = { ...mockUser, theme: "ocean" };
      vi.mocked(User.findById).mockResolvedValue(mockUser);
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue(updatedUser);
      
      const result = await updateUserTheme("user123", "ocean");
      
      expect(result.theme).toBe("ocean");
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { theme: "ocean" },
        { new: true }
      );
    });

    it("should throw error when theme is not unlocked", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(mockUser);
      
      await expect(updateUserTheme("user123", "cyberpunk"))
        .rejects.toThrow('Theme "cyberpunk" is not unlocked for user user123');
    });

    it("should throw error when theme does not exist", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(mockUser);
      
      await expect(updateUserTheme("user123", "nonexistent"))
        .rejects.toThrow('Theme "nonexistent" does not exist');
    });

    it("should throw error when user not found", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue(null);
      
      await expect(updateUserTheme("nonexistent", "default"))
        .rejects.toThrow("User not found: nonexistent");
    });
  });

  describe("getUserThemeStatus", () => {
    it("should return comprehensive theme status", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue({
        ...mockUser,
        level: 5,
        theme: "ocean",
        unlockedThemes: ["default", "dark", "ocean"],
      });
      
      const status = await getUserThemeStatus("user123");
      
      expect(status.currentTheme).toBe("ocean");
      expect(status.userLevel).toBe(5);
      
      // Should have unlocked themes
      expect(status.unlocked.length).toBe(3);
      expect(status.unlocked.map(t => t.id)).toContain("ocean");
      
      // Should have locked themes (higher level requirements)
      expect(status.locked.length).toBeGreaterThan(0);
      status.locked.forEach(theme => {
        expect(theme.levelRequired).toBeGreaterThan(5);
      });
    });
  });

  describe("initializeThemesForUser", () => {
    it("should initialize default themes for new user", async () => {
      const { default: User } = await import("@/models/User");
      const updatedUser = { 
        ...mockUser, 
        theme: "default", 
        unlockedThemes: ["default", "dark"] 
      };
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue(updatedUser);
      
      const result = await initializeThemesForUser("user123");
      
      expect(result.theme).toBe("default");
      expect(result.unlockedThemes).toEqual(["default", "dark"]);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { 
          $set: { 
            theme: "default",
            unlockedThemes: ["default", "dark"] 
          }
        },
        { new: true }
      );
    });

    it("should throw error when user not found", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findByIdAndUpdate).mockResolvedValue(null);
      
      await expect(initializeThemesForUser("nonexistent"))
        .rejects.toThrow("Failed to initialize themes for user nonexistent");
    });
  });

  describe("getFutureThemeUnlocks", () => {
    it("should return future theme unlocks", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue({
        ...mockUser,
        level: 5,
        unlockedThemes: ["default", "dark", "ocean"],
      });
      
      const futureUnlocks = await getFutureThemeUnlocks("user123");
      
      expect(futureUnlocks.length).toBeGreaterThan(0);
      
      // Should be sorted by level
      for (let i = 1; i < futureUnlocks.length; i++) {
        expect(futureUnlocks[i].level).toBeGreaterThan(futureUnlocks[i - 1].level);
      }
      
      // All themes should be for future levels
      futureUnlocks.forEach(({ level, themes }) => {
        expect(level).toBeGreaterThan(5);
        themes.forEach(theme => {
          expect(theme.levelRequired).toBe(level);
        });
      });
    });

    it("should not include already unlocked themes", async () => {
      const { default: User } = await import("@/models/User");
      vi.mocked(User.findById).mockResolvedValue({
        ...mockUser,
        level: 10,
        unlockedThemes: ["default", "dark", "ocean", "forest"],
      });
      
      const futureUnlocks = await getFutureThemeUnlocks("user123");
      
      const allFutureThemes = futureUnlocks.flatMap(f => f.themes);
      const forestTheme = allFutureThemes.find(t => t.id === "forest");
      expect(forestTheme).toBeUndefined();
    });
  });
});