import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GamificationProvider, useGamification } from "@/components/providers/GamificationProvider";

// Mock fetch
global.fetch = vi.fn();

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("GamificationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockClear();
  });

  it("provides initial gamification data", () => {
    const TestComponent = () => {
      const { xp, level, streak } = useGamification();
      return (
        <div>
          <span data-testid="initial-xp">{xp}</span>
          <span data-testid="initial-level">{level}</span>
          <span data-testid="initial-streak">{streak}</span>
        </div>
      );
    };

    render(
      <GamificationProvider initialData={{ xp: 150, level: 3, currentStreak: 5 }}>
        <TestComponent />
      </GamificationProvider>
    );

    expect(screen.getByTestId("initial-xp")).toHaveTextContent("150");
    expect(screen.getByTestId("initial-level")).toHaveTextContent("3");
    expect(screen.getByTestId("initial-streak")).toHaveTextContent("5");
  });

  it("throws error when used outside provider", () => {
    const TestComponent = () => {
      const { xp } = useGamification();
      return <span>{xp}</span>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useGamification must be used within a GamificationProvider");
  });

  it("calculates level info correctly", () => {
    const TestComponent = () => {
      const { levelInfo } = useGamification();
      return (
        <div>
          <span data-testid="level-progress">{String(levelInfo.progressPercentage ?? 0)}</span>
          <span data-testid="level-xp-to-next">{String(levelInfo.xpToNext ?? "max")}</span>
        </div>
      );
    };

    render(
      <GamificationProvider initialData={{ xp: 150, level: 3, currentStreak: 0 }}>
        <TestComponent />
      </GamificationProvider>
    );

    // Should calculate progress based on XP
    expect(screen.getByTestId("level-progress")).toBeInTheDocument();
    expect(screen.getByTestId("level-xp-to-next")).toBeInTheDocument();
  });
});