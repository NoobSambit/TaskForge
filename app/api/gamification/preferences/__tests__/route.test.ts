/**
 * Tests for preferences API endpoint
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "../route";

// Mock authentication
vi.mock("@/lib/gamification/apiHelpers", () => ({
  authenticateRequest: vi.fn(),
  handleApiError: vi.fn((error) => {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }),
  createSuccessResponse: vi.fn((data, message) => {
    return new Response(JSON.stringify({ data, message }), { status: 200 });
  }),
  withCacheHeaders: vi.fn((response) => response),
}));

// Mock User model
const mockUser = {
  findByIdAndUpdate: vi.fn(),
};

vi.mock("@/models/User", () => ({
  default: mockUser,
}));

describe("Preferences API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/gamification/preferences", () => {
    it("should require authentication", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return user preferences", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {
          preferences: {
            leaderboardOptIn: true,
            anonymousMode: false,
            timezone: "UTC",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.leaderboardOptIn).toBe(true);
      expect(data.data.anonymousMode).toBe(false);
      expect(data.data.timezone).toBe("UTC");
    });

    it("should use defaults for missing preferences", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {
          preferences: null,
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.leaderboardOptIn).toBe(true);
      expect(data.data.anonymousMode).toBe(false);
    });
  });

  describe("PATCH /api/gamification/preferences", () => {
    it("should require authentication", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          body: JSON.stringify({ leaderboardOptIn: false }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(401);
    });

    it("should update leaderboardOptIn preference", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      mockUser.findByIdAndUpdate.mockResolvedValue({
        preferences: {
          leaderboardOptIn: false,
          anonymousMode: false,
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderboardOptIn: false }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { $set: { "preferences.leaderboardOptIn": false } },
        { new: true, lean: true }
      );
    });

    it("should update anonymousMode preference", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      mockUser.findByIdAndUpdate.mockResolvedValue({
        preferences: {
          leaderboardOptIn: true,
          anonymousMode: true,
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymousMode: true }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { $set: { "preferences.anonymousMode": true } },
        { new: true, lean: true }
      );
    });

    it("should update multiple preferences at once", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      mockUser.findByIdAndUpdate.mockResolvedValue({
        preferences: {
          leaderboardOptIn: false,
          anonymousMode: true,
          timezone: "EST",
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaderboardOptIn: false,
            anonymousMode: true,
            timezone: "EST",
          }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        expect.objectContaining({
          $set: expect.objectContaining({
            "preferences.leaderboardOptIn": false,
            "preferences.anonymousMode": true,
            "preferences.timezone": "EST",
          }),
        }),
        { new: true, lean: true }
      );
    });

    it("should reject invalid JSON", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it("should reject unknown preferences", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaderboardOptIn: true,
            unknownField: "value",
          }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it("should return 404 if user not found", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      mockUser.findByIdAndUpdate.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderboardOptIn: false }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(404);
    });

    it("should validate preference values", async () => {
      const { authenticateRequest } = await import(
        "@/lib/gamification/apiHelpers"
      );
      (authenticateRequest as any).mockResolvedValue({
        success: true,
        userId: "user123",
        user: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/gamification/preferences",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderboardOptIn: "not a boolean" }),
        }
      );
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });
});
