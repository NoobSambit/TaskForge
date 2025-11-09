# Streak Tracking System

The streak tracking system rewards users for completing tasks on consecutive days, with proper timezone handling and DST support.

## Overview

Streaks encourage daily engagement by tracking consecutive days of task completions. The system:
- Respects user timezone preferences (from `user.preferences.timezone`)
- Handles DST (Daylight Saving Time) transitions correctly
- Supports multiple completions per day
- Integrates with the XP engine for streak multipliers
- Provides backfill capabilities for historical data

## Core Concepts

### Streak Data

Each user has the following streak-related fields:

```typescript
{
  currentStreak: number;      // Current consecutive days (0 if broken)
  longestStreak: number;      // All-time longest streak
  lastStreakDate: Date;       // Last date counted toward streak (midnight UTC)
}
```

### StreakLog Entries

Each day of activity is logged with:

```typescript
{
  userId: string;
  date: Date;                 // Midnight UTC of the day in user's timezone
  taskCount: number;          // Number of tasks completed that day
  streakLength: number;       // Streak length on that day
}
```

## Timezone Handling

The system converts all dates to the user's timezone for streak calculations:

1. **User completes task** at `2024-01-16T04:30:00Z` (UTC)
2. **User's timezone** is `America/New_York` (UTC-5 in winter)
3. **Converted to user's timezone**: `2024-01-15T23:30:00-05:00` (11:30 PM EST)
4. **Date extracted**: `2024-01-15` (still Jan 15 in user's timezone)
5. **Stored as**: `2024-01-15T00:00:00Z` (midnight UTC representing the date)

### DST Transitions

The system handles DST transitions automatically:

- **Spring Forward**: When clocks move forward (e.g., 2 AM → 3 AM), dates are still calculated correctly
- **Fall Back**: When clocks move back (e.g., 2 AM → 1 AM), dates are still calculated correctly
- Uses `Intl.DateTimeFormat` for accurate timezone conversions

## API Reference

### `applyCompletionToStreak(user, completedAt)`

Updates a user's streak when they complete a task.

**Parameters:**
- `user`: User document (must have `save()` method)
- `completedAt`: Date when the task was completed

**Returns:** `Promise<StreakUpdateResult>`

```typescript
{
  updated: boolean;           // Whether the streak was updated
  currentStreak: number;      // New current streak
  longestStreak: number;      // New longest streak
  lastStreakDate: Date;       // New last streak date
  isNewDay: boolean;          // Whether this is a new day
  taskCount: number;          // Total tasks completed on this day
  reason?: string;            // Error message if not updated
}
```

**Behavior:**
- **Same day**: Increments `taskCount`, doesn't change streak
- **Next consecutive day**: Increments `currentStreak` and `longestStreak` (if applicable)
- **Gap > 1 day**: Resets `currentStreak` to 1, preserves `longestStreak`
- **Past date**: Returns error (for backfilling, use `recomputeStreaksFromHistory`)

**Example:**

```typescript
import { applyCompletionToStreak } from "@/lib/gamification/streaks";

const user = await User.findById(userId);
const result = await applyCompletionToStreak(user, new Date());

if (result.updated) {
  await user.save();
  console.log(`Current streak: ${result.currentStreak} days`);
}
```

### `recomputeStreaksFromHistory(userId)`

Recomputes a user's streaks from their complete activity history.

**Parameters:**
- `userId`: User ID to recompute streaks for

**Returns:** `Promise<RecomputeStreaksResult>`

```typescript
{
  success: boolean;
  currentStreak: number;      // Recomputed current streak
  longestStreak: number;      // Recomputed longest streak
  totalDaysActive: number;    // Total unique days with completions
  totalCompletions: number;   // Total task completions
  streakLogsCreated: number;  // Number of StreakLog entries created
  reason?: string;            // Error message if failed
}
```

**Behavior:**
- Queries all `ActivityLog` entries with `activityType: "task_completion"`
- Groups completions by date in user's timezone
- Rebuilds streak history chronologically
- Creates/updates `StreakLog` entries
- Updates user's `currentStreak`, `longestStreak`, `lastStreakDate`
- Current streak is only preserved if last activity was today or yesterday

**Example:**

```typescript
import { recomputeStreaksFromHistory } from "@/lib/gamification/streaks";

const result = await recomputeStreaksFromHistory(userId);

console.log(`Recomputed streaks:`);
console.log(`  Current: ${result.currentStreak} days`);
console.log(`  Longest: ${result.longestStreak} days`);
console.log(`  Total active days: ${result.totalDaysActive}`);
```

## Integration with XP Engine

Streaks automatically provide multipliers for XP calculation:

```typescript
// From lib/gamification/config.ts
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 1.5;   // 30+ days: 1.5x
  if (streakDays >= 14) return 1.3;   // 14-29 days: 1.3x
  if (streakDays >= 7) return 1.2;    // 7-13 days: 1.2x
  if (streakDays >= 3) return 1.1;    // 3-6 days: 1.1x
  return 1.0;                          // 0-2 days: no bonus
}
```

The `awardXpForTaskCompletion` function automatically:
1. Updates the user's streak via `applyCompletionToStreak`
2. Passes the updated `currentStreak` to the XP engine
3. Applies the appropriate streak multiplier to XP calculation

No additional integration needed - streaks work automatically when awarding XP!

## Backfill Script

The backfill script recomputes streaks for all users from historical data.

### Usage

```bash
# Run for all users
npm run backfill:streaks

# Dry run (preview changes)
npm run backfill:streaks:dry-run

# Custom batch size
npm run backfill:streaks -- --batch-size=50

# Process specific user
npm run backfill:streaks -- --user-id=<userId>
```

### Features

- **Batch processing**: Processes users in configurable batches (default: 100)
- **Progress tracking**: Shows real-time progress and statistics
- **Error handling**: Continues on error, reports failures at end
- **Dry run mode**: Preview changes without writing to database
- **Idempotent**: Safe to run multiple times (upserts StreakLog entries)
- **Performance**: Reports users/sec processing rate

### Example Output

```
🔄 Starting streak backfill...
Mode: LIVE
Batch size: 100

✅ Connected to MongoDB
📊 Found 1,234 user(s) to process

📦 Processing batch 1 (users 1-100 of 1,234)
   ✓ User 5f8d0d55b54764421b7156c4: current=7, longest=14, days=45, completions=89, logs=45
   ✓ User 5f8d0d55b54764421b7156c5: current=0, longest=5, days=12, completions=23, logs=12
   ...
   Progress: 100/1,234 (8.1%)

============================================================
📋 Backfill Summary
============================================================
Mode: LIVE
Total users: 1,234
Processed: 1,234
Successful: 1,230
Errors: 4

Aggregate Stats:
  Total days active: 15,678
  Total completions: 34,567
  Total streak logs created: 15,678
  Average days per user: 12.7
  Average completions per user: 28.1

Duration: 23.45s
Rate: 52.6 users/sec
============================================================

✅ Backfill completed successfully!
```

## Testing

The streak system includes comprehensive tests in `lib/__tests__/gamification/streaks.test.ts`:

### Timezone Tests
- UTC date conversions
- US/Eastern timezone offsets
- Asia/Tokyo timezone offsets
- DST spring forward transitions
- DST fall back transitions
- Midnight boundary handling
- Invalid timezone fallback

### Streak Logic Tests
- First completion initialization
- Consecutive day streak building
- Same day multiple completions
- Streak breaking with gaps
- Longest streak tracking
- Timezone crossing midnight boundaries
- Past completion handling (backfilling)

### History Recomputation Tests
- Empty history handling
- Single completion
- Consecutive streak building
- Broken streak handling
- Multiple completions per day grouping
- User not found error handling

Run tests with:

```bash
npm test -- streaks.test.ts
```

## Common Patterns

### Update Streak on Task Completion

```typescript
import { applyCompletionToStreak } from "@/lib/gamification/streaks";

// In your task completion handler
const user = await User.findById(userId);
const task = await Task.findById(taskId);

if (task.status === "done") {
  await applyCompletionToStreak(user, task.completedAt);
  await user.save();
}
```

### Check User's Streak

```typescript
const user = await User.findById(userId);

console.log(`Current streak: ${user.currentStreak} days`);
console.log(`Longest streak: ${user.longestStreak} days`);
console.log(`Last active: ${user.lastStreakDate}`);
```

### Get Streak History

```typescript
import StreakLog from "@/models/StreakLog";

const logs = await StreakLog.find({ userId })
  .sort({ date: -1 })
  .limit(30);

logs.forEach(log => {
  console.log(`${log.date}: ${log.taskCount} tasks, streak: ${log.streakLength}`);
});
```

### Rebuild User's Streaks

```typescript
import { recomputeStreaksFromHistory } from "@/lib/gamification/streaks";

// Useful after data imports or corrections
const result = await recomputeStreaksFromHistory(userId);

if (result.success) {
  console.log(`Rebuilt ${result.totalDaysActive} days of history`);
}
```

## Edge Cases

### User Changes Timezone

When a user changes their timezone preference:
1. **Current streak is NOT recalculated** - it remains based on old timezone
2. **Future completions** use the new timezone
3. To recalculate with new timezone, run `recomputeStreaksFromHistory(userId)`

### Clock Adjustments

If a user's device clock is wrong:
- Completions with future dates are rejected by XP engine (age validation)
- Completions with past dates (before lastStreakDate) don't break current streak
- Use backfill script to rebuild correct history

### Multiple Completions Same Day

- First completion: Establishes the day in streak history
- Subsequent completions: Increment `taskCount` but don't change streak
- Each completion still awards XP with the same streak multiplier

### Breaking a Streak

- When a user misses a day, `currentStreak` resets to 1 (not 0)
- `longestStreak` is never decreased - it's the all-time record
- If a user returns after a gap, they start fresh with a 1-day streak

## Performance Considerations

### Database Indexes

The StreakLog model has these indexes:
- `{ userId: 1, date: -1 }` - For querying user history
- `{ userId: 1, date: 1 }` (unique) - For upserts and duplicate prevention

### Backfill Performance

- Batch size affects memory usage vs. database query count
- Default 100 users per batch is a good balance
- Can process ~50-100 users/sec depending on history size
- For large datasets (10,000+ users), consider:
  - Running during off-peak hours
  - Increasing batch size to 500-1000
  - Monitoring MongoDB query performance

## Troubleshooting

### Streak Not Updating

1. Check user's timezone setting: `user.preferences.timezone`
2. Verify task completion date: `task.completedAt`
3. Check StreakLog entry was created:
   ```typescript
   const log = await StreakLog.findOne({ 
     userId, 
     date: new Date("YYYY-MM-DDT00:00:00Z") 
   });
   ```

### Wrong Timezone Calculations

1. Ensure timezone is valid IANA timezone (e.g., "America/New_York", not "EST")
2. Check DST rules - may differ from expectations
3. Use backfill script to recompute with correct timezone

### Backfill Script Errors

- **"User not found"**: User was deleted but ActivityLog entries remain
- **"Timeout"**: Large history - increase batch size or add progress logging
- **"Duplicate key"**: Safe to ignore - means entry already exists

## Future Enhancements

Potential improvements for the streak system:

1. **Streak Freeze**: Allow users to "freeze" their streak for 1-2 days (achievement unlock)
2. **Weekly Streaks**: Track weeks instead of days for less pressure
3. **Streak Visualization**: Generate sparkline charts of daily activity
4. **Social Features**: Share streak milestones, compare with friends
5. **Streak Achievements**: Special badges for 30, 100, 365 day streaks
6. **Custom Streak Goals**: Let users set their own streak targets
