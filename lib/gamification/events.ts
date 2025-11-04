/**
 * Gamification Event Emitter
 * 
 * Provides a centralized event bus for gamification-related events.
 * This allows decoupling of XP awarding logic from downstream consumers
 * (SSE endpoints, webhooks, notifications, etc).
 */

import { EventEmitter } from "events";
import type { XpComputation } from "./types";

/**
 * Event payloads for gamification events
 */
export interface XpAwardedEvent {
  userId: string;
  taskId: string;
  xpDelta: number;
  totalXp: number;
  computation: XpComputation;
  timestamp: Date;
}

export interface LevelUpEvent {
  userId: string;
  oldLevel: number;
  newLevel: number;
  totalXp: number;
  timestamp: Date;
}

export interface LevelCheckPendingEvent {
  userId: string;
  currentXp: number;
  currentLevel: number;
  timestamp: Date;
}

/**
 * Event type names
 */
export const GAMIFICATION_EVENTS = {
  XP_AWARDED: "xpAwarded",
  LEVEL_UP: "levelUp",
  LEVEL_CHECK_PENDING: "levelCheckPending",
} as const;

/**
 * Singleton event emitter for gamification events
 */
class GamificationEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to avoid warnings in tests/high-traffic scenarios
    this.setMaxListeners(100);
  }

  emitXpAwarded(event: XpAwardedEvent): void {
    this.emit(GAMIFICATION_EVENTS.XP_AWARDED, event);
  }

  emitLevelUp(event: LevelUpEvent): void {
    this.emit(GAMIFICATION_EVENTS.LEVEL_UP, event);
  }

  emitLevelCheckPending(event: LevelCheckPendingEvent): void {
    this.emit(GAMIFICATION_EVENTS.LEVEL_CHECK_PENDING, event);
  }
}

// Export singleton instance
export const gamificationEvents = new GamificationEventEmitter();
