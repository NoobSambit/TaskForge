/**
 * Tests for gamification themes API route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "../route";

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

// Mock gamification modules
vi.mock("@/lib/gamification/themeUnlock", () => ({
  getAvailableThemesForUser: vi.fn(),
  getUserThemeStatus: vi.fn(),
  getFutureThemeUnlocks: vi.fn(),
}));

describe("Gamification Themes API Route", () => {
  const mockUser = {
    _id: "user123",
    level: 5,
    theme: "default",
  };

  const mockThemes = [
    {
      id: "default",
      name: "Default",
      description: "Clean and simple theme",
      requiredLevel: 1,
      isUnlocked: true,
      isEquipped: true,
      previewColors: {
        primary: "#3b82f6",
        background: "#ffffff",
      },
    },
    {
      id: "dark",
      name: "Dark Mode",
      description: "Easy on the eyes dark theme",
      requiredLevel: 1,
      isUnlocked: true,
      isEquipped: false,
      previewColors: {
        primary: "#60a5fa",
        background: "#1f2937",
      },
    },
    {
      id: "neon",
      name: "Neon",
      description: "Bright neon theme",
      requiredLevel: 10,
      isUnlocked: false,
      isEquipped: false,
      previewColors: {
        primary: "#ff00ff",
        background: "#000000",
      },
    },
  ];

  const mockFutureUnlocks = [
    {
      themeId: "neon",
      requiredLevel: 10,
      unlocksAt: "Level 10",
    },
    {
      themeId: "galaxy",
      requiredLevel: 15,
      unlocksAt: "Level 15",
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

    // Default themes data
    const { getUserThemeStatus } = require("@/lib/gamification/themeUnlock");
    getUserThemeStatus.mockResolvedValue(mockThemes);

    const { getAvailableThemesForUser } = require("@/lib/gamification/themeUnlock");
    getAvailableThemesForUser.mockResolvedValue(mockThemes.filter(t => t.isUnlocked));

    const { getFutureThemeUnlocks } = require("@/lib/gamification/themeUnlock");
    getFutureThemeUnlocks.mockResolvedValue(mockFutureUnlocks);

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

      const request = new NextRequest("http://localhost:3000/api/gamification/themes");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject unauthenticated PATCH requests", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "dark" }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("GET /api/gamification/themes", () => {
    it("should return user themes", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.themes).toBeDefined();
      expect(data.data.equipped).toBe("default");
      expect(data.data.unlockedCount).toBe(2);
      expect(data.data.totalCount).toBe(3);
      expect(data.data.futureUnlocks).toBeDefined();
    });

    it("should filter themes by status", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/themes?status=available"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.themes.every((t: any) => t.isUnlocked)).toBe(true);
    });

    it("should filter locked themes", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/themes?status=locked"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.themes.every((t: any) => !t.isUnlocked && t.requiredLevel <= 10)).toBe(true);
    });

    it("should filter future themes", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/themes?status=future"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.themes.every((t: any) => t.requiredLevel > 10)).toBe(true);
    });

    it("should validate query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/gamification/themes?status=invalid"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should include cache control headers", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });

    it("should handle empty themes list", async () => {
      const { getUserThemeStatus } = require("@/lib/gamification/themeUnlock");
      getUserThemeStatus.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/gamification/themes");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.themes).toEqual([]);
      expect(data.data.unlockedCount).toBe(0);
      expect(data.data.totalCount).toBe(0);
    });

    it("should handle server errors gracefully", async () => {
      const { getUserThemeStatus } = require("@/lib/gamification/themeUnlock");
      getUserThemeStatus.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/themes");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("PATCH /api/gamification/themes", () => {
    it("should update user theme successfully", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "dark" }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.themeId).toBe("dark");
      expect(data.data.previousTheme).toBe("default");
      expect(data.data.message).toBe("Theme updated successfully");
    });

    it("should reject unavailable themes", async () => {
      const { getAvailableThemesForUser } = require("@/lib/gamification/themeUnlock");
      getAvailableThemesForUser.mockResolvedValue([mockThemes[0]]); // Only default available

      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "neon" }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBe("Theme not available or not unlocked");
    });

    it("should validate request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({}), // Missing themeId
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBe("Invalid request body");
    });

    it("should handle invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: "invalid json",
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.data.error).toBe("Invalid request body");
    });

    it("should update user gamification data", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "dark" }),
      });
      await PATCH(request);

      const { updateUserGamification } = require("@/models/User");
      expect(updateUserGamification).toHaveBeenCalledWith("user123", {
        theme: "dark",
      });
    });

    it("should handle server errors gracefully", async () => {
      const { updateUserGamification } = require("@/models/User");
      updateUserGamification.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "dark" }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });

    it("should handle theme availability check errors", async () => {
      const { getAvailableThemesForUser } = require("@/lib/gamification/themeUnlock");
      getAvailableThemesForUser.mockRejectedValue(new Error("Theme service error"));

      const request = new NextRequest("http://localhost:3000/api/gamification/themes", {
        method: "PATCH",
        body: JSON.stringify({ themeId: "dark" }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});