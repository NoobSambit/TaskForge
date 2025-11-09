"use client";

/**
 * React Hook for Gamification Real-time Updates
 * 
 * Provides a unified interface for consuming gamification events
 * via Server-Sent Events (SSE) with automatic fallback to polling
 * when SSE is unavailable or disabled.
 * 
 * Features:
 * - Automatic SSE connection with authentication
 * - Graceful fallback to polling for unsupported environments
 * - Network status integration (pause/resume based on connectivity)
 * - Event deduplication and state management
 * - Automatic cleanup on unmount
 * - Configurable polling behavior
 * 
 * Usage:
 * ```tsx
 * function GamificationComponent() {
 *   const {
 *     isConnected,
 *     isPolling,
 *     lastEvent,
 *     error,
 *     events,
 *     reconnect
 *   } = useGamificationStream({
 *     onEvent: (type, data) => {
 *       console.log('Gamification event:', type, data);
 *     },
 *     onError: (error) => {
 *       console.error('Stream error:', error);
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       {isConnected ? 'Connected' : isPolling ? 'Polling' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useNetworkStatus } from "./useNetworkStatus";
import { createGamificationPoller, shouldUsePolling, type PollingConfig } from "@/lib/gamification/polling";
import type {
  XpAwardedEvent,
  LevelUpEvent,
  AchievementUnlockedEvent,
  StreakUpdateEvent,
  ThemeUnlockedEvent,
} from "@/lib/gamification/events";

export type GamificationEventType = 
  | "xpAwarded"
  | "levelUp"
  | "achievementUnlocked"
  | "streakUpdate"
  | "themeUnlocked"
  | "connected"
  | "error";

export type GamificationEventData = 
  | XpAwardedEvent
  | LevelUpEvent
  | AchievementUnlockedEvent
  | StreakUpdateEvent
  | ThemeUnlockedEvent
  | { userId: string; connectionId: string; message: string }
  | { error: string; message?: string };

export interface UseGamificationStreamOptions {
  /** Callback for received events */
  onEvent?: (type: GamificationEventType, data: GamificationEventData) => void;
  /** Callback for connection errors */
  onError?: (error: Error) => void;
  /** Callback for connection state changes */
  onConnectionChange?: (isConnected: boolean, isPolling: boolean) => void;
  /** Polling configuration for fallback */
  pollingConfig?: PollingConfig;
  /** Whether to auto-reconnect on disconnection (default: true) */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds (default: 5000) */
  reconnectDelay?: number;
}

export interface UseGamificationStreamReturn {
  /** Whether SSE is connected */
  isConnected: boolean;
  /** Whether polling is active (fallback mode) */
  isPolling: boolean;
  /** Last received event */
  lastEvent: { type: GamificationEventType; data: GamificationEventData } | null;
  /** Current error state */
  error: Error | null;
  /** Array of recent events (for debugging/inspection) */
  events: Array<{ type: GamificationEventType; data: GamificationEventData; timestamp: Date }>;
  /** Manual reconnect function */
  reconnect: () => void;
  /** Manual disconnect function */
  disconnect: () => void;
}

/**
 * Hook to manage gamification real-time updates
 */
export function useGamificationStream(options: UseGamificationStreamOptions = {}): UseGamificationStreamReturn {
  const {
    onEvent,
    onError,
    onConnectionChange,
    pollingConfig,
    autoReconnect = true,
    reconnectDelay = 5000,
  } = options;

  const networkStatus = useNetworkStatus();
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: GamificationEventType; data: GamificationEventData } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<Array<{ type: GamificationEventType; data: GamificationEventData; timestamp: Date }>>([]);

  // Refs for connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollerRef = useRef<ReturnType<typeof createGamificationPoller> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  // Determine if we should use polling
  const usePolling = shouldUsePolling();

  // Add event to history
  const addEvent = useCallback((type: GamificationEventType, data: GamificationEventData) => {
    const event = { type, data, timestamp: new Date() };
    setLastEvent(event);
    setEvents(prev => [...prev.slice(-49), event]); // Keep last 50 events
    onEvent?.(type, data);
  }, [onEvent]);

  // Handle SSE connection
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current || isManualDisconnectRef.current) {
      return;
    }

    try {
      const eventSource = new EventSource("/api/gamification/events");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsPolling(false);
        setError(null);
        isManualDisconnectRef.current = false;
        onConnectionChange?.(true, false);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          addEvent(parsed.type as GamificationEventType, parsed.data);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
          addEvent("error", { error: "Failed to parse event data", message: event.data });
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setError(new Error("SSE connection error"));
        onConnectionChange?.(false, false);

        // Clean up
        eventSource.close();
        eventSourceRef.current = null;

        // Auto-reconnect if enabled and not manually disconnected
        if (autoReconnect && !isManualDisconnectRef.current && networkStatus.isOnline) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, reconnectDelay);
        }

        onError?.(new Error("SSE connection error"));
      };

    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      setError(error as Error);
      onError?.(error as Error);
    }
  }, [addEvent, autoReconnect, reconnectDelay, networkStatus.isOnline, onConnectionChange, onError]);

  // Handle polling connection
  const connectPolling = useCallback(() => {
    if (pollerRef.current || isManualDisconnectRef.current) {
      return;
    }

    try {
      const poller = createGamificationPoller(pollingConfig);
      pollerRef.current = poller;

      poller.start(
        (type, data) => {
          addEvent(type as GamificationEventType, data);
        },
        (error) => {
          setError(error);
          onError?.(error);
          
          // Stop polling on max retries
          if (error.message.includes("failed after")) {
            setIsPolling(false);
            onConnectionChange?.(false, false);
          }
        }
      );

      setIsPolling(true);
      setIsConnected(false);
      setError(null);
      isManualDisconnectRef.current = false;
      onConnectionChange?.(false, true);

    } catch (error) {
      console.error("Failed to start polling:", error);
      setError(error as Error);
      onError?.(error as Error);
    }
  }, [addEvent, pollingConfig, onConnectionChange, onError]);

  // Disconnect both connections
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Stop polling
    if (pollerRef.current) {
      pollerRef.current.stop();
      pollerRef.current = null;
    }

    setIsConnected(false);
    setIsPolling(false);
    onConnectionChange?.(false, false);
  }, [onConnectionChange]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    isManualDisconnectRef.current = false;
    
    // Small delay before reconnecting
    setTimeout(() => {
      if (usePolling) {
        connectPolling();
      } else {
        connectSSE();
      }
    }, 100);
  }, [disconnect, usePolling, connectPolling, connectSSE]);

  // Initialize connection based on network status and polling preference
  useEffect(() => {
    if (!networkStatus.isOnline) {
      disconnect();
      return;
    }

    if (isManualDisconnectRef.current) {
      return;
    }

    if (usePolling) {
      connectPolling();
    } else {
      connectSSE();
    }

    return disconnect;
  }, [networkStatus.isOnline, usePolling, connectPolling, connectSSE, disconnect]);

  // Pause/resume based on network status changes
  useEffect(() => {
    if (!networkStatus.isOnline) {
      disconnect();
    } else if (!isConnected && !isPolling && !isManualDisconnectRef.current) {
      reconnect();
    }
  }, [networkStatus.isOnline, isConnected, isPolling, disconnect, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isPolling,
    lastEvent,
    error,
    events,
    reconnect,
    disconnect,
  };
}