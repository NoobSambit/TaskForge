/**
 * Tests for gamification achievements API route
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

vi.mock("@/models/UserAchievement", () => ({
  getUserAchievements: vi.fn(),
}));

vi.mock("@/models/Achievement", () => ({
  getAchievementsByCategory: vi.fn(),
}));

// Mock gamification modules
vi.mock("@/lib/gamification/achievementsEngine", () => ({
  evaluateAchievementsForUser: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  subDays: vi.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }),
}));

describe("Gamification Achievements API Route", () => {
  const mockUser = {
    _id: "user123",
    level: 5,
    streaks: { current: 7 },
    currentStreak: 7,
  };

  const mockUserAchievements = [
    {
      achievementKey: "first_task",
      achievementTitle: "First Steps",
      unlockedAt: new Date("2024-01-15T10:30:00.000Z"),
    },
    {
      achievementKey: "week_warrior",
      achievementTitle: "Week Warrior",
      unlockedAt: new Date("2024-01-10T15:20:00.000Z"),
    },
  ];

  const mockAllAchievements = [
    {
      key: "first_task",
      title: "First Steps",
      description: "Complete your first task",
      rarity: "common",
      category: "milestones",
      xpReward: 10,
    },
    {
      key: "task_master",
      title: "Task Master",
      description: "Complete 100 tasks",
      rarity: "epic",
      category: "milestones",
      xpReward: 100,
    },
  ];

  const mockEvaluationResult = {
    newlyUnlocked: [],
    alreadyUnlocked: ["first_task", "week_warrior"],
    notUnlocked: ["task_master"],
    totalXpRewarded: 0,
  };

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

    // Default achievements data
    const { getUserAchievements } = require("@/models/UserAchievement");
    getUserAchievements.mockResolvedValue(mockUserAchievements);

    const { getAchievementsByCategory } = require("@/models/Achievement");
    getAchievementsByCategory.mockResolvedValue(mockAllAchievements);

    // Default evaluation result
    const { evaluateAchievementsForUser } = require("@/lib/gamification/achievementsEngine");
    evaluateAchievementsForUser.mockResolvedValue(mockEvaluationResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject requests for non-existent users", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/gamification/achievements", () => {
    it("should return user achievements", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.unlocked).toBeDefined();
      expect(data.data.available).toBeDefined();
      expect(data.data.totalUnlocked).toBe(2);
      expect(data.data.totalAvailable).toBeDefined();
      expect(data.data.recentUnlocks).toBeDefined();
    });

    it("should filter achievements by status", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/achievements?status=unlocked"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.available.every((a: any) => a.isUnlocked)).toBe(true);
    });

    it("should filter achievements by category", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/achievements?category=milestones"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const { getAchievementsByCategory } = require("@/models/Achievement");
      expect(getAchievementsByCategory).toHaveBeenCalledWith("milestones");
    });

    it("should filter achievements by rarity", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/achievements?rarity=epic"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.available.every((a: any) => a.rarity === "epic")).toBe(true);
    });

    it("should handle pagination", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/achievements?page=2&limit=5"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
    });

    it("should validate query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/achievements?page=0&limit=150"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });

    it("should handle empty achievements list", async () => {
      const { getUserAchievements } = require("@/models/UserAchievement");
      getUserAchievements.mockResolvedValue([]);

      const { getAchievementsByCategory } = require("@/models/Achievement");
      getAchievementsByCategory.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.unlocked).toEqual([]);
      expect(data.data.available).toEqual([]);
      expect(data.data.totalUnlocked).toBe(0);
    });

    it("should handle server errors gracefully", async () => {
      const { getUserAchievements } = require("@/models/UserAchievement");
      getUserAchievements.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should handle evaluation engine errors", async () => {
      const { evaluateAchievementsForUser } = require("@/lib/gamification/achievementsEngine");
      evaluateAchievementsForUser.mockRejectedValue(new Error("Evaluation error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should calculate recent unlocks correctly", async () => {
      const { getUserAchievements } = require("@/models/UserAchievement");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
      
      getUserAchievements.mockResolvedValue([
        ...mockUserAchievements,
        {
          achievementKey: "old_achievement",
          achievementTitle: "Old Achievement",
          unlockedAt: thirtyDaysAgo, // Older than 30 days
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/gamification/achievements");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.recentUnlocks.length).toBe(2); // Only recent ones
      expect(data.data.recentUnlocks.every((r: any) => r.achievementKey !== "old_achievement")).toBe(true);
    });
  });
});