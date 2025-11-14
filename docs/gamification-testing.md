# Gamification Testing & Analytics Documentation

This document describes how to run tests for the gamification system and how analytics respects privacy settings.

## Running Tests Locally

### Prerequisites

Ensure you have all dependencies installed:
```bash
npm install
```

### Running All Tests

```bash
npm test
```

### Running Specific Test Suites

```bash
# Run only gamification tests
npm test lib/__tests__/gamification

# Run specific test file
npm test lib/__tests__/gamification/analytics.test.ts

# Run with coverage
npm test -- --coverage
```

### Test Coverage Thresholds

The project has configured coverage thresholds in `vitest.config.ts`:

- **Global**: 70% statements, branches, functions, lines
- **Gamification modules**: 80% statements, branches, functions, lines  
- **API handlers**: 70% statements, branches, functions, lines

Coverage reports are generated in:
- Text output in terminal
- HTML report: `coverage/index.html`
- JSON report: `coverage/coverage-final.json`

## Test Structure

### Unit Tests

Located in `lib/__tests__/gamification/`:

- `analytics.test.ts` - Analytics service and sinks
- `awardXp.test.ts` - XP awarding service
- `levels.test.ts` - Level calculation and progression
- `achievementsEngine.test.ts` - Achievement evaluation
- `streaks.test.ts` - Streak tracking
- `themes.test.ts` - Theme system
- `themeUnlock.test.ts` - Theme unlocking logic
- `xpEngine.test.ts` - XP calculation engine
- `events.test.ts` - Event emission
- `polling.test.ts` - Real-time polling

### Integration Tests

- `achievements.integration.test.ts` - End-to-end achievement flows
- API tests in `app/api/gamification/**/__tests__/` - All API endpoints

## Analytics System

### Overview

The analytics system (`lib/gamification/analytics.ts`) provides a thin instrumentation layer that:

1. **Tracks gamification events** (level-ups, achievements, XP awards, streaks)
2. **Respects user privacy** through `preferences.anonymousMode`
3. **Supports multiple sinks** (console, memory, file)
4. **Auto-tracks events** when configured
5. **Handles errors gracefully** without affecting core functionality

### Analytics Sinks

#### Console Analytics Sink
Outputs structured logs to console:
```javascript
import { ConsoleAnalyticsSink } from '@/lib/gamification/analytics';

const sink = new ConsoleAnalyticsSink('MY_APP');
```

#### Memory Analytics Sink
Stores events in memory for testing:
```javascript
import { MemoryAnalyticsSink } from '@/lib/gamification/analytics';

const sink = new MemoryAnalyticsSink();
const events = sink.getEvents();
```

#### File Analytics Sink
Buffers and writes events to files:
```javascript
import { FileAnalyticsSink } from '@/lib/gamification/analytics';

const sink = new FileAnalyticsSink('/path/to/analytics.log', {
  bufferSize: 100,
  flushInterval: 30000
});
```

### Privacy Controls

The analytics system respects user privacy through:

1. **Anonymous Mode Check**: Automatically checks `user.preferences.anonymousMode`
2. **PII Scrubbing**: Removes `userId` when anonymous mode is enabled
3. **Data Preservation**: Keeps non-PII event data for analytics
4. **Fallback Behavior**: Defaults to non-anonymous if preferences unavailable

#### Privacy Implementation

```javascript
// When user has anonymousMode: true
{
  eventName: "level_up",
  userId: undefined,        // Scrubbed
  timestamp: "2024-01-15T...",
  data: { /* preserved */ },
  isAnonymous: true
}

// When user has anonymousMode: false  
{
  eventName: "level_up",
  userId: "user_123",      // Preserved
  timestamp: "2024-01-15T...",
  data: { /* preserved */ },
  isAnonymous: false
}
```

### Tracked Events

#### Level Up Events
```javascript
{
  eventName: "level_up",
  data: {
    oldLevel: 5,
    newLevel: 6,
    totalXp: 1200,
    unlockedThemes: ["ocean"],
    gainedXp: 200
  }
}
```

#### Achievement Unlocked Events
```javascript
{
  eventName: "achievement_unlocked", 
  data: {
    achievementKey: "first_task",
    achievementName: "First Task",
    xpReward: 50,
    triggeredBy: "task_completed"
  }
}
```

#### XP Award Events
```javascript
{
  eventName: "xp_awarded",
  data: {
    xpDelta: 25,
    totalXp: 525,
    taskDifficulty: "medium",
    taskPriority: 3,
    appliedRules: ["base", "priority", "streak"],
    activityType: "task_completion"
  }
}
```

#### Streak Update Events
```javascript
{
  eventName: "streak_update",
  data: {
    oldStreak: 2,
    newStreak: 3,
    streakExtended: true,
    streakReset: false,
    taskCount: 1
  }
}
```

### Integration Points

Analytics are automatically integrated into:

1. **XP Awarding** (`lib/gamification/awardXp.ts`)
2. **Level System** (`lib/gamification/levels.ts`) 
3. **Achievement Engine** (`lib/gamification/achievementsEngine.ts`)
4. **Streak Service** (`lib/gamification/streaks.ts`)

### Event Flow

```
User Action → Service Logic → Event Emission → Analytics Tracking → Sink Output
     ↓              ↓                ↓                ↓              ↓
Task Complete → calculateXP() → levelUp Event → trackLevelUp() → Console/File/Memory
```

### Error Handling

Analytics failures never block core gamification functionality:

```javascript
try {
  await gamificationAnalytics.trackEvent("xp_awarded", data, userId);
} catch (analyticsError) {
  console.error("❌ Error tracking analytics:", analyticsError);
  // Continue with normal flow
}
```

## Testing Best Practices

### Mock Strategy

Use dependency injection and mocking for deterministic tests:

```javascript
// Mock external dependencies
vi.mock("@/models/User", () => ({
  getUserById: vi.fn(),
}));

// Use memory sink for testing
const memorySink = new MemoryAnalyticsSink();
const analytics = new GamificationAnalytics({
  sink: memorySink,
  enabled: true
});
```

### Test Organization

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test service interactions  
3. **Privacy Tests**: Verify anonymous mode behavior
4. **Error Tests**: Ensure graceful failure handling
5. **Performance Tests**: Validate with large datasets

### Deterministic Testing

Use fixed dates and consistent data:

```javascript
const FIXED_DATE = new Date("2024-01-15T00:00:00Z");

const testContext = {
  userId: "test_user",
  now: FIXED_DATE,  // For time-based calculations
  // ... other test data
};
```

### CI/CD Integration

Tests run automatically in CI with:

```yaml
- name: Run Tests
  run: npm test
- name: Check Coverage  
  run: npm test -- --coverage --reporter=json
```

## Troubleshooting

### Common Issues

#### 1. Test Timeouts
Increase wait time for async operations:
```javascript
await new Promise(resolve => setTimeout(resolve, 100));
```

#### 2. Mock Conflicts  
Clear mocks between tests:
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
```

#### 3. Coverage Failures
Check thresholds in `vitest.config.ts` and ensure all paths are tested.

#### 4. Analytics Not Working
Verify:
- Analytics service is set up: `await analytics.setup()`
- Auto-tracking is enabled: `autoTrack: true`
- Sink is properly configured

### Debug Mode

Enable verbose logging:
```javascript
const analytics = new GamificationAnalytics({
  enabled: true,
  sink: new ConsoleAnalyticsSink('DEBUG'),
  autoTrack: true
});
```

## Performance Considerations

### Analytics Overhead

- **Event Tracking**: <1ms per event
- **Sink Operations**: Async, non-blocking
- **Memory Usage**: Minimal with periodic flushing
- **Database Impact**: None (analytics are write-only)

### Scaling

- **High Volume**: Use file sink with buffering
- **Real-time**: Use memory sink for development  
- **Production**: Use custom sink with external service

## Security

### Data Protection

1. **PII Scrubbing**: Automatic in anonymous mode
2. **Data Minimization**: Only track essential events
3. **Consent**: Respects user preferences
4. **Retention**: Configurable per sink type

### Access Control

Analytics events contain:
- **No sensitive user data** beyond IDs
- **No authentication tokens** or sessions
- **No private content** from tasks or achievements

## Future Enhancements

### Planned Features

1. **Custom Sink Interface**: For external analytics services
2. **Event Filtering**: Subscribe to specific event types
3. **Batch Processing**: Reduce I/O for high-volume systems
4. **Real-time Dashboard**: Live analytics monitoring
5. **Export/Import**: For analytics data portability

### Extending Analytics

Add custom event tracking:

```javascript
// Custom event tracking
await gamificationAnalytics.trackEvent("custom_action", {
  action: "button_click",
  component: "theme_selector",
  value: selectedTheme
}, userId);

// Custom sink implementation
class CustomAnalyticsSink implements AnalyticsSink {
  async write(event: AnalyticsEvent): Promise<void> {
    // Send to external service
    await externalService.track(event);
  }
}
```

This documentation should help developers understand, test, and extend the gamification analytics system while maintaining user privacy and system performance.