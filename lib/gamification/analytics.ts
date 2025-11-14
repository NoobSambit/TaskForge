/**
 * Gamification Analytics Service
 * 
 * Thin instrumentation layer that logs gamification events to a configurable sink
 * while respecting user privacy preferences (anonymous mode).
 */

import { EventEmitter } from "events";
import { gamificationEvents, type LevelUpEvent, type AchievementUnlockedEvent } from "./events";

/**
 * Analytics event types that should be tracked
 */
export interface AnalyticsEvent {
  /** Unique event identifier */
  eventName: string;
  /** User ID (scrubbed in anonymous mode) */
  userId?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, any>;
  /** Whether user was in anonymous mode when event occurred */
  isAnonymous: boolean;
}

/**
 * Analytics sink interface for different output destinations
 */
export interface AnalyticsSink {
  /** Write event to the sink */
  write(event: AnalyticsEvent): Promise<void>;
  /** Flush any buffered events */
  flush?(): Promise<void>;
  /** Close the sink and cleanup resources */
  close?(): Promise<void>;
}

/**
 * Console analytics sink - outputs to console with structured logging
 */
export class ConsoleAnalyticsSink implements AnalyticsSink {
  constructor(private prefix: string = "GAMIFICATION_ANALYTICS") {}

  async write(event: AnalyticsEvent): Promise<void> {
    const logData = {
      [this.prefix]: {
        event: event.eventName,
        userId: event.isAnonymous ? 'anonymous' : event.userId,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
      }
    };
    
    console.log(JSON.stringify(logData));
  }

  async flush(): Promise<void> {
    // No buffering in console sink
  }

  async close(): Promise<void> {
    // No cleanup needed for console sink
  }
}

/**
 * Memory analytics sink - stores events in memory for testing
 */
export class MemoryAnalyticsSink implements AnalyticsSink {
  private events: AnalyticsEvent[] = [];

  async write(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async flush(): Promise<void> {
    // No buffering in memory sink
  }

  async close(): Promise<void> {
    this.events = [];
  }

  /** Get all stored events (for testing) */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /** Clear all stored events */
  clear(): void {
    this.events = [];
  }

  /** Get events by event name */
  getEventsByName(eventName: string): AnalyticsEvent[] {
    return this.events.filter(event => event.eventName === eventName);
  }
}

/**
 * File analytics sink - writes events to a file (for production use)
 */
export class FileAnalyticsSink implements AnalyticsSink {
  private buffer: AnalyticsEvent[] = [];
  private bufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;

  constructor(
    private filePath: string,
    options: { bufferSize?: number; flushInterval?: number } = {}
  ) {
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 30000;
    this.startPeriodicFlush();
  }

  async write(event: AnalyticsEvent): Promise<void> {
    this.buffer.push(event);
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const fs = await import('node:fs/promises');
    const logLine = JSON.stringify(this.buffer.map(e => ({
      event: e.eventName,
      userId: e.isAnonymous ? 'anonymous' : e.userId,
      timestamp: e.timestamp.toISOString(),
      data: e.data,
    }))) + '\n';

    try {
      await fs.appendFile(this.filePath, logLine);
    } catch (error) {
      console.error('Failed to write analytics to file:', error);
    } finally {
      this.buffer = [];
    }
  }

  async close(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    await this.flush();
  }

  private startPeriodicFlush(): void {
    this.intervalId = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }
}

/**
 * Analytics service configuration
 */
export interface AnalyticsConfig {
  /** Whether analytics is enabled */
  enabled: boolean;
  /** Analytics sink to use */
  sink: AnalyticsSink;
  /** Whether to automatically track known events */
  autoTrack: boolean;
  /** Additional events to track */
  customEvents?: string[];
}

/**
 * Default analytics configuration
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  sink: new ConsoleAnalyticsSink(),
  autoTrack: true,
};

/**
 * Gamification Analytics Service
 * 
 * Provides centralized analytics tracking for gamification events
 * with privacy controls and configurable sinks.
 */
export class GamificationAnalytics {
  private config: AnalyticsConfig;
  private isSetup = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Setup analytics service and start tracking events
   */
  async setup(): Promise<void> {
    if (this.isSetup) return;

    if (this.config.enabled && this.config.autoTrack) {
      this.setupEventTracking();
    }

    this.isSetup = true;
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    eventName: string,
    data: Record<string, any>,
    userId?: string,
    isAnonymous: boolean = false
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Check user's anonymous mode if userId is provided and not explicitly set
    if (userId && !isAnonymous) {
      isAnonymous = await this.isUserAnonymous(userId);
    }

    const event: AnalyticsEvent = {
      eventName,
      userId: isAnonymous ? undefined : userId,
      timestamp: new Date(),
      data,
      isAnonymous,
    };

    await this.config.sink.write(event);
  }

  /**
   * Track level up event
   */
  async trackLevelUp(eventData: LevelUpEvent, isAnonymous: boolean = false): Promise<void> {
    // Check anonymous mode if not explicitly provided
    if (!isAnonymous) {
      isAnonymous = await this.isUserAnonymous(eventData.userId);
    }
    await this.trackEvent('level_up', {
      oldLevel: eventData.oldLevel,
      newLevel: eventData.newLevel,
      totalXp: eventData.totalXp,
    }, eventData.userId, isAnonymous);
  }

  /**
   * Track achievement unlocked event
   */
  async trackAchievementUnlocked(
    eventData: AchievementUnlockedEvent,
    isAnonymous: boolean = false
  ): Promise<void> {
    // Check anonymous mode if not explicitly provided
    if (!isAnonymous) {
      isAnonymous = await this.isUserAnonymous(eventData.userId);
    }
    await this.trackEvent('achievement_unlocked', {
      achievementKey: eventData.achievement.achievement.key,
      achievementName: eventData.achievement.achievement.name,
      xpReward: eventData.achievement.xpReward,
    }, eventData.userId, isAnonymous);
  }

  /**
   * Setup automatic tracking for gamification events
   */
  private setupEventTracking(): void {
    // Track level up events
    gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_UP, async (event: LevelUpEvent) => {
      const isAnonymous = await this.isUserAnonymous(event.userId);
      await this.trackLevelUp(event, isAnonymous);
    });

    // Track achievement unlocked events
    gamificationEvents.on(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, async (event: AchievementUnlockedEvent) => {
      const isAnonymous = await this.isUserAnonymous(event.userId);
      await this.trackAchievementUnlocked(event, isAnonymous);
    });
  }

  /**
   * Check if user is in anonymous mode
   * This would typically fetch from user preferences
   */
  private async isUserAnonymous(userId: string): Promise<boolean> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getUserById } = await import("@/models/User");
      const user = await getUserById(userId);
      return user?.preferences?.anonymousMode ?? false;
    } catch (error) {
      // If we can't fetch user preferences, assume not anonymous for safety
      console.warn('Failed to fetch user preferences for analytics:', error);
      return false;
    }
  }

  /**
   * Flush any buffered events
   */
  async flush(): Promise<void> {
    if (this.config.sink.flush) {
      await this.config.sink.flush();
    }
  }

  /**
   * Close analytics service and cleanup resources
   */
  async close(): Promise<void> {
    if (this.config.sink.close) {
      await this.config.sink.close();
    }
  }

  /**
   * Update analytics configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }
}

// Import the events constant
import { GAMIFICATION_EVENTS } from "./events";

/**
 * Default analytics instance
 */
export const gamificationAnalytics = new GamificationAnalytics();

/**
 * Setup analytics with custom configuration
 */
export async function setupAnalytics(config: Partial<AnalyticsConfig> = {}): Promise<GamificationAnalytics> {
  const analytics = new GamificationAnalytics(config);
  await analytics.setup();
  return analytics;
}

/**
 * Convenience function to track events using default instance
 */
export async function trackAnalyticsEvent(
  eventName: string,
  data: Record<string, any>,
  userId?: string,
  isAnonymous?: boolean
): Promise<void> {
  await gamificationAnalytics.trackEvent(eventName, data, userId, isAnonymous);
}