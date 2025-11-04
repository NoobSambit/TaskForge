import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  awardXpForTaskCompletion,
  adjustXpForTaskReopen,
  calculateLevelFromXp,
} from "../../gamification/awardXp";
import { gamificationEvents } from "../../gamification/events";

/**
 * Test suite for XP Awarding Service
 * 
 * These tests verify the XP awarding logic, duplicate prevention,
 * atomic updates, activity logging, and event emission.
 */

// Mock Mongoose models
vi.mock("../../../models/Task", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../../../models/User", () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../../../models/ActivityLog", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

describe("calculateLevelFromXp", () => {
  it("should calculate level 1 for 0 XP", () => {
    expect(calculateLevelFromXp(0)).toBe(1);
  });

  it("should calculate level 1 for 49 XP", () => {
    expect(calculateLevelFromXp(49)).toBe(1);
  });

  it("should calculate level 2 for 50 XP", () => {
    expect(calculateLevelFromXp(50)).toBe(2);
  });

  it("should calculate level 3 for 300 XP", () => {
    expect(calculateLevelFromXp(300)).toBe(3);
  });

  it("should calculate level 5 for 1000 XP", () => {
    expect(calculateLevelFromXp(1000)).toBe(5);
  });

  it("should handle negative XP by returning level 1", () => {
    expect(calculateLevelFromXp(-100)).toBe(1);
  });
});

describe("awardXpForTaskCompletion", () => {
  const mockTaskId = "task123";
  const mockUserId = "user123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should award XP for completed task", async () => {
    const { default: Task } = await import("../../../models/Task");
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const mockTask = {
      _id: mockTaskId,
      userId: mockUserId,
      title: "Test Task",
      status: "done",
      priority: 4,
      difficulty: "medium",
      tags: ["urgent"],
      completedAt: new Date("2024-01-15T12:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const mockUser = {
      _id: mockUserId,
      xp: 100,
      level: 2,
      xpMultiplier: 1.0,
      currentStreak: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockUpdatedUser = {
      _id: mockUserId,
      xp: 146, // 25 base + 25*0.25 priority + 15 urgent = 46.25 rounded = 46
      level: 2,
      preferences: {},
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);
    vi.mocked(User.findById).mockResolvedValue(mockUser as any);
    vi.mocked(ActivityLog.findOne).mockResolvedValue(null); // No duplicate
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue(mockUpdatedUser as any);
    vi.mocked(ActivityLog.create).mockResolvedValue({} as any);

    // Listen for events
    const xpAwardedSpy = vi.fn();
    gamificationEvents.once("xpAwarded", xpAwardedSpy);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId, {
      now: new Date("2024-01-15T12:00:00Z"),
    });

    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBeGreaterThan(0);
    expect(result.totalXp).toBe(146);
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUserId,
        taskId: mockTaskId,
        activityType: "task_completion",
      })
    );
    expect(xpAwardedSpy).toHaveBeenCalled();
  });

  it("should prevent duplicate XP awards", async () => {
    const { default: Task } = await import("../../../models/Task");
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const mockTask = {
      _id: mockTaskId,
      userId: mockUserId,
      title: "Test Task",
      status: "done",
      priority: 3,
      difficulty: "easy",
      tags: [],
      completedAt: new Date("2024-01-15T12:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const mockUser = {
      _id: mockUserId,
      xp: 100,
      level: 2,
      xpMultiplier: 1.0,
      currentStreak: 0,
    };

    const existingLog = {
      _id: "log123",
      userId: mockUserId,
      taskId: mockTaskId,
      activityType: "task_completion",
      xpEarned: 10,
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);
    vi.mocked(User.findById).mockResolvedValue(mockUser as any);
    vi.mocked(ActivityLog.findOne).mockResolvedValue(existingLog as any);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId);

    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBe(0);
    expect(result.alreadyAwarded).toBe(true);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return error for non-existent task", async () => {
    const { default: Task } = await import("../../../models/Task");

    vi.mocked(Task.findById).mockResolvedValue(null);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId);

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Task not found");
  });

  it("should return error for task not belonging to user", async () => {
    const { default: Task } = await import("../../../models/Task");

    const mockTask = {
      _id: mockTaskId,
      userId: "otherUser",
      title: "Test Task",
      status: "done",
      completedAt: new Date(),
      createdAt: new Date(),
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId);

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Task does not belong to user");
  });

  it("should return error for incomplete task", async () => {
    const { default: Task } = await import("../../../models/Task");

    const mockTask = {
      _id: mockTaskId,
      userId: mockUserId,
      title: "Test Task",
      status: "in_progress",
      completedAt: null,
      createdAt: new Date(),
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId);

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Task is not completed");
  });

  it("should handle level up", async () => {
    const { default: Task } = await import("../../../models/Task");
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const mockTask = {
      _id: mockTaskId,
      userId: mockUserId,
      title: "Test Task",
      status: "done",
      priority: 5,
      difficulty: "hard",
      tags: ["deployment", "urgent"],
      completedAt: new Date("2024-01-15T12:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const mockUser = {
      _id: mockUserId,
      xp: 90, // Close to level up threshold
      level: 1,
      xpMultiplier: 1.0,
      currentStreak: 0,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockUpdatedUser = {
      _id: mockUserId,
      xp: 200, // Should be level 2 now
      level: 1, // Will be updated in the function
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);
    vi.mocked(User.findById).mockResolvedValue(mockUser as any);
    vi.mocked(ActivityLog.findOne).mockResolvedValue(null);
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue(mockUpdatedUser as any);
    vi.mocked(ActivityLog.create).mockResolvedValue({} as any);

    // Listen for level up event
    const levelUpSpy = vi.fn();
    gamificationEvents.once("levelUp", levelUpSpy);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId, {
      now: new Date("2024-01-15T12:00:00Z"),
    });

    expect(result.success).toBe(true);
    expect(result.newLevel).toBeGreaterThan(1);
    expect(levelUpSpy).toHaveBeenCalled();
  });

  it("should handle duplicate key error gracefully", async () => {
    const { default: Task } = await import("../../../models/Task");
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const mockTask = {
      _id: mockTaskId,
      userId: mockUserId,
      title: "Test Task",
      status: "done",
      priority: 3,
      difficulty: "easy",
      tags: [],
      completedAt: new Date("2024-01-15T12:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const mockUser = {
      _id: mockUserId,
      xp: 100,
      level: 2,
      xpMultiplier: 1.0,
      currentStreak: 0,
    };

    vi.mocked(Task.findById).mockResolvedValue(mockTask as any);
    vi.mocked(User.findById).mockResolvedValue(mockUser as any);
    vi.mocked(ActivityLog.findOne).mockResolvedValue(null);
    
    const updatedUser = {
      _id: mockUserId,
      xp: 110,
      level: 2,
      preferences: {},
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue(updatedUser as any);
    
    // Simulate duplicate key error
    const duplicateError = new Error("Duplicate key");
    (duplicateError as any).code = 11000;
    vi.mocked(ActivityLog.create).mockRejectedValue(duplicateError);

    const result = await awardXpForTaskCompletion(mockTaskId, mockUserId, {
      now: new Date("2024-01-15T12:00:00Z"),
    });

    expect(result.success).toBe(true);
    expect(result.alreadyAwarded).toBe(true);
  });
});

describe("adjustXpForTaskReopen", () => {
  const mockTaskId = "task123";
  const mockUserId = "user123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should adjust XP when task is reopened", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const originalLog = {
      _id: "log123",
      userId: mockUserId,
      taskId: mockTaskId,
      activityType: "task_completion",
      xpEarned: 50,
    };

    const mockUser = {
      _id: mockUserId,
      xp: 150,
      level: 2,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockUpdatedUser = {
      _id: mockUserId,
      xp: 100,
      level: 2,
      preferences: {},
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(ActivityLog.findOne).mockResolvedValue(originalLog as any);
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue(mockUpdatedUser as any);
    vi.mocked(ActivityLog.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);
    vi.mocked(ActivityLog.create).mockResolvedValue({} as any);

    const result = await adjustXpForTaskReopen(mockTaskId, mockUserId);

    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBe(-50);
    expect(result.totalXp).toBe(100);
    expect(ActivityLog.deleteOne).toHaveBeenCalledWith({ _id: "log123" });
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUserId,
        taskId: mockTaskId,
        activityType: "task_reopened",
        xpEarned: -50,
      })
    );
  });

  it("should handle case where no XP was awarded", async () => {
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    vi.mocked(ActivityLog.findOne).mockResolvedValue(null);

    const result = await adjustXpForTaskReopen(mockTaskId, mockUserId);

    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBe(0);
    expect(result.reason).toBe("No previous XP award found");
  });

  it("should prevent XP from going negative", async () => {
    const { default: User } = await import("../../../models/User");
    const { default: ActivityLog } = await import("../../../models/ActivityLog");

    const originalLog = {
      _id: "log123",
      userId: mockUserId,
      taskId: mockTaskId,
      activityType: "task_completion",
      xpEarned: 100,
    };

    const mockUpdatedUser = {
      _id: mockUserId,
      xp: -50, // Would go negative
      level: 1,
      preferences: {},
      save: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(ActivityLog.findOne).mockResolvedValue(originalLog as any);
    vi.mocked(User.findByIdAndUpdate).mockResolvedValue(mockUpdatedUser as any);
    vi.mocked(ActivityLog.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);
    vi.mocked(ActivityLog.create).mockResolvedValue({} as any);

    const result = await adjustXpForTaskReopen(mockTaskId, mockUserId);

    expect(result.success).toBe(true);
    expect(mockUpdatedUser.save).toHaveBeenCalled();
    expect(mockUpdatedUser.xp).toBe(0); // Should be set to 0
  });
});
