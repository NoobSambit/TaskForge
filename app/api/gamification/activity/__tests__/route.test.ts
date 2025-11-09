/**
 * Tests for gamification activity API route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock NextAuth
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock models
vi.mock("@/models/User", () => ({
  getUserById: vi.fn(),
}));

vi.mock("@/models/ActivityLog", () => ({
  getUserActivityLogs: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    return date.toISOString();
  }),
  parseISO: vi.fn((dateStr) => new Date(dateStr)),
  isValid: vi.fn(() => true),
}));

describe("Gamification Activity API Route", () => {
  const mockUser = {
    _id: "user123",
  };

  const mockActivities = [
    {
      _id: "activity123",
      id: "activity123",
      activityType: "task_completed",
      description: "Task completed: Review project proposal",
      metadata: {
        taskId: "task123",
        taskTitle: "Review project proposal",
        xpAwarded: 25,
        difficulty: "medium",
      },
      createdAt: new Date("2024-01-15T14:30:00.000Z"),
    },
    {
      _id: "activity456",
      id: "activity456",
      activityType: "level_up",
      description: "Level up! Reached level 5",
      metadata: {
        newLevel: 5,
        previousLevel: 4,
        xpAtLevelUp: 800,
      },
      createdAt: new Date("2024-01-15T10:30:00.000Z"),
    },
    {
      _id: "activity789",
      id: "activity789",
      activityType: "achievement_unlocked",
      description: "Achievement unlocked: First Steps",
      metadata: {
        achievementKey: "first_task",
        achievementTitle: "First Steps",
        xpReward: 10,
      },
      createdAt: new Date("2024-01-14T16:45:00.000Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful authentication
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue({
      user: { id: "user123" },
    });

    // Default user data
    const { getUserById } = require("@/models/User");
    getUserById.mockResolvedValue(mockUser);

    // Default activity logs
    const { getUserActivityLogs } = require("@/models/ActivityLog");
    getUserActivityLogs.mockResolvedValue(mockActivities);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject requests for non-existent users", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/gamification/activity", () => {
    it("should return user activity history", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.activities).toBeDefined();
      expect(Array.isArray(data.data.activities)).toBe(true);
      expect(data.data.total).toBe(3);
      expect(data.data.hasMore).toBe(false);
      expect(data.data.pagination).toBeDefined();
    });

    it("should transform activity data correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const taskActivity = data.data.activities.find((a: any) => a.activityType === "task_completed");
      expect(taskActivity.description).toBe("Task completed: Review project proposal");
      expect(taskActivity.xpChange).toBe(25);
      expect(taskActivity.metadata.taskId).toBe("task123");

      const levelActivity = data.data.activities.find((a: any) => a.activityType === "level_up");
      expect(levelActivity.description).toBe("Level up! Reached level 5");
      expect(levelActivity.xpChange).toBeUndefined();

      const achievementActivity = data.data.activities.find((a: any) => a.activityType === "achievement_unlocked");
      expect(achievementActivity.description).toBe("Achievement unlocked: First Steps");
      expect(achievementActivity.xpChange).toBe(10);
    });

    it("should filter by activity type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?activityType=task_completed"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      expect(getUserActivityLogs).toHaveBeenCalledWith("user123", {
        activityType: "task_completed",
        fromDate: undefined,
        toDate: undefined,
        limit: 21, // limit + 1 for hasMore check
      });
    });

    it("should filter by date range", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?fromDate=2024-01-01T00:00:00.000Z&toDate=2024-01-15T23:59:59.999Z"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      expect(getUserActivityLogs).toHaveBeenCalledWith("user123", {
        activityType: undefined,
        fromDate: new Date("2024-01-01T00:00:00.000Z"),
        toDate: new Date("2024-01-15T23:59:59.999Z"),
        limit: 21,
      });
    });

    it("should handle pagination", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?page=2&limit=5"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
      expect(data.data.filters).toBeDefined();
    });

    it("should detect when there are more results", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      // Return 21 activities when limit is 20 to trigger hasMore
      const manyActivities = Array(21).fill(null).map((_, i) => ({
        ...mockActivities[0],
        _id: `activity${i}`,
        id: `activity${i}`,
      }));
      getUserActivityLogs.mockResolvedValue(manyActivities);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?limit=20"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.hasMore).toBe(true);
      expect(data.data.activities.length).toBe(20);
      expect(data.data.pagination.hasMore).toBe(true);
      expect(data.data.pagination.nextPage).toBe(2);
    });

    it("should validate query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?page=0&limit=150"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should validate date formats", async () => {
      const { isValid } = require("date-fns");
      isValid.mockReturnValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/activity?fromDate=invalid-date"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBe("Invalid fromDate format");
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });

    it("should handle empty activity list", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.activities).toEqual([]);
      expect(data.data.total).toBe(0);
      expect(data.data.hasMore).toBe(false);
    });

    it("should handle server errors gracefully", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should handle activities with missing metadata", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        {
          _id: "activity123",
          id: "activity123",
          activityType: "task_completed",
          description: "Task completed",
          metadata: {}, // Empty metadata
          createdAt: new Date("2024-01-15T14:30:00.000Z"),
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.activities[0].xpChange).toBeUndefined();
    });

    it("should handle unknown activity types", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        {
          _id: "activity123",
          id: "activity123",
          activityType: "unknown_type",
          description: "Unknown activity",
          metadata: {},
          createdAt: new Date("2024-01-15T14:30:00.000Z"),
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/gamification/activity");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.activities[0].description).toBe("Unknown activity");
    });
  });
});