# Real-time Gamification Events

This document describes the real-time gamification system implementation that provides live updates for XP, levels, achievements, streaks, and themes.

## Overview

The real-time gamification system consists of:

1. **Event Bus** (`lib/gamification/events.ts`) - Central event emitter for all gamification events
2. **SSE Endpoint** (`app/api/gamification/events/route.ts`) - Server-Sent Events for real-time streaming
3. **Polling Fallback** (`lib/gamification/polling.ts`) - Alternative when SSE is unavailable
4. **Client Hook** (`hooks/useGamificationStream.ts`) - React hook for consuming events
5. **Supporting Services** - Streak tracking, theme unlocking, etc.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Task/API     │───▶│  Event Bus      │───▶│   SSE Stream   │
│   Completion    │    │ (EventEmitter)  │    │  /api/events   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Client Hook   │    │  Polling API   │
                       │ useGamification│    │  /api/snapshot │
                       │     Stream      │    └─────────────────┘
                       └──────────────────┘              │
                                │                      │
                                ▼                      ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   UI Updates   │    │  Fallback      │
                       │   (React)      │    │  Mechanism     │
                       └──────────────────┘    └─────────────────┘
```

## Event Types

### XP Awarded
```typescript
interface XpAwardedEvent {
  userId: string;
  taskId: string;
  xpDelta: number;
  totalXp: number;
  computation: XpComputation;
  timestamp: Date;
}
```

### Level Up
```typescript
interface LevelUpEvent {
  userId: string;
  oldLevel: number;
  newLevel: number;
  totalXp: number;
  timestamp: Date;
}
```

### Achievement Unlocked
```typescript
interface AchievementUnlockedEvent {
  userId: string;
  achievement: AchievementUnlockResult;
  timestamp: Date;
}
```

### Streak Update
```typescript
interface StreakUpdateEvent {
  userId: string;
  oldStreak: number;
  newStreak: number;
  lastStreakDate: Date;
  timestamp: Date;
}
```

### Theme Unlocked
```typescript
interface ThemeUnlockedEvent {
  userId: string;
  themeId: string;
  themeName: string;
  unlockedAt: Date;
  timestamp: Date;
}
```

## Usage Examples

### Server-Sent Events (Primary)

```tsx
import { useGamificationStream } from "@/hooks/useGamificationStream";

function GamificationDashboard() {
  const { isConnected, lastEvent, events, reconnect } = useGamificationStream({
    onEvent: (type, data) => {
      console.log(`Event: ${type}`, data);
      
      // Handle different event types
      switch (type) {
        case "xpAwarded":
          showNotification(`+${data.xpDelta} XP earned!`);
          break;
        case "levelUp":
          showNotification(`Level ${data.newLevel} reached! 🎉`);
          break;
        case "achievementUnlocked":
          showNotification(`Achievement: ${data.achievement.title} 🏆`);
          break;
        case "streakUpdate":
          if (data.newStreak > data.oldStreak) {
            showNotification(`${data.newStreak} day streak! 🔥`);
          }
          break;
        case "themeUnlocked":
          showNotification(`New theme: ${data.themeName} 🎨`);
          break;
      }
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
    onConnectionChange: (isConnected, isPolling) => {
      console.log(`Connection: ${isConnected ? "SSE" : isPolling ? "Polling" : "Offline"}`);
    },
  });

  return (
    <div>
      <div>Connection: {isConnected ? "Connected" : "Disconnected"}</div>
      <div>Last Event: {JSON.stringify(lastEvent)}</div>
      <div>Event Count: {events.length}</div>
      <button onClick={reconnect}>Reconnect</button>
    </div>
  );
}
```

### Polling Fallback (Automatic)

The system automatically falls back to polling when:
- EventSource is not available
- User prefers reduced motion
- Network connection is slow or data saver is enabled

```typescript
import { createGamificationPoller, shouldUsePolling } from "@/lib/gamification/polling";

// Check if polling should be used
if (shouldUsePolling()) {
  const poller = createGamificationPoller({
    interval: 30000, // 30 seconds
    maxRetries: 3,
    exponentialBackoff: true,
  });
  
  poller.start(
    (type, data) => console.log("Polling event:", type, data),
    (error) => console.error("Polling error:", error)
  );
}
```

### Manual Event Emission

```typescript
import { gamificationEvents } from "@/lib/gamification/events";

// Emit custom XP award
gamificationEvents.emitXpAwarded({
  userId: "user123",
  taskId: "task456",
  xpDelta: 25,
  totalXp: 150,
  computation: { delta: 25, appliedRules: [] },
  timestamp: new Date(),
});

// Emit custom achievement unlock
gamificationEvents.emitAchievementUnlocked({
  userId: "user123",
  achievement: {
    achievement: { key: "custom", title: "Custom Achievement", ... },
    unlockedAt: new Date(),
    xpRewardApplied: true,
    xpRewardAmount: 50,
  },
  timestamp: new Date(),
});
```

## API Endpoints

### GET /api/gamification/events

Server-Sent Events endpoint for real-time updates.

**Authentication**: Required (NextAuth session)
**Response**: `text/event-stream` with JSON events

**Event Format**:
```
data: {"type":"xpAwarded","data":{"userId":"user123","xpDelta":25,"totalXp":150,"timestamp":"2024-01-15T10:30:00.000Z"}}

data: {"type":"levelUp","data":{"userId":"user123","oldLevel":3,"newLevel":4,"totalXp":450,"timestamp":"2024-01-15T10:30:00.000Z"}}
```

**Headers**:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

### GET /api/gamification/snapshot

Provides current gamification state snapshot for polling.

**Authentication**: Required (NextAuth session)
**Response**: JSON with current state

**Response Format**:
```json
{
  "xp": 150,
  "level": 4,
  "streak": 5,
  "recentAchievements": [
    {
      "key": "first_task",
      "title": "First Task",
      "unlockedAt": "2024-01-14T10:00:00.000Z"
    }
  ],
  "unlockedThemes": ["default", "dark", "neon"],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Configuration

### Polling Configuration

```typescript
interface PollingConfig {
  interval?: number;        // Polling interval in ms (default: 30000)
  maxRetries?: number;     // Max retry attempts (default: 3)
  retryBackoff?: number;   // Backoff multiplier (default: 2)
  exponentialBackoff?: boolean; // Enable exponential backoff (default: true)
}
```

### Hook Options

```typescript
interface UseGamificationStreamOptions {
  onEvent?: (type: string, data: any) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (isConnected: boolean, isPolling: boolean) => void;
  pollingConfig?: PollingConfig;
  autoReconnect?: boolean;     // Auto-reconnect on disconnect (default: true)
  reconnectDelay?: number;     // Reconnect delay in ms (default: 5000)
}
```

## Integration Points

### Task Completion Flow

1. Task marked as complete
2. XP calculated and awarded (`awardXpForTaskCompletion`)
3. Streak updated (`updateUserStreakWithEvents`)
4. Level changes applied (`applyLevelChanges`)
5. Achievements evaluated (`evaluateAchievements`)
6. Themes unlocked (`unlockThemesForLevelUp`)
7. Events emitted for all changes
8. Real-time updates sent to clients

### Event Emission Order

For task completion, events are emitted in this order:
1. `streakUpdate` - If streak changes
2. `xpAwarded` - XP awarded
3. `levelUp` - For each level crossed
4. `achievementUnlocked` - For each new achievement
5. `themeUnlocked` - For each new theme

## Performance Considerations

### SSE Connection Management
- Automatic cleanup on disconnect
- Heartbeat keep-alives every 30 seconds
- Connection timeout after 2 minutes
- Stale connection cleanup every 5 minutes

### Polling Optimization
- Configurable intervals (default: 30 seconds)
- Exponential backoff on errors
- Maximum retry limits
- Event deduplication

### Memory Management
- Event history limited to last 50 events
- Automatic listener cleanup
- Connection store cleanup

## Browser Support

### Server-Sent Events
- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge 79+
- Opera 11+

### Fallback Support
- Automatic polling for unsupported browsers
- Reduced motion preference detection
- Network-aware behavior
- Data saver mode support

## Testing

### Unit Tests
- Event bus behavior (`lib/__tests__/gamification/events.test.ts`)
- Polling logic (`lib/__tests__/gamification/polling.test.ts`)
- Hook functionality (`hooks/__tests__/useGamificationStream.test.ts`)
- SSE endpoint (`app/api/gamification/events/__tests__/route.test.ts`)

### Running Tests
```bash
npm test lib/__tests__/gamification/events.test.ts
npm test lib/__tests__/gamification/polling.test.ts
npm test hooks/__tests__/useGamificationStream.test.ts
npm test app/api/gamification/events/__tests__/route.test.ts
```

## Debugging

### Event Monitoring

Enable debug logging:
```typescript
import { gamificationEvents } from "@/lib/gamification/events";

// Monitor all events
gamificationEvents.onAny((event, ...args) => {
  console.log(`Event: ${event}`, args);
});
```

### Connection Status

Monitor connection health:
```typescript
const { isConnected, isPolling, error } = useGamificationStream({
  onConnectionChange: (connected, polling) => {
    console.log(`Status: ${connected ? "SSE" : polling ? "Polling" : "Offline"}`);
  },
  onError: (error) => {
    console.error("Connection error:", error);
  },
});
```

## Security Considerations

- Authentication required for all endpoints
- User-isolation (events only sent to owning user)
- No sensitive data in event payloads
- Rate limiting considerations for polling
- CORS headers for cross-origin requests

## Future Enhancements

1. **Event Replay** - Buffer events for reconnection
2. **Selective Subscriptions** - Subscribe to specific event types
3. **Batch Events** - Group multiple events together
4. **WebSocket Support** - Alternative transport for better performance
5. **Event Analytics** - Track event patterns and usage
6. **Offline Queue** - Queue events for when client reconnects