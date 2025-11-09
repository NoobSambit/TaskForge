/**
 * Gamification Event Emitter
 * 
 * Provides a centralized event bus for gamification-related events.
 * This allows decoupling of XP awarding logic from downstream consumers
 * (SSE endpoints, webhooks, notifications, etc).
 */

import { EventEmitter } from "events";
import type { XpComputation, AchievementUnlockResult } from "./types";

/**
 * Streak update event payload
 */
export interface StreakUpdateEvent {
  userId: string;
  oldStreak: number;
  newStreak: number;
  lastStreakDate: Date;
  timestamp: Date;
}

/**
 * Theme unlocked event payload
 */
export interface ThemeUnlockedEvent {
  userId: string;
  themeId: string;
  themeName: string;
  unlockedAt: Date;
  timestamp: Date;
}

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

export interface AchievementUnlockedEvent {
  userId: string;
  achievement: AchievementUnlockResult;
  timestamp: Date;
}

/**
 * Event type names
 */
export const GAMIFICATION_EVENTS = {
  XP_AWARDED: "xpAwarded",
  LEVEL_UP: "levelUp",
  LEVEL_CHECK_PENDING: "levelCheckPending",
  ACHIEVEMENT_UNLOCKED: "achievementUnlocked",
  STREAK_UPDATE: "streakUpdate",
  THEME_UNLOCKED: "themeUnlocked",
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

  emitAchievementUnlocked(event: AchievementUnlockedEvent): void {
    this.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, event);
  }

  emitStreakUpdate(event: StreakUpdateEvent): void {
    this.emit(GAMIFICATION_EVENTS.STREAK_UPDATE, event);
  }

  emitThemeUnlocked(event: ThemeUnlockedEvent): void {
    this.emit(GAMIFICATION_EVENTS.THEME_UNLOCKED, event);
  }
}

// Export singleton instance
export const gamificationEvents = new GamificationEventEmitter();
