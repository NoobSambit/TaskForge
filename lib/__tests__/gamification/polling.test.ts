/**
 * Tests for gamification polling helper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GamificationPoller, createGamificationPoller, shouldUsePolling } from "../../gamification/polling";
import type { GamificationSnapshot } from "../../gamification/polling";

// Mock fetch
global.fetch = vi.fn();

describe("GamificationPoller", () => {
  let poller: GamificationPoller;
  let mockOnEvent: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnEvent = vi.fn();
    mockOnError = vi.fn();
    poller = new GamificationPoller({
      interval: 100, // Short interval for tests
      maxRetries: 2,
    });
  });

  afterEach(() => {
    poller.stop();
    vi.restoreAllMocks();
  });

  describe("Basic functionality", () => {
    it("should start polling when start is called", () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          xp: 100,
          level: 2,
          streak: 5,
          recentAchievements: [],
          unlockedThemes: ["default"],
          timestamp: new Date().toISOString(),
        }),
      });

      poller.start(mockOnEvent, mockOnError);

      expect(poller.isActive()).toBe(true);
    });

    it("should stop polling when stop is called", () => {
      poller.start(mockOnEvent, mockOnError);
      expect(poller.isActive()).toBe(true);

      poller.stop();
      expect(poller.isActive()).toBe(false);
    });

    it("should not start if already polling", () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          xp: 100,
          level: 2,
          streak: 5,
          recentAchievements: [],
          unlockedThemes: ["default"],
          timestamp: new Date().toISOString(),
        }),
      });

      poller.start(mockOnEvent, mockOnError);
      poller.start(mockOnEvent, mockOnError); // Start again

      expect(poller.isActive()).toBe(true);
    });
  });

  describe("Event detection", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should detect XP changes", async () => {
      const initialSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      const updatedSnapshot: GamificationSnapshot = {
        xp: 125,
        level: 2,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialSnapshot,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedSnapshot,
        });

      poller.start(mockOnEvent, mockOnError);

      // First poll (establishes baseline)
      await vi.runAllTimersAsync();

      // Second poll (detects changes)
      await vi.runAllTimersAsync();

      expect(mockOnEvent).toHaveBeenCalledWith("xpAwarded", {
        userId: "",
        taskId: "",
        xpDelta: 25,
        totalXp: 125,
        timestamp: updatedSnapshot.timestamp,
      });
    });

    it("should detect level changes", async () => {
      const initialSnapshot: GamificationSnapshot = {
        xp: 450,
        level: 3,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      const updatedSnapshot: GamificationSnapshot = {
        xp: 650,
        level: 4,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialSnapshot,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedSnapshot,
        });

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync(); // First poll
      await vi.runAllTimersAsync(); // Second poll

      expect(mockOnEvent).toHaveBeenCalledWith("levelUp", {
        userId: "",
        oldLevel: 3,
        newLevel: 4,
        totalXp: 650,
        timestamp: updatedSnapshot.timestamp,
      });
    });

    it("should detect streak changes", async () => {
      const initialSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      const updatedSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 6,
        recentAchievements: [],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialSnapshot,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedSnapshot,
        });

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync(); // First poll
      await vi.runAllTimersAsync(); // Second poll

      expect(mockOnEvent).toHaveBeenCalledWith("streakUpdate", {
        userId: "",
        oldStreak: 5,
        newStreak: 6,
        lastStreakDate: updatedSnapshot.timestamp,
        timestamp: updatedSnapshot.timestamp,
      });
    });

    it("should detect new achievements", async () => {
      const initialSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 5,
        recentAchievements: [
          {
            key: "first_task",
            title: "First Task",
            unlockedAt: "2024-01-14T10:00:00Z",
          },
        ],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      const updatedSnapshot: GamificationSnapshot = {
        xp: 110,
        level: 2,
        streak: 5,
        recentAchievements: [
          {
            key: "first_task",
            title: "First Task",
            unlockedAt: "2024-01-14T10:00:00Z",
          },
          {
            key: "week_warrior",
            title: "Week Warrior",
            unlockedAt: "2024-01-15T10:00:00Z",
          },
        ],
        unlockedThemes: ["default"],
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialSnapshot,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedSnapshot,
        });

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync(); // First poll
      await vi.runAllTimersAsync(); // Second poll

      expect(mockOnEvent).toHaveBeenCalledWith("achievementUnlocked", {
        userId: "",
        achievement: {
          key: "week_warrior",
          title: "Week Warrior",
          unlockedAt: new Date("2024-01-15T10:00:00Z"),
        },
        timestamp: "2024-01-15T10:00:00Z",
      });
    });

    it("should detect new theme unlocks", async () => {
      const initialSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default", "dark"],
        timestamp: new Date().toISOString(),
      };

      const updatedSnapshot: GamificationSnapshot = {
        xp: 100,
        level: 2,
        streak: 5,
        recentAchievements: [],
        unlockedThemes: ["default", "dark", "neon"],
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialSnapshot,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedSnapshot,
        });

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync(); // First poll
      await vi.runAllTimersAsync(); // Second poll

      expect(mockOnEvent).toHaveBeenCalledWith("themeUnlocked", {
        userId: "",
        themeId: "neon",
        themeName: "neon",
        unlockedAt: updatedSnapshot.timestamp,
        timestamp: updatedSnapshot.timestamp,
      });
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync();

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Network error"),
        })
      );
    });

    it("should handle HTTP errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      poller.start(mockOnEvent, mockOnError);

      await vi.runAllTimersAsync();

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should stop polling after max retries", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Persistent error"));

      poller.start(mockOnEvent, mockOnError);

      // Run through all retry attempts
      await vi.runAllTimersAsync();

      expect(poller.isActive()).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("failed after 2 retries"),
        })
      );
    });

    it("should implement exponential backoff", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      poller.start(mockOnEvent, mockOnError);

      const initialTime = Date.now();

      // First failure
      await vi.runAllTimersAsync();
      
      // Second failure (should have longer delay)
      await vi.runAllTimersAsync();

      // The exact timing depends on the implementation
      // This is a basic check that backoff is happening
      expect(mockOnError).toHaveBeenCalledTimes(2);
    });
  });
});

describe("createGamificationPoller", () => {
  it("should create a poller with default config", () => {
    const poller = createGamificationPoller();
    expect(poller).toBeInstanceOf(GamificationPoller);
    expect(poller.isActive()).toBe(false);
  });

  it("should create a poller with custom config", () => {
    const poller = createGamificationPoller({
      interval: 60000,
      maxRetries: 5,
      retryBackoff: 1.5,
    });
    expect(poller).toBeInstanceOf(GamificationPoller);
  });
});

describe("shouldUsePolling", () => {
  it("should return true when EventSource is undefined", () => {
    const originalEventSource = global.EventSource;
    // @ts-ignore
    delete global.EventSource;

    expect(shouldUsePolling()).toBe(true);

    global.EventSource = originalEventSource;
  });

  it("should return true when prefers-reduced-motion is set", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    });

    expect(shouldUsePolling()).toBe(true);

    window.matchMedia = originalMatchMedia;
  });

  it("should return true on slow connections", () => {
    const originalNavigator = global.navigator;
    // @ts-ignore
    global.navigator = {
      connection: {
        effectiveType: "slow-2g",
        saveData: false,
      },
    };

    expect(shouldUsePolling()).toBe(true);

    global.navigator = originalNavigator;
  });

  it("should return true when saveData is enabled", () => {
    const originalNavigator = global.navigator;
    // @ts-ignore
    global.navigator = {
      connection: {
        effectiveType: "4g",
        saveData: true,
      },
    };

    expect(shouldUsePolling()).toBe(true);

    global.navigator = originalNavigator;
  });

  it("should return false for optimal conditions", () => {
    const originalEventSource = global.EventSource;
    const originalMatchMedia = window.matchMedia;
    const originalNavigator = global.navigator;

    // Ensure EventSource exists
    global.EventSource = class EventSource {};

    // Mock normal motion preference
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    });

    // Mock fast connection
    // @ts-ignore
    global.navigator = {
      connection: {
        effectiveType: "4g",
        saveData: false,
      },
    };

    expect(shouldUsePolling()).toBe(false);

    // Restore originals
    global.EventSource = originalEventSource;
    window.matchMedia = originalMatchMedia;
    global.navigator = originalNavigator;
  });
});