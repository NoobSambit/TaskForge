/**
 * Tests for gamification level API route
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

// Mock gamification modules
vi.mock("@/lib/gamification/levels", () => ({
  getLevelInfoFast: vi.fn(),
}));

describe("Gamification Level API Route", () => {
  const mockUser = {
    _id: "user123",
    xp: 1250,
    level: 5,
  };

  const mockLevelInfo = {
    currentLevel: 5,
    currentXp: 1250,
    xpForCurrentLevel: 800,
    xpForNextLevel: 1600,
    progress: 0.5625,
    levelsToNext: 1,
    totalXpForNextLevel: 1600,
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

    // Default level info
    const { getLevelInfoFast } = require("@/lib/gamification/levels");
    getLevelInfoFast.mockReturnValue(mockLevelInfo);

    // Default activity logs (empty)
    const { getUserActivityLogs } = require("@/models/ActivityLog");
    getUserActivityLogs.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject requests for non-existent users", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/gamification/level", () => {
    it("should return user level information", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.currentLevel).toBe(5);
      expect(data.data.currentXp).toBe(1250);
      expect(data.data.xpForCurrentLevel).toBe(800);
      expect(data.data.xpForNextLevel).toBe(1600);
      expect(data.data.progress).toBe(0.5625);
      expect(data.data.levelsToNext).toBe(1);
      expect(data.data.totalXpForNextLevel).toBe(1600);
    });

    it("should include level-up history when requested", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        {
          _id: "activity123",
          activityType: "level_up",
          metadata: {
            newLevel: 5,
            previousLevel: 4,
            xpAtLevelUp: 800,
          },
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/level?includeHistory=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.recentLevelUps).toBeDefined();
      expect(Array.isArray(data.data.recentLevelUps)).toBe(true);
      expect(data.data.recentLevelUps[0].level).toBe(5);
      expect(data.data.recentLevelUps[0].previousLevel).toBe(4);
    });

    it("should handle users with missing level data", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue({
        ...mockUser,
        xp: undefined,
        level: undefined,
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Level info should still be calculated from XP (0 in this case)
      expect(data.data.currentLevel).toBeGreaterThanOrEqual(1);
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });

    it("should handle server errors gracefully", async () => {
      const { getLevelInfoFast } = require("@/lib/gamification/levels");
      getLevelInfoFast.mockImplementation(() => {
        throw new Error("Level calculation error");
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/level");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should handle empty level-up history", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/level?includeHistory=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.recentLevelUps).toEqual([]);
    });

    it("should handle malformed metadata in level-up activities", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        {
          _id: "activity123",
          activityType: "level_up",
          metadata: {}, // Empty metadata
          createdAt: new Date("2024-01-15T10:30:00.000Z"),
        },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/level?includeHistory=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.recentLevelUps).toBeDefined();
      expect(data.data.recentLevelUps[0].level).toBeUndefined();
    });
  });
});