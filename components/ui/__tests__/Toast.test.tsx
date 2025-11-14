import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Toast, ToastContainer } from "../Toast";
import type { ToastData } from "../Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should render toast with title and description", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        description="Test Description"
        onClose={onClose}
      />
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should render icon when provided", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        icon="🏆"
        onClose={onClose}
      />
    );

    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("should apply correct rarity styles", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Toast
        id="test-toast"
        title="Common Achievement"
        rarity="common"
        onClose={onClose}
      />
    );

    let toast = screen.getByRole("alert");
    expect(toast).toHaveClass("border-gray-400");

    rerender(
      <Toast
        id="test-toast"
        title="Legendary Achievement"
        rarity="legendary"
        onClose={onClose}
      />
    );

    toast = screen.getByRole("alert");
    expect(toast).toHaveClass("border-amber-400");
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        onClose={onClose}
      />
    );

    const closeButton = screen.getByLabelText("Close notification");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledWith("test-toast");
  });

  it("should auto-close after duration", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        duration={3000}
        onClose={onClose}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onClose).toHaveBeenCalledWith("test-toast");
  });

  it("should not auto-close when duration is 0", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        duration={0}
        onClose={onClose}
      />
    );

    vi.advanceTimersByTime(10000);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    const onClose = vi.fn();
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        onClose={onClose}
      />
    );

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveAttribute("aria-atomic", "true");
  });
});

describe("ToastContainer", () => {
  it("should render multiple toasts", () => {
    const toasts: ToastData[] = [
      { id: "1", title: "Toast 1" },
      { id: "2", title: "Toast 2" },
      { id: "3", title: "Toast 3" },
    ];
    const onClose = vi.fn();

    render(<ToastContainer toasts={toasts} onClose={onClose} />);

    expect(screen.getByText("Toast 1")).toBeInTheDocument();
    expect(screen.getByText("Toast 2")).toBeInTheDocument();
    expect(screen.getByText("Toast 3")).toBeInTheDocument();
  });

  it("should render empty container when no toasts", () => {
    const onClose = vi.fn();
    const { container } = render(<ToastContainer toasts={[]} onClose={onClose} />);

    const region = screen.getByRole("region");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-label", "Notifications");
  });

  it("should remove toast from list when closed", () => {
    const toasts: ToastData[] = [
      { id: "1", title: "Toast 1" },
      { id: "2", title: "Toast 2" },
    ];
    const onClose = vi.fn();

    render(<ToastContainer toasts={toasts} onClose={onClose} />);

    const closeButtons = screen.getAllByLabelText("Close notification");
    fireEvent.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalledWith("1");
  });
});
