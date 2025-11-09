import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { XpProgressIndicator } from "../XpProgressIndicator";
import { GamificationProvider } from "@/components/providers/GamificationProvider";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
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

describe("XpProgressIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderWithProvider(<XpProgressIndicator variant="circular" />, { xp: 150, level: 3 });
  });

  it("renders linear progress variant", () => {
    const { container } = renderWithProvider(<XpProgressIndicator variant="linear" />, { xp: 150, level: 3 });
    
    // Should render a progress bar
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("applies correct size for large variant", () => {
    const { container } = renderWithProvider(
      <XpProgressIndicator variant="circular" size="lg" />, 
      { xp: 100, level: 2 }
    );
    
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("80");
    expect(svg?.getAttribute("height")).toBe("80");
  });

  it("has proper accessibility attributes", () => {
    renderWithProvider(<XpProgressIndicator variant="circular" />, { xp: 150, level: 3 });
    
    const progressElement = document.querySelector('[role="progressbar"]');
    expect(progressElement).toBeInTheDocument();
    expect(progressElement).toHaveAttribute("aria-label");
  });

  it("handles different prop combinations", () => {
    const { container } = renderWithProvider(
      <XpProgressIndicator 
        variant="circular" 
        size="sm" 
        showLabel={false}
        showAnimation={false}
      />, 
      { xp: 100, level: 2 }
    );
    
    // Should render without labels inside the component
    const xpTexts = container.querySelectorAll(".absolute span");
    expect(xpTexts.length).toBe(0);
  });
});