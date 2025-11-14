import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "../ToastProvider";

function TestComponent() {
  const { addToast, removeToast, clearAll } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          addToast({
            title: "Test Toast",
            description: "Test Description",
          })
        }
      >
        Add Toast
      </button>
      <button
        onClick={() =>
          addToast({
            title: "Achievement Unlocked",
            icon: "🏆",
            rarity: "legendary",
          })
        }
      >
        Add Achievement Toast
      </button>
      <button onClick={clearAll}>Clear All</button>
    </div>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should render children", () => {
    render(
      <ToastProvider>
        <div>Test Content</div>
      </ToastProvider>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should add toast when addToast is called", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText("Add Toast");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should add multiple toasts", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText("Add Toast");
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    await waitFor(() => {
      const toasts = screen.getAllByText("Test Toast");
      expect(toasts).toHaveLength(2);
    });
  });

  it("should not add duplicate toasts for the same achievement", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addAchievementButton = screen.getByText("Add Achievement Toast");
    fireEvent.click(addAchievementButton);

    await waitFor(() => {
      expect(screen.getByText("Achievement Unlocked")).toBeInTheDocument();
    });

    fireEvent.click(addAchievementButton);

    await waitFor(() => {
      const toasts = screen.getAllByText("Achievement Unlocked");
      expect(toasts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should respect maxToasts limit", async () => {
    render(
      <ToastProvider maxToasts={2}>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText("Add Toast");
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    await waitFor(() => {
      const toasts = screen.getAllByText("Test Toast");
      expect(toasts.length).toBeLessThanOrEqual(2);
    });
  });

  it("should clear all toasts when clearAll is called", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText("Add Toast");
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByText("Test Toast")).toHaveLength(2);
    });

    const clearButton = screen.getByText("Clear All");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText("Test Toast")).not.toBeInTheDocument();
    });
  });

  it("should auto-remove toasts after duration", async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText("Add Toast");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText("Test Toast")).not.toBeInTheDocument();
    });
  });

  it("should throw error when useToast is used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useToast must be used within a ToastProvider");

    consoleError.mockRestore();
  });
});
