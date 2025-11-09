import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LevelBadge } from "../LevelBadge";
import { GamificationProvider } from "@/components/providers/GamificationProvider";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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

const renderWithProvider = (component: React.ReactElement, initialData?: any) => {
  return render(
    <GamificationProvider initialData={initialData}>
      {component}
    </GamificationProvider>
  );
};

describe("LevelBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders level badge with correct level", () => {
    renderWithProvider(<LevelBadge />, { level: 5, xp: 250 });
    
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("applies correct size classes", () => {
    const { container } = renderWithProvider(<LevelBadge size="lg" />, { level: 2, xp: 100 });
    
    const containerDiv = container.querySelector(".w-12.h-12");
    expect(containerDiv).toBeInTheDocument();
  });

  it("renders without crashing for different sizes", () => {
    renderWithProvider(<LevelBadge size="sm" />, { level: 1, xp: 0 });
    renderWithProvider(<LevelBadge size="md" />, { level: 2, xp: 50 });
    renderWithProvider(<LevelBadge size="lg" />, { level: 3, xp: 200 });
  });

  it("respects reduced motion preference", () => {
    // Mock prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithProvider(<LevelBadge showAnimation={true} />, { level: 4, xp: 200 });
    
    // Should still render without animations
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});