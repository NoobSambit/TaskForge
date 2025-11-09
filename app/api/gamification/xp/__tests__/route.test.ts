/**
 * Tests for gamification XP API route
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

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === "yyyy-MM-dd") {
      return "2024-01-15";
    }
    return date.toISOString();
  }),
  startOfDay: vi.fn((date) => new Date("2024-01-15T00:00:00.000Z")),
  endOfDay: vi.fn((date) => new Date("2024-01-15T23:59:59.999Z")),
}));

describe("Gamification XP API Route", () => {
  const mockUser = {
    _id: "user123",
    xp: 1250,
    level: 5,
    preferences: {
      nextLevelAt: 1600,
    },
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

      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject requests for non-existent users", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/gamification/xp", () => {
    it("should return user XP information", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.xp).toBe(1250);
      expect(data.data.level).toBe(5);
      expect(data.data.nextLevelAt).toBe(1600);
      expect(data.data.todayXp).toBe(0);
      expect(data.data.levelInfo.currentLevel).toBe(5);
      expect(data.data.levelInfo.progress).toBe(0.5625);
    });

    it("should calculate today's XP from activity logs", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        {
          metadata: { xpAwarded: 25 },
        },
        {
          metadata: { xpAwarded: 50 },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.todayXp).toBe(75);
    });

    it("should include history when requested", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs
        .mockResolvedValueOnce([]) // Today's activities
        .mockResolvedValueOnce([ // History activities
          { metadata: { xpAwarded: 25 }, createdAt: new Date() },
          { metadata: { xpAwarded: 50 }, createdAt: new Date() },
        ]);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/xp?includeHistory=true&days=7"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.history).toBeDefined();
      expect(Array.isArray(data.data.history)).toBe(true);
    });

    it("should handle users with missing XP data", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue({
        ...mockUser,
        xp: undefined,
        level: undefined,
        preferences: {},
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.xp).toBe(0);
      expect(data.data.level).toBe(1);
    });

    it("should validate query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/xp?days=400"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });

    it("should handle server errors gracefully", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/xp");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});