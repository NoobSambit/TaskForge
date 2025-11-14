import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTheme } from "../useTheme";

// Mock useGamification hook
vi.mock("@/components/providers/GamificationProvider", () => ({
  useGamification: vi.fn(() => ({
    level: 5,
    xp: 250,
    streak: 3,
  })),
}));

const mockThemeData = {
  data: {
    themes: [
      {
        id: "default",
        name: "Default Light",
        description: "Clean and minimal light theme",
        requiredLevel: 1,
        isUnlocked: true,
        isEquipped: true,
        previewColors: {
          primary: "#ffffff",
          secondary: "#f8fafc",
          background: "#1e293b",
          accent: "#3b82f6",
        },
      },
      {
        id: "dark",
        name: "Default Dark",
        description: "Dark mode for reduced eye strain",
        requiredLevel: 1,
        isUnlocked: true,
        isEquipped: false,
        previewColors: {
          primary: "#0f172a",
          secondary: "#1e293b",
          background: "#f8fafc",
          accent: "#3b82f6",
        },
      },
    ],
    equipped: "default",
  },
};

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    if (document.documentElement.hasAttribute("data-theme")) {
      document.documentElement.removeAttribute("data-theme");
    }
    if (document.body.hasAttribute("data-theme")) {
      document.body.removeAttribute("data-theme");
    }
  });

  it("fetches themes on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/themes");
    expect(result.current.themes).toHaveLength(2);
    expect(result.current.currentTheme).toBe("default");
  });

  it("sets loading state while fetching", async () => {
    const fetchMock = vi.fn(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockThemeData,
              }),
            100
          )
        )
    );
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("handles fetch errors", async () => {
    const errorMessage = "Network error";
    const fetchMock = vi.fn().mockRejectedValue(new Error(errorMessage));
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain(errorMessage);
  });

  it("applies theme to DOM when current theme changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("default");
      expect(document.body.getAttribute("data-theme")).toBe("default");
    });
  });

  it("persists theme to localStorage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("default");
    });
  });

  it("allows setting a new theme", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeData,
    });
    // Mock PATCH response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          themeId: "dark",
          previousTheme: "default",
        },
      }),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setTheme("dark");
    });

    expect(result.current.currentTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("handles theme update errors", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeData,
    });
    // Mock PATCH error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        data: {
          error: "Theme not available",
        },
      }),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.setTheme("locked-theme")).rejects.toThrow();
    expect(result.current.error).not.toBeNull();
  });

  it("provides preview functionality", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.previewTheme("dark");
    });

    expect(document.documentElement.getAttribute("data-theme-preview")).toBe("dark");
    expect(document.body.getAttribute("data-theme-preview")).toBe("dark");
  });

  it("clears preview when requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.previewTheme("dark");
    });

    expect(document.documentElement.getAttribute("data-theme-preview")).toBe("dark");

    act(() => {
      result.current.clearPreview();
    });

    expect(document.documentElement.hasAttribute("data-theme-preview")).toBe(false);
    expect(document.body.hasAttribute("data-theme-preview")).toBe(false);
  });

  it("does not preview current theme", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.previewTheme("default");
    });

    expect(document.documentElement.hasAttribute("data-theme-preview")).toBe(false);
  });

  it("updates theme list when fetched", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockThemeData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.themes).toHaveLength(2);
    });

    expect(result.current.themes[0].id).toBe("default");
    expect(result.current.themes[1].id).toBe("dark");
  });

  it("handles API response without themes gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          themes: [],
          equipped: "default",
        },
      }),
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.themes).toHaveLength(0);
    expect(result.current.currentTheme).toBe("default");
  });
});
