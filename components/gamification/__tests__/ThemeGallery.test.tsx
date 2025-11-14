import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeGallery } from "../ThemeGallery";
import { GamificationProvider } from "@/components/providers/GamificationProvider";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock useTheme hook
vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn(),
}));

// Mock useGamificationStream
vi.mock("@/hooks/useGamificationStream", () => ({
  useGamificationStream: vi.fn(() => ({
    isConnected: true,
    isPolling: false,
    reconnect: vi.fn(),
    disconnect: vi.fn(),
  })),
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

const mockThemes = [
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
  {
    id: "ocean",
    name: "Ocean Depths",
    description: "Deep blue theme inspired by the ocean",
    requiredLevel: 5,
    isUnlocked: false,
    isEquipped: false,
    previewColors: {
      primary: "#f0f9ff",
      secondary: "#e0f2fe",
      background: "#0c4a6e",
      accent: "#0284c7",
    },
  },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GamificationProvider initialData={{ xp: 0, level: 1, currentStreak: 0 }}>
      {component}
    </GamificationProvider>
  );
};

describe("ThemeGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { useTheme } = require("@/hooks/useTheme");
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: mockThemes,
      isLoading: false,
      error: null,
      setTheme: vi.fn(),
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });
  });

  it("renders theme gallery with theme cards", () => {
    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText("Default Light")).toBeInTheDocument();
    expect(screen.getByText("Default Dark")).toBeInTheDocument();
    expect(screen.getByText("Ocean Depths")).toBeInTheDocument();
  });

  it("displays loading state when isLoading is true", () => {
    const { useTheme } = require("@/hooks/useTheme");
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: [],
      isLoading: true,
      error: null,
      setTheme: vi.fn(),
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText("Loading themes...")).toBeInTheDocument();
  });

  it("displays error message when fetch fails", () => {
    const { useTheme } = require("@/hooks/useTheme");
    const mockError = new Error("Failed to fetch themes");
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: [],
      isLoading: false,
      error: mockError,
      setTheme: vi.fn(),
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText("Failed to Load Themes")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch themes")).toBeInTheDocument();
  });

  it("marks equipped theme with checkmark", () => {
    renderWithProvider(<ThemeGallery />);
    
    const equippedTheme = screen.getByRole("button", {
      name: /Default Light.*currently active/,
    });
    expect(equippedTheme).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows lock indicator for locked themes", () => {
    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("shows level requirements for locked themes", () => {
    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText(/Requires Level 5/)).toBeInTheDocument();
  });

  it("allows clicking unlocked, non-equipped themes", async () => {
    const { useTheme } = require("@/hooks/useTheme");
    const setThemeMock = vi.fn().mockResolvedValue(undefined);
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: mockThemes,
      isLoading: false,
      error: null,
      setTheme: setThemeMock,
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    const darkTheme = screen.getByRole("button", {
      name: /Default Dark.*unlocked/,
    });
    fireEvent.click(darkTheme);
    
    await waitFor(() => {
      expect(setThemeMock).toHaveBeenCalledWith("dark");
    });
  });

  it("prevents clicking locked themes", () => {
    renderWithProvider(<ThemeGallery />);
    
    const oceanTheme = screen.getByRole("button", {
      name: /Ocean Depths.*locked/,
    });
    expect(oceanTheme).toHaveAttribute("aria-disabled", "true");
    expect(oceanTheme).toHaveAttribute("tabindex", "-1");
  });

  it("supports keyboard navigation (Enter key)", async () => {
    const { useTheme } = require("@/hooks/useTheme");
    const setThemeMock = vi.fn().mockResolvedValue(undefined);
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: mockThemes,
      isLoading: false,
      error: null,
      setTheme: setThemeMock,
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    const darkTheme = screen.getByRole("button", {
      name: /Default Dark/,
    });
    fireEvent.keyDown(darkTheme, { key: "Enter" });
    
    await waitFor(() => {
      expect(setThemeMock).toHaveBeenCalledWith("dark");
    });
  });

  it("supports keyboard navigation (Space key)", async () => {
    const { useTheme } = require("@/hooks/useTheme");
    const setThemeMock = vi.fn().mockResolvedValue(undefined);
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: mockThemes,
      isLoading: false,
      error: null,
      setTheme: setThemeMock,
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    const darkTheme = screen.getByRole("button", {
      name: /Default Dark/,
    });
    fireEvent.keyDown(darkTheme, { key: " " });
    
    await waitFor(() => {
      expect(setThemeMock).toHaveBeenCalledWith("dark");
    });
  });

  it("provides preview functionality on hover", () => {
    const { useTheme } = require("@/hooks/useTheme");
    const previewThemeMock = vi.fn();
    const clearPreviewMock = vi.fn();
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: mockThemes,
      isLoading: false,
      error: null,
      setTheme: vi.fn(),
      previewTheme: previewThemeMock,
      clearPreview: clearPreviewMock,
    });

    renderWithProvider(<ThemeGallery />);
    
    const darkTheme = screen.getByRole("button", {
      name: /Default Dark/,
    });
    
    fireEvent.mouseEnter(darkTheme);
    expect(previewThemeMock).toHaveBeenCalledWith("dark");
    
    fireEvent.mouseLeave(darkTheme);
    expect(clearPreviewMock).toHaveBeenCalled();
  });

  it("displays progress bar for locked themes with user progress", () => {
    renderWithProvider(<ThemeGallery />);
    
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows preview swatches for each theme", () => {
    const { container } = renderWithProvider(<ThemeGallery />);
    
    const swatches = container.querySelectorAll("[style*='background-color']");
    expect(swatches.length).toBeGreaterThan(0);
  });

  it("displays message when no themes are available", () => {
    const { useTheme } = require("@/hooks/useTheme");
    useTheme.mockReturnValue({
      currentTheme: "default",
      themes: [],
      isLoading: false,
      error: null,
      setTheme: vi.fn(),
      previewTheme: vi.fn(),
      clearPreview: vi.fn(),
    });

    renderWithProvider(<ThemeGallery />);
    
    expect(screen.getByText(/No themes available/)).toBeInTheDocument();
  });
});
