import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreakSummary } from "../StreakSummary";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
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

describe("StreakSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    render(<StreakSummary current={5} longest={10} />);
  });

  it("displays current streak correctly", () => {
    render(<StreakSummary current={7} longest={10} />);
    
    const currentStreakElements = screen.getAllByLabelText("7 days");
    expect(currentStreakElements.length).toBeGreaterThan(0);
  });

  it("displays longest streak correctly", () => {
    render(<StreakSummary current={5} longest={15} />);
    
    const longestStreakElements = screen.getAllByLabelText("15 days");
    expect(longestStreakElements.length).toBeGreaterThan(0);
  });

  it("shows Active badge when streak is active", () => {
    render(<StreakSummary current={5} longest={10} isActive={true} />);
    
    const activeBadges = screen.getAllByLabelText("Streak is active");
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it("does not show Active badge when streak is not active", () => {
    const { container } = render(<StreakSummary current={0} longest={10} isActive={false} />);
    
    // Check that "Active" text is not present when streak is inactive
    const activeText = screen.queryByText("Active");
    expect(activeText).not.toBeInTheDocument();
  });

  it("shows PR badge when current streak equals longest streak", () => {
    render(<StreakSummary current={10} longest={10} isActive={true} />);
    
    const prBadges = screen.getAllByLabelText("Personal record");
    expect(prBadges.length).toBeGreaterThan(0);
  });

  it("does not show PR badge when current streak is less than longest", () => {
    const { container } = render(<StreakSummary current={5} longest={10} isActive={true} />);
    
    // Check that "PR" text is not present when current < longest
    const prText = screen.queryByText("PR");
    expect(prText).not.toBeInTheDocument();
  });

  it("handles singular day correctly", () => {
    render(<StreakSummary current={1} longest={1} />);
    
    expect(screen.getAllByLabelText("1 day").length).toBeGreaterThan(0);
  });

  it("handles plural days correctly", () => {
    render(<StreakSummary current={2} longest={5} />);
    
    expect(screen.getAllByLabelText("2 days").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("5 days").length).toBeGreaterThan(0);
  });

  it("displays loading state correctly", () => {
    const { container } = render(<StreakSummary current={0} longest={0} isLoading={true} />);
    
    const loadingElements = container.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it("has proper accessibility attributes", () => {
    const { container } = render(<StreakSummary current={5} longest={10} />);
    
    const region = container.querySelector('[role="region"]');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-label", "Streak summary");
  });

  it("applies correct styling for active streak", () => {
    const { container } = render(<StreakSummary current={5} longest={10} isActive={true} />);
    
    const activeStreakContainer = container.querySelector(".bg-orange-50");
    expect(activeStreakContainer).toBeInTheDocument();
  });

  it("applies correct styling for inactive streak", () => {
    const { container } = render(<StreakSummary current={0} longest={10} isActive={false} />);
    
    const inactiveStreakContainer = container.querySelector(".bg-muted\\/50");
    expect(inactiveStreakContainer).toBeInTheDocument();
  });

  it("handles zero streaks gracefully", () => {
    render(<StreakSummary current={0} longest={0} isActive={false} />);
    
    expect(screen.getAllByLabelText("0 days").length).toBeGreaterThan(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <StreakSummary current={5} longest={10} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
