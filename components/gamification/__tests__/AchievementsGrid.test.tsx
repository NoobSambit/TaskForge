import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AchievementsGrid } from "../AchievementsGrid";
import { ToastProvider } from "@/components/providers/ToastProvider";
import * as useGamificationStreamModule from "@/hooks/useGamificationStream";

const mockUseGamificationStream = vi.fn();

vi.mock("@/hooks/useGamificationStream", () => ({
  useGamificationStream: (options: any) => mockUseGamificationStream(options),
}));

const mockAchievements = [
  {
    key: "first_task",
    title: "Getting Started",
    description: "Complete your first task",
    icon: "🎯",
    category: "tasks",
    xpReward: 10,
    rarity: "common" as const,
    isUnlocked: true,
    unlockedAt: "2024-01-15T00:00:00.000Z",
    progress: 1,
  },
  {
    key: "task_5",
    title: "Task Warrior",
    description: "Complete 5 tasks",
    icon: "⚔️",
    category: "tasks",
    xpReward: 25,
    rarity: "common" as const,
    isUnlocked: false,
    progress: 0.6,
  },
  {
    key: "level_5",
    title: "Rising Star",
    description: "Reach level 5",
    icon: "⭐",
    category: "progression",
    xpReward: 50,
    rarity: "rare" as const,
    isUnlocked: false,
    progress: 0,
  },
  {
    key: "speedster",
    title: "Speedster",
    description: "Complete a task in under 1 hour",
    icon: "⚡",
    category: "special",
    xpReward: 100,
    rarity: "legendary" as const,
    isUnlocked: true,
    unlockedAt: "2024-01-20T00:00:00.000Z",
    progress: 1,
  },
];

describe("AchievementsGrid", () => {
  beforeEach(() => {
    mockUseGamificationStream.mockReturnValue({
      isConnected: false,
      isPolling: false,
      lastEvent: null,
      error: null,
      events: [],
      reconnect: vi.fn(),
      disconnect: vi.fn(),
    });

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
  };

  it("should render with initial achievements", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Task Warrior")).toBeInTheDocument();
    expect(screen.getByText("Rising Star")).toBeInTheDocument();
    expect(screen.getByText("Speedster")).toBeInTheDocument();
  });

  it("should display correct stats", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    expect(screen.getByText("2 of 4 unlocked (50%)")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should fetch achievements from API when no initial data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          available: mockAchievements.map((a) => ({
            ...a,
            name: a.title,
          })),
        },
      }),
    });
    global.fetch = mockFetch;

    renderWithProviders(<AchievementsGrid />);

    expect(screen.getByText(/Loading achievements/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/gamification/achievements");
  });

  it("should handle API error gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
    });
    global.fetch = mockFetch;

    renderWithProviders(<AchievementsGrid />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load achievements/)
      ).toBeInTheDocument();
    });
  });

  it("should filter by status", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const statusFilter = screen.getByLabelText("Filter by status");
    fireEvent.change(statusFilter, { target: { value: "unlocked" } });

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Speedster")).toBeInTheDocument();
    });
    expect(screen.queryByText("Task Warrior")).not.toBeInTheDocument();
    expect(screen.queryByText("Rising Star")).not.toBeInTheDocument();
  });

  it("should filter by category", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const categoryFilter = screen.getByLabelText("Filter by category");
    fireEvent.change(categoryFilter, { target: { value: "tasks" } });

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Task Warrior")).toBeInTheDocument();
    });
    expect(screen.queryByText("Rising Star")).not.toBeInTheDocument();
    expect(screen.queryByText("Speedster")).not.toBeInTheDocument();
  });

  it("should filter by rarity", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const rarityFilter = screen.getByLabelText("Filter by rarity");
    fireEvent.change(rarityFilter, { target: { value: "legendary" } });

    await waitFor(() => {
      expect(screen.getByText("Speedster")).toBeInTheDocument();
    });
    expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
    expect(screen.queryByText("Task Warrior")).not.toBeInTheDocument();
    expect(screen.queryByText("Rising Star")).not.toBeInTheDocument();
  });

  it("should show locked achievements with dimmed appearance", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const achievements = screen.getAllByRole("article");
    const lockedAchievements = achievements.filter((a) =>
      a.classList.contains("grayscale")
    );

    expect(lockedAchievements.length).toBe(2);
  });

  it("should show unlocked achievements with full color", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const achievements = screen.getAllByRole("article");
    const unlockedAchievements = achievements.filter(
      (a) => !a.classList.contains("grayscale")
    );

    expect(unlockedAchievements.length).toBe(2);
  });

  it("should display completion metadata for unlocked achievements", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    expect(screen.getByText(/Unlocked 1\/15\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Unlocked 1\/20\/2024/)).toBeInTheDocument();
  });

  it("should handle achievement unlock events", async () => {
    let eventHandler: any;
    mockUseGamificationStream.mockImplementation((options: any) => {
      eventHandler = options.onEvent;
      return {
        isConnected: true,
        isPolling: false,
        lastEvent: null,
        error: null,
        events: [],
        reconnect: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    expect(screen.queryByText("Achievement Unlocked")).not.toBeInTheDocument();

    const unlockEvent = {
      userId: "test-user",
      achievement: {
        key: "task_5",
        title: "Task Warrior",
        description: "Complete 5 tasks",
        icon: "⚔️",
        rarity: "common" as const,
        xpReward: 25,
      },
      timestamp: new Date(),
    };

    eventHandler("achievementUnlocked", unlockEvent);

    await waitFor(() => {
      expect(
        screen.getByText("Achievement Unlocked: Task Warrior")
      ).toBeInTheDocument();
    });
  });

  it("should not duplicate toasts for the same achievement", async () => {
    let eventHandler: any;
    mockUseGamificationStream.mockImplementation((options: any) => {
      eventHandler = options.onEvent;
      return {
        isConnected: true,
        isPolling: false,
        lastEvent: null,
        error: null,
        events: [],
        reconnect: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const unlockEvent = {
      userId: "test-user",
      achievement: {
        key: "task_5",
        title: "Task Warrior",
        description: "Complete 5 tasks",
        icon: "⚔️",
        rarity: "common" as const,
        xpReward: 25,
      },
      timestamp: new Date(),
    };

    eventHandler("achievementUnlocked", unlockEvent);
    eventHandler("achievementUnlocked", unlockEvent);

    await waitFor(() => {
      const toasts = screen.getAllByText("Achievement Unlocked: Task Warrior");
      expect(toasts.length).toBe(1);
    });
  });

  it("should show modal when achievement is clicked", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const achievementButtons = screen.getAllByRole("button");
    fireEvent.click(achievementButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should close modal when close button is clicked", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const achievementButtons = screen.getAllByRole("button");
    fireEvent.click(achievementButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should have keyboard navigation support", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const achievementButtons = screen.getAllByRole("button");
    fireEvent.keyDown(achievementButtons[0], { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should show empty state when no achievements match filters", async () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const categoryFilter = screen.getByLabelText("Filter by category");
    fireEvent.change(categoryFilter, { target: { value: "tasks" } });

    const rarityFilter = screen.getByLabelText("Filter by rarity");
    fireEvent.change(rarityFilter, { target: { value: "legendary" } });

    await waitFor(() => {
      expect(
        screen.getByText("No achievements found matching your filters.")
      ).toBeInTheDocument();
    });
  });

  it("should have proper accessibility attributes", () => {
    renderWithProviders(
      <AchievementsGrid initialAchievements={mockAchievements} />
    );

    const grid = screen.getByRole("list", { name: "Achievements grid" });
    expect(grid).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar", {
      name: /Overall achievement progress/,
    });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });
});
