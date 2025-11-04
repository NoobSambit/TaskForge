import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyCompletionToStreak,
  recomputeStreaksFromHistory,
  toDateStringInTimezone,
  daysBetweenDateStrings,
} from "../../gamification/streaks";

/**
 * Test suite for Streak Tracking Service
 * 
 * These tests verify streak calculation logic with timezone awareness,
 * DST transitions, and edge cases.
 */

// Mock Mongoose models
vi.mock("../../../models/StreakLog", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../../../models/User", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../../../models/ActivityLog", () => ({
  default: {
    find: vi.fn(),
  },
}));

describe("toDateStringInTimezone", () => {
  it("should convert UTC date to date string", () => {
    const date = new Date("2024-01-15T23:30:00Z");
    expect(toDateStringInTimezone(date, "UTC")).toBe("2024-01-15");
  });

  it("should handle timezone offset (US/Eastern)", () => {
    const date = new Date("2024-01-16T03:30:00Z"); // 3:30 AM UTC
    // In US/Eastern (UTC-5 in winter), this is Jan 15, 10:30 PM
    expect(toDateStringInTimezone(date, "America/New_York")).toBe("2024-01-15");
  });

  it("should handle timezone offset (Asia/Tokyo)", () => {
    const date = new Date("2024-01-15T15:30:00Z"); // 3:30 PM UTC
    // In Asia/Tokyo (UTC+9), this is Jan 16, 12:30 AM
    expect(toDateStringInTimezone(date, "Asia/Tokyo")).toBe("2024-01-16");
  });

  it("should handle DST transition (spring forward)", () => {
    // March 10, 2024 at 2 AM US/Eastern springs forward to 3 AM
    const beforeDST = new Date("2024-03-10T06:30:00Z"); // 1:30 AM EST (UTC-5)
    const afterDST = new Date("2024-03-10T07:30:00Z"); // 3:30 AM EDT (UTC-4)
    
    expect(toDateStringInTimezone(beforeDST, "America/New_York")).toBe("2024-03-10");
    expect(toDateStringInTimezone(afterDST, "America/New_York")).toBe("2024-03-10");
  });

  it("should handle DST transition (fall back)", () => {
    // November 3, 2024 at 2 AM US/Eastern falls back to 1 AM
    const beforeDST = new Date("2024-11-03T05:30:00Z"); // 1:30 AM EDT (UTC-4)
    const afterDST = new Date("2024-11-03T06:30:00Z"); // 1:30 AM EST (UTC-5)
    
    expect(toDateStringInTimezone(beforeDST, "America/New_York")).toBe("2024-11-03");
    expect(toDateStringInTimezone(afterDST, "America/New_York")).toBe("2024-11-03");
  });

  it("should handle midnight boundary", () => {
    const justBefore = new Date("2024-01-15T23:59:59Z");
    const justAfter = new Date("2024-01-16T00:00:00Z");
    
    expect(toDateStringInTimezone(justBefore, "UTC")).toBe("2024-01-15");
    expect(toDateStringInTimezone(justAfter, "UTC")).toBe("2024-01-16");
  });

  it("should fallback to UTC for invalid timezone", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const result = toDateStringInTimezone(date, "Invalid/Timezone");
    expect(result).toBe("2024-01-15");
  });
});

describe("daysBetweenDateStrings", () => {
  it("should calculate 0 days for same date", () => {
    expect(daysBetweenDateStrings("2024-01-15", "2024-01-15")).toBe(0);
  });

  it("should calculate 1 day for consecutive dates", () => {
    expect(daysBetweenDateStrings("2024-01-15", "2024-01-16")).toBe(1);
  });

  it("should calculate multiple days", () => {
    expect(daysBetweenDateStrings("2024-01-15", "2024-01-20")).toBe(5);
  });

  it("should handle negative days (past dates)", () => {
    expect(daysBetweenDateStrings("2024-01-20", "2024-01-15")).toBe(-5);
  });

  it("should handle month boundaries", () => {
    expect(daysBetweenDateStrings("2024-01-31", "2024-02-01")).toBe(1);
  });

  it("should handle year boundaries", () => {
    expect(daysBetweenDateStrings("2023-12-31", "2024-01-01")).toBe(1);
  });
});

describe("applyCompletionToStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize streak on first completion", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: null,
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 1,
      streakLength: 1,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    const completedAt = new Date("2024-01-15T12:00:00Z");
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isNewDay).toBe(true);
    expect(mockUser.currentStreak).toBe(1);
    expect(mockUser.longestStreak).toBe(1);
  });

  it("should increment streak on consecutive day", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 1,
      longestStreak: 1,
      lastStreakDate: new Date("2024-01-15T00:00:00Z"),
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 1,
      streakLength: 2,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    const completedAt = new Date("2024-01-16T12:00:00Z");
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.isNewDay).toBe(true);
    expect(mockUser.currentStreak).toBe(2);
    expect(mockUser.longestStreak).toBe(2);
  });

  it("should not change streak for same day completion", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 3,
      longestStreak: 5,
      lastStreakDate: new Date("2024-01-15T00:00:00Z"),
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 2, // Incremented from 1
      streakLength: 3,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    const completedAt = new Date("2024-01-15T18:00:00Z"); // Same day, different time
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(3); // Unchanged
    expect(result.longestStreak).toBe(5); // Unchanged
    expect(result.isNewDay).toBe(false);
    expect(result.taskCount).toBe(2);
  });

  it("should reset streak when breaking streak", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 7,
      longestStreak: 10,
      lastStreakDate: new Date("2024-01-15T00:00:00Z"),
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 1,
      streakLength: 1,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    const completedAt = new Date("2024-01-18T12:00:00Z"); // 3 days gap
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(1); // Reset
    expect(result.longestStreak).toBe(10); // Preserved
    expect(result.isNewDay).toBe(true);
    expect(mockUser.currentStreak).toBe(1);
    expect(mockUser.longestStreak).toBe(10);
  });

  it("should update longest streak when exceeded", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 9,
      longestStreak: 9,
      lastStreakDate: new Date("2024-01-15T00:00:00Z"),
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 1,
      streakLength: 10,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    const completedAt = new Date("2024-01-16T12:00:00Z");
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(10);
    expect(result.longestStreak).toBe(10); // Updated
  });

  it("should handle timezone crossing midnight boundary", async () => {
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    // lastStreakDate represents "Jan 15 in UTC"
    // When converted to US/Eastern (UTC-5), midnight UTC on Jan 15 = 7 PM EST on Jan 14
    // So the last streak day was Jan 14 in US/Eastern
    const mockUser = {
      _id: "user123",
      currentStreak: 1,
      longestStreak: 1,
      lastStreakDate: new Date("2024-01-15T00:00:00Z"), // Jan 14 in EST
      preferences: { timezone: "America/New_York" }, // UTC-5 in winter
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const mockStreakLog = {
      userId: "user123",
      taskCount: 1,
      streakLength: 2,
    };

    (StreakLog.findOneAndUpdate as any).mockResolvedValue(mockStreakLog);

    // 11:30 PM EST on Jan 15 = 4:30 AM UTC on Jan 16
    // In user's timezone, this is Jan 15
    const completedAt = new Date("2024-01-16T04:30:00Z");
    const result = await applyCompletionToStreak(mockUser, completedAt);

    // Should be next consecutive day (Jan 14 -> Jan 15 in EST)
    expect(result.isNewDay).toBe(true);
    expect(result.currentStreak).toBe(2); // Incremented
  });

  it("should handle past completion (backfilling)", async () => {
    const mockUser = {
      _id: "user123",
      currentStreak: 5,
      longestStreak: 10,
      lastStreakDate: new Date("2024-01-20T00:00:00Z"),
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    } as any;

    const completedAt = new Date("2024-01-10T12:00:00Z"); // In the past
    const result = await applyCompletionToStreak(mockUser, completedAt);

    expect(result.updated).toBe(false);
    expect(result.reason).toBe("Completion date is before last streak date");
    expect(mockUser.currentStreak).toBe(5); // Unchanged
  });
});

describe("recomputeStreaksFromHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should recompute streaks from empty history", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");
    
    const mockUser = {
      _id: "user123",
      currentStreak: 5,
      longestStreak: 10,
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    };

    (User.findById as any).mockResolvedValue(mockUser);
    (ActivityLog.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    const result = await recomputeStreaksFromHistory("user123");

    expect(result.success).toBe(true);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalDaysActive).toBe(0);
    expect(result.totalCompletions).toBe(0);
    expect(mockUser.save).toHaveBeenCalled();
  });

  it("should recompute streaks from single completion", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    };

    const mockCompletions = [
      {
        userId: "user123",
        activityType: "task_completion",
        date: new Date("2024-01-15T12:00:00Z"),
      },
    ];

    (User.findById as any).mockResolvedValue(mockUser);
    (ActivityLog.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockCompletions),
    });
    (StreakLog.findOneAndUpdate as any).mockResolvedValue({});

    const result = await recomputeStreaksFromHistory("user123");

    expect(result.success).toBe(true);
    expect(result.currentStreak).toBe(0); // Too old (not today or yesterday)
    expect(result.longestStreak).toBe(1);
    expect(result.totalDaysActive).toBe(1);
    expect(result.totalCompletions).toBe(1);
    expect(result.streakLogsCreated).toBe(1);
  });

  it("should recompute consecutive streak", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    };

    const mockCompletions = [
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-15T12:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-16T14:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-17T09:00:00Z") },
    ];

    (User.findById as any).mockResolvedValue(mockUser);
    (ActivityLog.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockCompletions),
    });
    (StreakLog.findOneAndUpdate as any).mockResolvedValue({});

    const result = await recomputeStreaksFromHistory("user123");

    expect(result.success).toBe(true);
    expect(result.longestStreak).toBe(3);
    expect(result.totalDaysActive).toBe(3);
    expect(result.totalCompletions).toBe(3);
    expect(result.streakLogsCreated).toBe(3);
  });

  it("should recompute broken streak", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    };

    const mockCompletions = [
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-15T12:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-16T14:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-18T09:00:00Z") }, // Gap
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-19T10:00:00Z") },
    ];

    (User.findById as any).mockResolvedValue(mockUser);
    (ActivityLog.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockCompletions),
    });
    (StreakLog.findOneAndUpdate as any).mockResolvedValue({});

    const result = await recomputeStreaksFromHistory("user123");

    expect(result.success).toBe(true);
    expect(result.longestStreak).toBe(2); // First two days
    expect(result.totalDaysActive).toBe(4);
    expect(result.totalCompletions).toBe(4);
  });

  it("should group multiple completions on same day", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");
    const { default: StreakLog } = await import("../../../models/StreakLog");
    
    const mockUser = {
      _id: "user123",
      preferences: { timezone: "UTC" },
      save: vi.fn().mockResolvedValue(true),
    };

    const mockCompletions = [
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-15T09:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-15T14:00:00Z") },
      { userId: "user123", activityType: "task_completion", date: new Date("2024-01-15T18:00:00Z") },
    ];

    (User.findById as any).mockResolvedValue(mockUser);
    (ActivityLog.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue(mockCompletions),
    });
    
    const streakLogCalls: any[] = [];
    (StreakLog.findOneAndUpdate as any).mockImplementation((...args: any[]) => {
      streakLogCalls.push(args);
      return Promise.resolve({});
    });

    const result = await recomputeStreaksFromHistory("user123");

    expect(result.success).toBe(true);
    expect(result.totalDaysActive).toBe(1); // Only 1 unique day
    expect(result.totalCompletions).toBe(3); // 3 completions
    expect(result.streakLogsCreated).toBe(1); // Only 1 log entry
    
    // Verify the streak log has taskCount=3
    expect(streakLogCalls[0][1].taskCount).toBe(3);
  });

  it("should handle user not found", async () => {
    const { default: User } = await import("../../../models/User");
    
    (User.findById as any).mockResolvedValue(null);

    const result = await recomputeStreaksFromHistory("nonexistent");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("User not found");
  });
});
