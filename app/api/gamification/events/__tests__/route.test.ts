/**
 * Tests for gamification events SSE route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../route";

// Mock NextAuth
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock the gamification events
vi.mock("@/lib/gamification/events", () => ({
  gamificationEvents: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  GAMIFICATION_EVENTS: {
    XP_AWARDED: "xpAwarded",
    LEVEL_UP: "levelUp",
    ACHIEVEMENT_UNLOCKED: "achievementUnlocked",
    STREAK_UPDATE: "streakUpdate",
    THEME_UNLOCKED: "themeUnlocked",
  },
}));

describe("Gamification Events SSE Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification/events");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should reject requests without user ID", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValue({ user: {} });

      const request = new NextRequest("http://localhost:3000/api/gamification/events");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should accept authenticated requests", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user123", name: "Test User", email: "test@example.com" },
      });

      const request = new NextRequest("http://localhost:3000/api/gamification/events");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
    });
  });

  describe("SSE Stream", () => {
    beforeEach(() => {
      const { getServerSession } = require("next-auth");
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user123", name: "Test User", email: "test@example.com" },
      });
    });

    it("should create readable stream for authenticated user", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/events");
      const response = await GET(request);

      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it("should register event listeners for all gamification events", async () => {
      const request = new NextRequest("http://localhost:3000/api/gamification/events");
      
      // Start the stream
      const response = await GET(request);
      
      // Verify that event listeners were registered
      const { gamificationEvents } = await import("@/lib/gamification/events");
      expect(gamificationEvents.on).toHaveBeenCalledWith("xpAwarded", expect.any(Function));
      expect(gamificationEvents.on).toHaveBeenCalledWith("levelUp", expect.any(Function));
      expect(gamificationEvents.on).toHaveBeenCalledWith("achievementUnlocked", expect.any(Function));
      expect(gamificationEvents.on).toHaveBeenCalledWith("streakUpdate", expect.any(Function));
      expect(gamificationEvents.on).toHaveBeenCalledWith("themeUnlocked", expect.any(Function));
    });
  });

  describe("HEAD requests", () => {
    it("should return 200 for HEAD requests", async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});