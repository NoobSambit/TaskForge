import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useStreakData } from "../useStreakData";

describe("useStreakData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches streak data successfully", async () => {
    const mockData = {
      data: {
        current: 5,
        longest: 10,
        lastDate: "2024-01-15T00:00:00.000Z",
        history: [
          { date: "2024-01-15", count: 3, hasActivity: true },
          { date: "2024-01-14", count: 2, hasActivity: true },
        ],
        isActive: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStreakData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(result.current.error).toBe(null);
  });

  it("handles fetch errors", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useStreakData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Failed to fetch streak data");
  });

  it("handles network errors", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useStreakData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("respects custom days parameter", async () => {
    const mockData = {
      data: {
        current: 3,
        longest: 7,
        history: [],
        isActive: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStreakData({ days: 60 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("days=60"),
      expect.any(Object)
    );
  });

  it("can be disabled with enabled option", async () => {
    const { result } = renderHook(() => useStreakData({ enabled: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toBe(null);
  });

  it("refetch function works correctly", async () => {
    const mockData = {
      data: {
        current: 5,
        longest: 10,
        history: [],
        isActive: true,
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStreakData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("includes correct headers in request", async () => {
    const mockData = {
      data: {
        current: 2,
        longest: 5,
        history: [],
        isActive: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderHook(() => useStreakData());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });
  });

  it("constructs correct API URL", async () => {
    const mockData = {
      data: {
        current: 1,
        longest: 3,
        history: [],
        isActive: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderHook(() => useStreakData({ days: 90 }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gamification/streaks?includeHistory=true&days=90",
        expect.any(Object)
      );
    });
  });
});
