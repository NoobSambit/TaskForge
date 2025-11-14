import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GamificationProvider } from "@/components/providers/GamificationProvider";
import DashboardPage from "../page";

// Mock hooks
vi.mock("@/components/providers", () => ({
  GamificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGamification: () => ({
    xp: 100,
    levelInfo: { level: 2, xpToNext: 50, progressPercentage: 66.7 },
    streak: 5,
    isConnected: true,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useStreakData", () => ({
  useStreakData: () => ({
    data: {
      current: 5,
      longest: 10,
      history: [],
      isActive: true,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
    trackTimeOnPage: vi.fn(),
    trackSectionInteraction: vi.fn(),
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

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

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GamificationProvider>
      {component}
    </GamificationProvider>
  );
};

describe("Gamification Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard with loading skeleton initially", () => {
    renderWithProvider(<DashboardPage />);

    // Should show skeleton initially
    expect(screen.getByRole("status", { busy: true })).toBeInTheDocument();
  });

  it("has proper e2e data attributes", () => {
    renderWithProvider(<DashboardPage />);

    // Check for main dashboard container
    const dashboard = screen.getByTestId("gamification-dashboard");
    expect(dashboard).toHaveAttribute("data-e2e", "gamification-dashboard");
  });

  it("shows connection status", () => {
    renderWithProvider(<DashboardPage />);

    // Should show connection status after loading
    expect(screen.getByText(/Live updates|Offline mode/)).toBeInTheDocument();
  });

  it("has screen reader announcements", () => {
    renderWithProvider(<DashboardPage />);

    // Check for ARIA live region
    const liveRegion = screen.getByText(/Current XP: 100, Level: 2, Streak: 5 days/);
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });
});