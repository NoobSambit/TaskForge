import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AchievementBadge } from "../AchievementBadge";

describe("AchievementBadge", () => {
  const baseProps = {
    title: "Test Achievement",
    description: "Test Description",
    icon: "🏆",
    rarity: "common" as const,
    isUnlocked: false,
  };

  it("should render achievement title and description", () => {
    render(<AchievementBadge {...baseProps} />);

    expect(screen.getByText("Test Achievement")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should render icon", () => {
    render(<AchievementBadge {...baseProps} />);

    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("should display rarity badge", () => {
    render(<AchievementBadge {...baseProps} rarity="legendary" />);

    expect(screen.getByText("legendary")).toBeInTheDocument();
  });

  it("should apply locked styles when not unlocked", () => {
    render(<AchievementBadge {...baseProps} isUnlocked={false} />);

    const article = screen.getByRole("article");
    expect(article).toHaveClass("opacity-75");
    expect(article).toHaveClass("grayscale");
  });

  it("should apply unlocked styles when unlocked", () => {
    render(<AchievementBadge {...baseProps} isUnlocked={true} />);

    const article = screen.getByRole("article");
    expect(article).not.toHaveClass("opacity-75");
    expect(article).not.toHaveClass("grayscale");
  });

  it("should display unlock date when unlocked", () => {
    const unlockedAt = new Date("2024-01-15").toISOString();
    render(
      <AchievementBadge
        {...baseProps}
        isUnlocked={true}
        unlockedAt={unlockedAt}
      />
    );

    expect(screen.getByText(/Unlocked/)).toBeInTheDocument();
  });

  it("should display progress bar for locked achievements with progress", () => {
    render(<AchievementBadge {...baseProps} isUnlocked={false} progress={0.6} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("60% complete")).toBeInTheDocument();
  });

  it("should not display progress bar for unlocked achievements", () => {
    render(<AchievementBadge {...baseProps} isUnlocked={true} progress={0.6} />);

    const progressBar = screen.queryByRole("progressbar");
    expect(progressBar).not.toBeInTheDocument();
  });

  it("should not display progress bar when progress is 0", () => {
    render(<AchievementBadge {...baseProps} isUnlocked={false} progress={0} />);

    const progressBar = screen.queryByRole("progressbar");
    expect(progressBar).not.toBeInTheDocument();
  });

  it("should display category when provided", () => {
    render(<AchievementBadge {...baseProps} category="tasks" />);

    expect(screen.getByText("tasks")).toBeInTheDocument();
  });

  it("should display XP reward when provided", () => {
    render(<AchievementBadge {...baseProps} xpReward={100} />);

    expect(screen.getByText("+100 XP")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const onClick = vi.fn();
    render(<AchievementBadge {...baseProps} onClick={onClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should call onClick when Enter key is pressed", () => {
    const onClick = vi.fn();
    render(<AchievementBadge {...baseProps} onClick={onClick} />);

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should call onClick when Space key is pressed", () => {
    const onClick = vi.fn();
    render(<AchievementBadge {...baseProps} onClick={onClick} />);

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: " ", code: "Space" });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render as article when no onClick provided", () => {
    render(<AchievementBadge {...baseProps} />);

    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should have proper accessibility labels", () => {
    render(<AchievementBadge {...baseProps} rarity="rare" />);

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute(
      "aria-label",
      "Test Achievement achievement, locked, rare rarity"
    );
  });

  it("should apply different rarity styles", () => {
    const { rerender } = render(
      <AchievementBadge {...baseProps} rarity="common" />
    );
    let article = screen.getByRole("article");
    expect(article).toHaveClass("border-gray-400");

    rerender(<AchievementBadge {...baseProps} rarity="rare" />);
    article = screen.getByRole("article");
    expect(article).toHaveClass("border-blue-400");

    rerender(<AchievementBadge {...baseProps} rarity="epic" />);
    article = screen.getByRole("article");
    expect(article).toHaveClass("border-purple-400");

    rerender(<AchievementBadge {...baseProps} rarity="legendary" />);
    article = screen.getByRole("article");
    expect(article).toHaveClass("border-amber-400");
  });

  it("should handle custom className", () => {
    render(<AchievementBadge {...baseProps} className="custom-class" />);

    const article = screen.getByRole("article");
    expect(article).toHaveClass("custom-class");
  });
});
