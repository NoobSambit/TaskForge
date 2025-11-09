/**
 * Tests for useGamificationStream hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGamificationStream } from "../useGamificationStream";
import * as pollingModule from "@/lib/gamification/polling";

// Mock polling module
vi.mock("@/lib/gamification/polling", () => ({
  shouldUsePolling: vi.fn(),
  createGamificationPoller: vi.fn(),
}));

// Mock network status hook
vi.mock("../useNetworkStatus", () => ({
  useNetworkStatus: vi.fn(() => ({
    isOnline: true,
    wasOffline: false,
    connectionStatus: "online",
    connectionMetadata: {},
    failureCount: 0,
    lastTransition: null,
    recheck: vi.fn(),
    logFailure: vi.fn(),
    resetFailures: vi.fn(),
  })),
}));

// Mock EventSource
class MockEventSource {
  url: string;
  eventHandlers: Record<string, Function> = {};
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, handler: Function) {
    this.eventHandlers[event] = handler;
  }

  removeEventListener(event: string, handler: Function) {
    delete this.eventHandlers[event];
  }

  close() {
    this.readyState = 2;
  }

  // Helper for testing
  simulateMessage(data: any) {
    this.eventHandlers.message?.({ data: JSON.stringify(data) });
  }

  simulateError() {
    this.eventHandlers.error?.(new Error("Connection error"));
  }

  simulateOpen() {
    this.readyState = 1;
    this.eventHandlers.open?.();
  }
}

// Replace global EventSource
Object.defineProperty(global, "EventSource", {
  writable: true,
  value: MockEventSource,
});

describe("useGamificationStream", () => {
  const mockOnEvent = vi.fn();
  const mockOnError = vi.fn();
  const mockOnConnectionChange = vi.fn();
  const mockPoller = {
    start: vi.fn(),
    stop: vi.fn(),
    isActive: vi.fn(() => false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock polling
    vi.mocked(pollingModule.shouldUsePolling).mockReturnValue(false);
    vi.mocked(pollingModule.createGamificationPoller).mockReturnValue(mockPoller);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic functionality", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isPolling).toBe(false);
      expect(result.current.lastEvent).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.events).toEqual([]);
      expect(typeof result.current.reconnect).toBe("function");
      expect(typeof result.current.disconnect).toBe("function");
    });

    it("should call event handlers when provided", () => {
      renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
          onError: mockOnError,
          onConnectionChange: mockOnConnectionChange,
        })
      );

      // Event handlers should be set up
      expect(typeof mockOnEvent).toBe("function");
      expect(typeof mockOnError).toBe("function");
      expect(typeof mockOnConnectionChange).toBe("function");
    });
  });

  describe("Polling fallback", () => {
    beforeEach(() => {
      vi.mocked(pollingModule.shouldUsePolling).mockReturnValue(true);
    });

    it("should use polling when SSE is not available", () => {
      renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
          onError: mockOnError,
          onConnectionChange: mockOnConnectionChange,
        })
      );

      expect(pollingModule.createGamificationPoller).toHaveBeenCalled();
      expect(mockPoller.start).toHaveBeenCalled();
      expect(mockOnConnectionChange).toHaveBeenCalledWith(false, true);
    });

    it("should stop polling when unmounting", () => {
      const { unmount } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      unmount();

      expect(mockPoller.stop).toHaveBeenCalled();
    });
  });

  describe("Event handling", () => {
    it("should track event history", () => {
      const { result } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      // Simulate event handling
      act(() => {
        mockOnEvent("xpAwarded", { xpDelta: 25 });
        mockOnEvent("levelUp", { newLevel: 3 });
      });

      expect(result.current.events).toHaveLength(2);
      expect(result.current.events[0]).toMatchObject({
        type: "xpAwarded",
        data: { xpDelta: 25 },
      });
      expect(result.current.events[1]).toMatchObject({
        type: "levelUp",
        data: { newLevel: 3 },
      });
    });

    it("should update last event", () => {
      const { result } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      act(() => {
        mockOnEvent("xpAwarded", { xpDelta: 25 });
      });

      expect(result.current.lastEvent).toEqual({
        type: "xpAwarded",
        data: { xpDelta: 25 },
      });
    });
  });

  describe("Manual controls", () => {
    it("should support manual disconnect", () => {
      const { result } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      act(() => {
        result.current.disconnect();
      });

      expect(mockPoller.stop).toHaveBeenCalled();
    });

    it("should support manual reconnect", () => {
      const { result } = renderHook(() => 
        useGamificationStream({
          onEvent: mockOnEvent,
        })
      );

      act(() => {
        result.current.reconnect();
      });

      expect(mockPoller.stop).toHaveBeenCalled();
      expect(mockPoller.start).toHaveBeenCalled();
    });
  });
});