/**
 * Theme API Routes Tests
 * 
 * Tests for /api/themes endpoints
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/themes/route";
import { PUT } from "@/app/api/themes/[themeId]/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/gamification/themeUnlock", () => ({
  getAvailableThemesForUser: vi.fn(),
  getUserThemeStatus: vi.fn(),
  getFutureThemeUnlocks: vi.fn(),
  updateUserTheme: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { 
  getAvailableThemesForUser, 
  getUserThemeStatus, 
  getFutureThemeUnlocks,
  updateUserTheme 
} from "@/lib/gamification/themeUnlock";

describe("Themes API - GET /api/themes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/themes");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return all theme status by default", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    const mockThemeStatus = {
      currentTheme: "default",
      unlocked: [{ id: "default", name: "Default Light" }],
      available: [{ id: "ocean", name: "Ocean Depths" }],
      locked: [{ id: "cyberpunk", name: "Cyberpunk Neon" }],
      userLevel: 5,
    };
    vi.mocked(getUserThemeStatus).mockResolvedValue(mockThemeStatus);

    const request = new NextRequest("http://localhost:3000/api/themes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockThemeStatus);
    expect(getUserThemeStatus).toHaveBeenCalledWith("user123");
  });

  it("should return available themes when status=available", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    const mockThemes = [{ id: "default", name: "Default Light" }];
    vi.mocked(getAvailableThemesForUser).mockResolvedValue(mockThemes);

    const request = new NextRequest("http://localhost:3000/api/themes?status=available");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.themes).toEqual(mockThemes);
    expect(getAvailableThemesForUser).toHaveBeenCalledWith("user123");
  });

  it("should return future unlocks when status=future", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    const mockFutureUnlocks = [
      { level: 10, themes: [{ id: "forest", name: "Forest Green" }] }
    ];
    vi.mocked(getFutureThemeUnlocks).mockResolvedValue(mockFutureUnlocks);

    const request = new NextRequest("http://localhost:3000/api/themes?status=future");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.futureUnlocks).toEqual(mockFutureUnlocks);
    expect(getFutureThemeUnlocks).toHaveBeenCalledWith("user123");
  });

  it("should return 500 on error", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    vi.mocked(getUserThemeStatus).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost:3000/api/themes");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch themes");
  });
});

describe("Themes API - PUT /api/themes/[themeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/themes/ocean", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "ocean" } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should update theme when user has unlocked it", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    const mockUpdatedUser = {
      _id: "user123",
      theme: "ocean",
      unlockedThemes: ["default", "dark", "ocean"],
    };
    vi.mocked(updateUserTheme).mockResolvedValue(mockUpdatedUser);

    const request = new NextRequest("http://localhost:3000/api/themes/ocean", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "ocean" } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.theme).toBe("ocean");
    expect(data.user.theme).toBe("ocean");
    expect(updateUserTheme).toHaveBeenCalledWith("user123", "ocean");
  });

  it("should return 403 when theme is not unlocked", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    vi.mocked(updateUserTheme).mockRejectedValue(
      new Error('Theme "cyberpunk" is not unlocked for user user123')
    );

    const request = new NextRequest("http://localhost:3000/api/themes/cyberpunk", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "cyberpunk" } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Theme is not unlocked. Complete more levels to unlock this theme.");
  });

  it("should return 404 when theme does not exist", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    vi.mocked(updateUserTheme).mockRejectedValue(
      new Error('Theme "nonexistent" does not exist')
    );

    const request = new NextRequest("http://localhost:3000/api/themes/nonexistent", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "nonexistent" } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Theme does not exist");
  });

  it("should return 400 for invalid theme ID", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const request = new NextRequest("http://localhost:3000/api/themes/", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "" } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid theme ID");
  });

  it("should return 500 on general error", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    vi.mocked(updateUserTheme).mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest("http://localhost:3000/api/themes/ocean", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "ocean" } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to update theme");
  });

  it("should handle theme ID with special characters", async () => {
    const mockSession = { user: { id: "user123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    
    const mockUpdatedUser = {
      _id: "user123",
      theme: "sunset-orange",
      unlockedThemes: ["default", "dark", "sunset-orange"],
    };
    vi.mocked(updateUserTheme).mockResolvedValue(mockUpdatedUser);

    const request = new NextRequest("http://localhost:3000/api/themes/sunset-orange", {
      method: "PUT",
    });
    const response = await PUT(request, { params: { themeId: "sunset-orange" } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.theme).toBe("sunset-orange");
    expect(updateUserTheme).toHaveBeenCalledWith("user123", "sunset-orange");
  });
});