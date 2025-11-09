/**
 * Tests for gamification API index route
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock NextAuth
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Gamification API Index Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/gamification", () => {
    it("should return API documentation for unauthenticated users", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.title).toBe("Gamification API");
      expect(data.version).toBe("1.0.0");
      expect(data.description).toBeDefined();
      expect(data.authenticated).toBe(false);
      expect(data.endpoints).toBeDefined();
      expect(data.responseFormats).toBeDefined();
      expect(data.statusCodes).toBeDefined();
    });

    it("should return API documentation for authenticated users", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue({
        user: { id: "user123" },
      });

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(true);
    });

    it("should include all expected endpoints", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const endpointPaths = data.endpoints.map((e: any) => e.path);
      const expectedEndpoints = [
        "/api/gamification",
        "/api/gamification/xp",
        "/api/gamification/level",
        "/api/gamification/streaks",
        "/api/gamification/achievements",
        "/api/gamification/themes",
        "/api/gamification/activity",
        "/api/gamification/snapshot",
        "/api/gamification/events",
      ];

      expectedEndpoints.forEach(endpoint => {
        expect(endpointPaths).toContain(endpoint);
      });
    });

    it("should include correct HTTP methods for each endpoint", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const endpoints = data.endpoints;
      
      // Check GET endpoints
      const getEndpoints = endpoints.filter((e: any) => e.method === "GET");
      expect(getEndpoints.length).toBeGreaterThan(0);
      
      // Check POST endpoint for streaks
      const streakPostEndpoint = endpoints.find((e: any) => 
        e.path === "/api/gamification/streaks" && e.method === "POST"
      );
      expect(streakPostEndpoint).toBeDefined();
      
      // Check PATCH endpoint for themes
      const themePatchEndpoint = endpoints.find((e: any) => 
        e.path === "/api/gamification/themes" && e.method === "PATCH"
      );
      expect(themePatchEndpoint).toBeDefined();
      
      // Check HEAD endpoint for events
      const eventsHeadEndpoint = endpoints.find((e: any) => 
        e.path === "/api/gamification/events" && e.method === "HEAD"
      );
      expect(eventsHeadEndpoint).toBeDefined();
    });

    it("should include authentication requirements", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Index endpoint should not require auth
      const indexEndpoint = data.endpoints.find((e: any) => e.path === "/api/gamification");
      expect(indexEndpoint.authRequired).toBe(false);
      
      // Other endpoints should require auth
      const xpEndpoint = data.endpoints.find((e: any) => e.path === "/api/gamification/xp");
      expect(xpEndpoint.authRequired).toBe(true);
    });

    it("should include query parameters for applicable endpoints", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const xpEndpoint = data.endpoints.find((e: any) => e.path === "/api/gamification/xp");
      expect(xpEndpoint.queryParams).toBeDefined();
      expect(xpEndpoint.queryParams.includeHistory).toBeDefined();
      expect(xpEndpoint.queryParams.days).toBeDefined();
      
      const achievementsEndpoint = data.endpoints.find((e: any) => e.path === "/api/gamification/achievements");
      expect(achievementsEndpoint.queryParams).toBeDefined();
      expect(achievementsEndpoint.queryParams.page).toBeDefined();
      expect(achievementsEndpoint.queryParams.status).toBeDefined();
    });

    it("should include request body schemas for mutation endpoints", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const streakPostEndpoint = data.endpoints.find((e: any) => 
        e.path === "/api/gamification/streaks" && e.method === "POST"
      );
      expect(streakPostEndpoint.body).toBeDefined();
      expect(streakPostEndpoint.body.fromDate).toBeDefined();
      
      const themePatchEndpoint = data.endpoints.find((e: any) => 
        e.path === "/api/gamification/themes" && e.method === "PATCH"
      );
      expect(themePatchEndpoint.body).toBeDefined();
      expect(themePatchEndpoint.body.themeId).toBeDefined();
    });

    it("should include response format documentation", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.responseFormats.success).toBeDefined();
      expect(data.responseFormats.error).toBeDefined();
      expect(data.responseFormats.success.properties.data).toBeDefined();
      expect(data.responseFormats.success.properties.message).toBeDefined();
      expect(data.responseFormats.error.properties.error).toBeDefined();
      expect(data.responseFormats.error.properties.code).toBeDefined();
    });

    it("should include status code documentation", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.statusCodes[200]).toBe("Successful request");
      expect(data.statusCodes[400]).toBe("Bad request - invalid parameters or body");
      expect(data.statusCodes[401]).toBe("Unauthorized - authentication required");
      expect(data.statusCodes[403]).toBe("Forbidden - insufficient permissions");
      expect(data.statusCodes[404]).toBe("Not found - resource doesn't exist");
      expect(data.statusCodes[500]).toBe("Internal server error");
    });

    it("should include full URLs for endpoints", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("https://example.com/api/gamification");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.baseUrl).toBe("https://example.com");
      
      const endpointUrls = data.endpoints.map((e: any) => e.url);
      expect(endpointUrls).toContain("https://example.com/api/gamification/xp");
      expect(endpointUrls).toContain("https://example.com/api/gamification/level");
    });

    it("should include cache control headers", async () => {
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/gamification");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");
    });
  });
});