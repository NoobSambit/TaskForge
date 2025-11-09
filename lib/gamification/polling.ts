/**
 * Gamification polling helper
 * 
 * Provides a fallback mechanism for fetching gamification updates
 * when Server-Sent Events (SSE) are unavailable or disabled.
 * This is useful for environments that don't support SSE or when
 * users prefer reduced motion/data usage.
 */

import { XpComputation } from "./types";

/**
 * Configuration for polling behavior
 */
export interface PollingConfig {
  /** Polling interval in milliseconds (default: 30 seconds) */
  interval?: number;
  /** Maximum number of retries before stopping (default: 3) */
  maxRetries?: number;
  /** Backoff multiplier for failed requests (default: 2) */
  retryBackoff?: number;
  /** Whether to enable exponential backoff (default: true) */
  exponentialBackoff?: boolean;
}

/**
 * Gamification data snapshot from polling
 */
export interface GamificationSnapshot {
  /** Current user XP */
  xp: number;
  /** Current user level */
  level: number;
  /** Current streak */
  streak: number;
  /** Recent achievements (last 24 hours) */
  recentAchievements: Array<{
    key: string;
    title: string;
    unlockedAt: string;
  }>;
  /** Unlocked themes */
  unlockedThemes: string[];
  /** Timestamp of this snapshot */
  timestamp: string;
}

/**
 * Polling state for tracking duplicate events
 */
interface PollingState {
  lastSnapshot: GamificationSnapshot | null;
  retryCount: number;
  currentInterval: number;
  isPolling: boolean;
  timeoutId: NodeJS.Timeout | null;
}

/**
 * Default polling configuration
 */
const DEFAULT_CONFIG: Required<PollingConfig> = {
  interval: 30000, // 30 seconds
  maxRetries: 3,
  retryBackoff: 2,
  exponentialBackoff: true,
};

/**
 * Gamification polling manager
 */
export class GamificationPoller {
  private config: Required<PollingConfig>;
  private state: PollingState;
  private onEvent?: (event: string, data: any) => void;
  private onError?: (error: Error) => void;

  constructor(config: PollingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      lastSnapshot: null,
      retryCount: 0,
      currentInterval: this.config.interval,
      isPolling: false,
      timeoutId: null,
    };
  }

  /**
   * Start polling for gamification updates
   */
  start(
    onEvent: (event: string, data: any) => void,
    onError?: (error: Error) => void
  ): void {
    if (this.state.isPolling) {
      return;
    }

    this.onEvent = onEvent;
    this.onError = onError;
    this.state.isPolling = true;
    this.state.retryCount = 0;
    this.state.currentInterval = this.config.interval;

    // Initial fetch
    this.poll();

    // Start periodic polling
    this.scheduleNext();
  }

  /**
   * Stop polling
   */
  stop(): void {
    this.state.isPolling = false;
    
    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId);
      this.state.timeoutId = null;
    }

    this.onEvent = undefined;
    this.onError = undefined;
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.state.isPolling;
  }

  /**
   * Schedule the next poll
   */
  private scheduleNext(): void {
    if (!this.state.isPolling) {
      return;
    }

    this.state.timeoutId = setTimeout(() => {
      this.poll();
      this.scheduleNext();
    }, this.state.currentInterval);
  }

  /**
   * Perform a single poll
   */
  private async poll(): Promise<void> {
    if (!this.onEvent) {
      return;
    }

    try {
      const response = await fetch("/api/gamification/snapshot", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const snapshot: GamificationSnapshot = await response.json();
      this.processSnapshot(snapshot);
      
      // Reset retry count on success
      this.state.retryCount = 0;
      this.state.currentInterval = this.config.interval;

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Process a new snapshot and emit events for changes
   */
  private processSnapshot(snapshot: GamificationSnapshot): void {
    if (!this.onEvent || !this.state.lastSnapshot) {
      this.state.lastSnapshot = snapshot;
      return;
    }

    const previous = this.state.lastSnapshot;
    const events: Array<{ type: string; data: any }> = [];

    // Check for XP changes
    if (snapshot.xp !== previous.xp) {
      const xpDelta = snapshot.xp - previous.xp;
      events.push({
        type: "xpAwarded",
        data: {
          userId: "", // Will be filled by client
          taskId: "", // Will be filled by client
          xpDelta,
          totalXp: snapshot.xp,
          timestamp: snapshot.timestamp,
        },
      });
    }

    // Check for level changes
    if (snapshot.level !== previous.level) {
      events.push({
        type: "levelUp",
        data: {
          userId: "", // Will be filled by client
          oldLevel: previous.level,
          newLevel: snapshot.level,
          totalXp: snapshot.xp,
          timestamp: snapshot.timestamp,
        },
      });
    }

    // Check for streak changes
    if (snapshot.streak !== previous.streak) {
      events.push({
        type: "streakUpdate",
        data: {
          userId: "", // Will be filled by client
          oldStreak: previous.streak,
          newStreak: snapshot.streak,
          lastStreakDate: snapshot.timestamp,
          timestamp: snapshot.timestamp,
        },
      });
    }

    // Check for new achievements
    const newAchievements = snapshot.recentAchievements.filter(
      achievement => !previous.recentAchievements.some(
        prev => prev.key === achievement.key && prev.unlockedAt === achievement.unlockedAt
      )
    );

    newAchievements.forEach(achievement => {
      events.push({
        type: "achievementUnlocked",
        data: {
          userId: "", // Will be filled by client
          achievement: {
            key: achievement.key,
            title: achievement.title,
            unlockedAt: new Date(achievement.unlockedAt),
          },
          timestamp: achievement.unlockedAt,
        },
      });
    });

    // Check for new theme unlocks
    const newThemes = snapshot.unlockedThemes.filter(
      theme => !previous.unlockedThemes.includes(theme)
    );

    newThemes.forEach(themeId => {
      events.push({
        type: "themeUnlocked",
        data: {
          userId: "", // Will be filled by client
          themeId,
          themeName: themeId, // Will be enhanced by client
          unlockedAt: snapshot.timestamp,
          timestamp: snapshot.timestamp,
        },
      });
    });

    // Emit all detected events
    events.forEach(event => {
      this.onEvent!(event.type, event.data);
    });

    // Store current snapshot
    this.state.lastSnapshot = snapshot;
  }

  /**
   * Handle polling errors
   */
  private handleError(error: Error): void {
    if (!this.onError) {
      return;
    }

    this.state.retryCount++;

    // Calculate next interval with backoff
    if (this.config.exponentialBackoff) {
      this.state.currentInterval = this.config.interval * Math.pow(
        this.config.retryBackoff,
        Math.min(this.state.retryCount - 1, this.config.maxRetries - 1)
      );
    } else {
      this.state.currentInterval = this.config.interval;
    }

    // Stop polling if max retries exceeded
    if (this.state.retryCount >= this.config.maxRetries) {
      this.onError(new Error(`Polling failed after ${this.config.maxRetries} retries: ${error.message}`));
      this.stop();
    } else {
      // Emit error event but continue polling
      this.onError(error);
    }
  }
}

/**
 * Create and start a gamification poller with sensible defaults
 */
export function createGamificationPoller(
  config?: PollingConfig
): GamificationPoller {
  return new GamificationPoller(config);
}

/**
 * Utility to check if polling should be used instead of SSE
 */
export function shouldUsePolling(): boolean {
  // Check for EventSource support
  if (typeof EventSource === "undefined") {
    return true;
  }

  // Check for reduced motion preference
  if (typeof window !== "undefined" && window.matchMedia) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion.matches) {
      return true;
    }
  }

  // Check for connection type (slow connections)
  if (typeof navigator !== "undefined" && "connection" in navigator) {
    const connection = (navigator as any).connection;
    if (connection && (
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g" ||
      connection.saveData === true
    )) {
      return true;
    }
  }

  return false;
}