/**
 * Tests for gamification streaks API route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

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
  updateUserGamification: vi.fn(),
}));

vi.mock("@/models/ActivityLog", () => ({
  getUserActivityLogs: vi.fn(),
}));

// Mock gamification modules
vi.mock("@/lib/gamification/streaks", () => ({
  recalculateStreaks: vi.fn(),
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
  subDays: vi.fn((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }),
}));

describe("Gamification Streaks API Route", () => {
  const mockUser = {
    _id: "user123",
    streaks: {
      current: 7,
      longest: 15,
      lastDate: new Date("2024-01-15T23:59:59.000Z"),
    },
    currentStreak: 7,
    longestStreak: 15,
    lastStreakDate: new Date("2024-01-15T23:59:59.000Z"),
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

    // Default activity logs (empty)
    const { getUserActivityLogs } = require("@/models/ActivityLog");
    getUserActivityLogs.mockResolvedValue([]);

    // Default successful streak recalculation
    const { recalculateStreaks } = require("@/lib/gamification/streaks");
    recalculateStreaks.mockResolvedValue({
      success: true,
      streaks: {
        current: 7,
        longest: 15,
        lastDate: new Date("2024-01-15T23:59:59.000Z"),
      },
      activitiesProcessed: 45,
      corrections: [],
    });

    // Default successful user update
    const { updateUserGamification } = require("@/models/User");
    updateUserGamification.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated GET requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/streaks");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject unauthenticated POST requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("GET /api/gamification/streaks", () => {
    it("should return user streak information", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.current).toBe(7);
      expect(data.data.longest).toBe(15);
      expect(data.data.isActive).toBe(true);
      expect(data.data.lastDate).toBe("2024-01-15T23:59:59.000Z");
    });

    it("should include history when requested", async () => {
      const { getUserActivityLogs } = require("@/models/ActivityLog");
      getUserActivityLogs.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/streaks?includeHistory=true&days=7"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.history).toBeDefined();
      expect(Array.isArray(data.data.history)).toBe(true);
      expect(data.data.history.length).toBe(7);
    });

    it("should handle users with missing streak data", async () => {
      const { getUserById } = require("@/models/User");
      getUserById.mockResolvedValue({
        _id: "user123",
        // No streaks data
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/streaks");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.current).toBe(0);
      expect(data.data.longest).toBe(0);
      expect(data.data.isActive).toBe(false);
    });

    it("should validate query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/streaks?days=150"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });
  });

  describe("POST /api/gamification/streaks", () => {
    it("should recalculate streaks successfully", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.message).toBe("Streaks recalculated successfully");
      expect(data.data.streaks).toBeDefined();
      expect(data.data.activitiesProcessed).toBe(45);
    });

    it("should accept fromDate parameter", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({
          fromDate: "2024-01-01T00:00:00.000Z",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const { recalculateStreaks } = require("@/lib/gamification/streaks");
      expect(recalculateStreaks).toHaveBeenCalledWith("user123", new Date("2024-01-01T00:00:00.000Z"));
    });

    it("should handle streak recalculation failures", async () => {
      const { recalculateStreaks } = require("@/lib/gamification/streaks");
      recalculateStreaks.mockResolvedValue({
        success: false,
        error: "Failed to process activities",
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBeDefined();
    });

    it("should validate request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({
          fromDate: "invalid-date",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBe("Invalid request body");
    });

    it("should update user gamification data after recalculation", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await POST(request);

      const { updateUserGamification } = require("@/models/User");
      expect(updateUserGamification).toHaveBeenCalledWith("user123", {
        currentStreak: 7,
        longestStreak: 15,
        lastStreakDate: expect.any(Date),
        "streaks.current": 7,
        "streaks.longest": 15,
        "streaks.lastDate": expect.any(Date),
      });
    });

    it("should handle server errors gracefully", async () => {
      const { recalculateStreaks } = require("@/lib/gamification/streaks");
      recalculateStreaks.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/streaks", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});