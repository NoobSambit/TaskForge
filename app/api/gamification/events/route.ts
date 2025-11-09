/**
 * Server-Sent Events (SSE) endpoint for real-time gamification updates
 * 
 * This endpoint provides a persistent connection for streaming gamification events
 * to authenticated clients. It handles authentication, connection management,
 * heartbeat keep-alives, and proper cleanup.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gamificationEvents, GAMIFICATION_EVENTS } from "@/lib/gamification/events";
import type {
  XpAwardedEvent,
  LevelUpEvent,
  AchievementUnlockedEvent,
  StreakUpdateEvent,
  ThemeUnlockedEvent,
} from "@/lib/gamification/events";

// Connection store to track active connections
const activeConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  lastHeartbeat: number;
  userId: string;
}>();

// Cleanup interval for stale connections
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
const CONNECTION_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [connectionId, connection] of activeConnections.entries()) {
      if (now - connection.lastHeartbeat > CONNECTION_TIMEOUT) {
        try {
          connection.controller.close();
        } catch (error) {
          // Ignore errors on cleanup
        }
        activeConnections.delete(connectionId);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Send an event to a specific connection
 */
function sendEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: any
): void {
  try {
    const eventData = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });
    
    controller.enqueue(`data: ${eventData}\n\n`);
  } catch (error) {
    // Connection likely closed, ignore
  }
}

/**
 * Send heartbeat to keep connection alive
 */
function sendHeartbeat(
  controller: ReadableStreamDefaultController
): void {
  try {
    controller.enqueue(`: heartbeat\n\n`);
  } catch (error) {
    // Connection likely closed, ignore
  }
}

/**
 * GET handler for SSE stream
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const connectionId = `${userId}-${Date.now()}-${Math.random()}`;

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      activeConnections.set(connectionId, {
        controller,
        lastHeartbeat: Date.now(),
        userId,
      });

      // Send initial connection event
      sendEvent(controller, "connected", {
        userId,
        connectionId,
        message: "Connected to gamification events stream",
      });

      // Setup event listeners for this user
      const eventHandlers = {
        [GAMIFICATION_EVENTS.XP_AWARDED]: (event: XpAwardedEvent) => {
          if (event.userId === userId) {
            sendEvent(controller, "xpAwarded", event);
          }
        },
        [GAMIFICATION_EVENTS.LEVEL_UP]: (event: LevelUpEvent) => {
          if (event.userId === userId) {
            sendEvent(controller, "levelUp", event);
          }
        },
        [GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED]: (event: AchievementUnlockedEvent) => {
          if (event.userId === userId) {
            sendEvent(controller, "achievementUnlocked", event);
          }
        },
        [GAMIFICATION_EVENTS.STREAK_UPDATE]: (event: StreakUpdateEvent) => {
          if (event.userId === userId) {
            sendEvent(controller, "streakUpdate", event);
          }
        },
        [GAMIFICATION_EVENTS.THEME_UNLOCKED]: (event: ThemeUnlockedEvent) => {
          if (event.userId === userId) {
            sendEvent(controller, "themeUnlocked", event);
          }
        },
      };

      // Register event listeners
      Object.entries(eventHandlers).forEach(([eventName, handler]) => {
        gamificationEvents.on(eventName, handler);
      });

      // Setup heartbeat interval
      const heartbeatInterval = setInterval(() => {
        const connection = activeConnections.get(connectionId);
        if (connection) {
          connection.lastHeartbeat = Date.now();
          sendHeartbeat(controller);
        } else {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL);

      // Cleanup function
      return () => {
        // Remove event listeners
        Object.entries(eventHandlers).forEach(([eventName, handler]) => {
          gamificationEvents.off(eventName, handler);
        });

        // Clear heartbeat interval
        clearInterval(heartbeatInterval);

        // Remove connection from store
        activeConnections.delete(connectionId);

        try {
          controller.close();
        } catch (error) {
          // Ignore errors on cleanup
        }
      };
    },

    cancel() {
      // Clean up when stream is cancelled
      activeConnections.delete(connectionId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

/**
 * HEAD handler for connection health check
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}