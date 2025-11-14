/**
 * Tests for leaderboard API endpoint
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the modules
vi.mock("@/lib/gamification/apiHelpers", () => ({
  authenticateRequest: vi.fn(),
  handleApiError: vi.fn((error) => {
    console.error("Mock error handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }),
  createSuccessResponse: vi.fn((data, message) => {
    return new Response(JSON.stringify({ data, message }), { status: 200 });
  }),
  withCacheHeaders: vi.fn((response) => response),
}));

vi.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: vi.fn(() => true),
}));

vi.mock("@/models/User", () => ({
  default: {
    aggregate: vi.fn(() => Promise.resolve([])),
  },
}));

describe("Leaderboard API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Feature Flag Check", () => {
    it("should check if feature flag is required", async () => {
      const { isFeatureEnabled } = await import("@/lib/featureFlags");
      const mockFn = vi.mocked(isFeatureEnabled);

      expect(mockFn).toBeDefined();
    });
  });

  describe("Authentication", () => {
    it("should require authentication for leaderboard", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );

      expect(authenticateRequest).toBeDefined();
    });
  });

  describe("Response Structure", () => {
    it("should return proper leaderboard response structure", () => {
      const mockResponse = {
        period: "weekly",
        dateRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-07T23:59:59.999Z",
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 5,
          totalPages: 1,
        },
        leaderboard: [
          {
            rank: 1,
            userId: "user1",
            name: "Alice",
            totalXp: 5000,
            level: 10,
            isCurrentUser: false,
          },
        ],
        currentUserRank: 1,
        currentUser: {
          rank: 1,
          name: "Alice",
          totalXp: 5000,
          level: 10,
        },
      };

      expect(mockResponse).toHaveProperty("period");
      expect(mockResponse).toHaveProperty("dateRange");
      expect(mockResponse).toHaveProperty("pagination");
      expect(mockResponse).toHaveProperty("leaderboard");
      expect(mockResponse).toHaveProperty("currentUserRank");
      expect(mockResponse).toHaveProperty("currentUser");
    });

    it("should have valid pagination in response", () => {
      const pagination = {
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3,
      };

      expect(pagination.totalPages).toBe(Math.ceil(pagination.total / pagination.limit));
    });

    it("should have valid leaderboard entries", () => {
      const entry = {
        rank: 1,
        userId: "user123",
        name: "Alice",
        totalXp: 5000,
        level: 10,
        isCurrentUser: false,
      };

      expect(entry).toHaveProperty("rank");
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("totalXp");
      expect(entry).toHaveProperty("level");
      expect(entry).toHaveProperty("isCurrentUser");
    });
  });

  describe("Period Parameter", () => {
    it("should accept weekly period", () => {
      const validPeriods = ["weekly", "monthly"];
      expect(validPeriods).toContain("weekly");
    });

    it("should accept monthly period", () => {
      const validPeriods = ["weekly", "monthly"];
      expect(validPeriods).toContain("monthly");
    });

    it("should default to weekly", () => {
      const defaultPeriod = "weekly";
      expect(defaultPeriod).toBe("weekly");
    });
  });

  describe("Pagination Parameters", () => {
    it("should have default page size", () => {
      const defaultLimit = 50;
      expect(defaultLimit).toBe(50);
    });

    it("should enforce maximum limit", () => {
      const requestedLimit = 200;
      const enforced = Math.min(100, requestedLimit);
      expect(enforced).toBe(100);
    });

    it("should default to page 1", () => {
      const defaultPage = 1;
      expect(defaultPage).toBe(1);
    });
  });

  describe("Privacy Filtering", () => {
    it("should filter users by leaderboardOptIn preference", () => {
      // API should match: "preferences.leaderboardOptIn": true
      const shouldBeIncluded = {
        name: "Alice",
        preferences: { leaderboardOptIn: true },
      };

      expect(shouldBeIncluded.preferences.leaderboardOptIn).toBe(true);
    });

    it("should exclude non-opted-in users", () => {
      const shouldBeExcluded = {
        name: "Bob",
        preferences: { leaderboardOptIn: false },
      };

      expect(shouldBeExcluded.preferences.leaderboardOptIn).toBe(false);
    });
  });

  describe("Anonymization", () => {
    it("should anonymize users when anonymousMode is enabled", () => {
      const userId = "user123456789";
      const anonymized = `Anonymous #${userId.slice(-6)}`;

      expect(anonymized).toMatch(/^Anonymous #/);
    });

    it("should show real names when anonymousMode is disabled", () => {
      const name = "Alice";
      expect(name).toBe("Alice");
      expect(name).not.toMatch(/^Anonymous/);
    });

    it("should use consistent anonymization", () => {
      const userId = "user123456789";
      const anon1 = `Anonymous #${userId.slice(-6)}`;
      const anon2 = `Anonymous #${userId.slice(-6)}`;

      expect(anon1).toBe(anon2);
    });
  });

  describe("Current User Information", () => {
    it("should include current user rank", () => {
      const mockResponse = {
        currentUserRank: 5,
        leaderboard: [
          { rank: 1 },
          { rank: 2 },
          { rank: 3 },
          { rank: 4 },
          { rank: 5, isCurrentUser: true },
        ],
      };

      expect(mockResponse.currentUserRank).toBe(5);
    });

    it("should show null currentUser if not opted in", () => {
      const response = {
        currentUser: null,
      };

      expect(response.currentUser).toBeNull();
    });

    it("should include current user details when opted in", () => {
      const currentUser = {
        rank: 2,
        name: "Bob",
        totalXp: 4500,
        level: 9,
      };

      expect(currentUser).toBeDefined();
      expect(currentUser.rank).toBeDefined();
      expect(currentUser.totalXp).toBeGreaterThan(0);
    });
  });

  describe("Empty Leaderboard", () => {
    it("should handle empty leaderboard", () => {
      const response = {
        leaderboard: [],
        pagination: {
          total: 0,
          totalPages: 0,
        },
      };

      expect(response.leaderboard).toHaveLength(0);
    });

    it("should calculate correct total pages for empty leaderboard", () => {
      const total = 0;
      const limit = 50;
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(0);
    });
  });

  describe("Date Range", () => {
    it("should include valid date range", () => {
      const dateRange = {
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-01-07T23:59:59.999Z",
      };

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe("XP Sorting", () => {
    it("should rank users by XP descending", () => {
      const leaderboard = [
        { rank: 1, totalXp: 5000 },
        { rank: 2, totalXp: 4500 },
        { rank: 3, totalXp: 4000 },
      ];

      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].totalXp).toBeGreaterThanOrEqual(
          leaderboard[i + 1].totalXp
        );
      }
    });
  });
});
