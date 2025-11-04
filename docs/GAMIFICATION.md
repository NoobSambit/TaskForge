# Gamification System Documentation

## Overview

The gamification system adds engagement features to the application including experience points (XP), levels, achievements, streaks, and customizable themes. This document describes the schema, migration process, and how to use the system.

## Schema Overview

### User Model Extensions

The `User` model has been extended with the following gamification fields:

- **xp** (Number): Total experience points earned (default: 0)
- **level** (Number): Current user level (default: 1, indexed)
- **currentStreak** (Number): Current consecutive days of activity (default: 0)
- **longestStreak** (Number): Longest streak ever achieved (default: 0)
- **theme** (String): Currently active theme (default: "default")
- **unlockedThemes** (Array): List of unlocked theme names (default: ["default"])
- **lastActiveAt** (Date): Last activity timestamp
- **lastStreakDate** (Date): Last date counted toward streak
- **xpMultiplier** (Number): Multiplier for XP gains (default: 1.0)
- **preferences** (Object): Privacy and personalization settings
  - **leaderboardOptIn** (Boolean): Whether user appears on leaderboards (default: true, indexed)
  - **anonymousMode** (Boolean): Hide user name on leaderboards (default: false)
  - **timezone** (String, optional): User's timezone for date calculations

### New Collections

#### Achievement
Defines available achievements users can unlock.

**Fields:**
- **key** (String, unique, indexed): Unique identifier (e.g., "first_task")
- **name** (String): Display name
- **description** (String): Achievement description
- **icon** (String): Emoji or icon identifier
- **category** (String, indexed): Category (tasks, streaks, time, etc.)
- **xpReward** (Number): XP awarded when unlocked
- **rarity** (String, indexed): "common", "rare", "epic", or "legendary"
- **themeUnlock** (String, optional): Theme unlocked with this achievement
- **criteria** (Object): Conditions for unlocking
  - **type** (String): Criteria type
  - **target** (Number, optional): Target value
  - Additional custom fields

**Indexes:**
- `key` (unique)
- `category`
- `rarity`

#### UserAchievement
Tracks which achievements users have unlocked.

**Fields:**
- **userId** (String, indexed): User ID
- **achievementKey** (String, indexed): Reference to Achievement.key
- **unlockedAt** (Date): When achievement was unlocked
- **progress** (Number, optional): Progress percentage (0-100)

**Indexes:**
- `userId`
- `achievementKey`
- `{userId, achievementKey}` (compound, unique)
- `{userId, unlockedAt}` (compound, descending)

#### StreakLog
Records daily activity streaks.

**Fields:**
- **userId** (String, indexed): User ID
- **date** (Date): Date of activity
- **taskCount** (Number): Tasks completed that day
- **streakLength** (Number): Streak length at that point

**Indexes:**
- `userId`
- `{userId, date}` (compound, unique)
- `{userId, date}` (compound, descending for queries)

#### ActivityLog
Tracks all gamification-related activities.

**Fields:**
- **userId** (String, indexed): User ID
- **activityType** (String, indexed): Type of activity
- **metadata** (Object, optional): Activity-specific data
- **xpEarned** (Number): XP earned from this activity
- **date** (Date): Activity timestamp

**Indexes:**
- `userId`
- `activityType`
- `{userId, date}` (compound, descending)
- `{userId, activityType, date}` (compound)

## Migration and Setup

### Prerequisites

Before running migration scripts, ensure:

1. **MongoDB Connection**: Set the `MONGODB_URI` environment variable
   ```bash
   export MONGODB_URI="mongodb://localhost:27017/your-database"
   # or add to .env file
   ```

2. **Dependencies**: Ensure all npm packages are installed
   ```bash
   npm install
   ```

### Step 1: Migrate Existing Users

The migration script backfills existing users with default gamification fields and creates all necessary indexes.

**Dry Run (recommended first):**
```bash
npm run migrate:gamification:dry-run
```

This shows what would be updated without making changes.

**Execute Migration:**
```bash
npm run migrate:gamification
```

**What it does:**
- Finds users without gamification fields
- Adds default values:
  - xp: 0
  - level: 1
  - currentStreak: 0
  - longestStreak: 0
  - theme: "default"
  - unlockedThemes: ["default"]
  - xpMultiplier: 1.0
  - preferences: { leaderboardOptIn: true, anonymousMode: false }
- Creates indexes on all collections
- Verifies collection existence

### Step 2: Seed Achievements

The seed script populates the database with predefined achievements from `achievements.json`.

**Dry Run (recommended first):**
```bash
npm run seed:achievements:dry-run
```

**Execute Seeding:**
```bash
npm run seed:achievements
```

**Features:**
- Idempotent: Can be run multiple times safely
- Uses upsert to update existing achievements
- Loads from `scripts/gamification/achievements.json`
- Seeds 33 achievements across multiple categories

**Achievement Categories:**
- **tasks**: Task completion milestones
- **streaks**: Consecutive day achievements
- **time**: Time-based achievements (early bird, night owl, weekend)
- **priority**: Priority task achievements
- **daily**: Daily productivity achievements
- **speed**: Fast completion achievements
- **creation**: Task creation achievements
- **progression**: Level-based achievements
- **completion**: Perfect completion achievements
- **customization**: Theme unlocking achievements
- **meta**: Achievement-hunting achievements

### Verification

After running migrations, verify in MongoDB:

```javascript
// Check user with gamification fields
db.users.findOne({}, { email: 1, xp: 1, level: 1, preferences: 1 })

// Count achievements
db.achievements.count()

// List indexes
db.users.getIndexes()
db.achievements.getIndexes()
db.userachievements.getIndexes()
db.streaklogs.getIndexes()
db.activitylogs.getIndexes()
```

## TypeScript Types

All gamification types are exported from `types/gamification.ts` and re-exported from `types/index.ts`:

```typescript
import { 
  Achievement, 
  UserAchievement, 
  StreakLog, 
  ActivityLog,
  UserGamificationStats,
  LeaderboardEntry,
  GamificationPreferences 
} from '@/types';
```

## Adding New Achievements

To add achievements after initial setup:

1. Edit `scripts/gamification/achievements.json`
2. Add new achievement objects with unique keys
3. Run the seed script:
   ```bash
   npm run seed:achievements
   ```
4. The script will insert new achievements and update existing ones

## Environment Variables

Required environment variables:

- **MONGODB_URI**: MongoDB connection string
  - Example: `mongodb://localhost:27017/myapp`
  - Example (Atlas): `mongodb+srv://user:pass@cluster.mongodb.net/mydb`

Optional environment variables for production:

- **MONGODB_OPTIONS**: Additional MongoDB connection options (JSON string)

## Troubleshooting

### Migration fails with "MONGODB_URI not set"
- Ensure the environment variable is set in your shell or `.env` file
- Check that you're loading environment variables correctly

### Duplicate key errors during seeding
- This is normal if achievements already exist
- The script handles this gracefully and shows "Skipped (exists)" messages

### Missing collections
- Collections are created automatically on first document insert
- Running the migration ensures they exist and have proper indexes

### Index creation fails
- Check MongoDB user permissions (needs write access)
- Ensure no conflicting indexes exist
- Drop old indexes if schema changed: `db.collection.dropIndexes()`

## Best Practices

1. **Always run dry-run first** before executing migrations in production
2. **Backup your database** before running migrations
3. **Test locally** with a copy of production data first
4. **Monitor performance** after index creation on large datasets
5. **Version achievements** by keeping history of `achievements.json`
6. **Document custom criteria types** when adding new achievement mechanics

## XP Engine

The XP calculation engine is a pure, deterministic function that computes experience points for completed tasks. It's designed to be:

- **Pure**: No side effects, same inputs always produce same outputs
- **Transparent**: Returns detailed breakdown of all applied rules
- **Configurable**: All coefficients centralized in `lib/gamification/config.ts`
- **Testable**: Covered by comprehensive unit tests

### Usage

```typescript
import { calculateXp } from '@/lib/gamification';
import type { TaskData, UserContext } from '@/lib/gamification';

const task: TaskData = {
  priority: 5,
  difficulty: 'hard',
  tags: ['urgent', 'bug-fix'],
  completedAt: new Date(),
  createdAt: new Date(Date.now() - 86400000),
  dueDate: new Date(Date.now() + 86400000),
};

const user: UserContext = {
  userId: 'user123',
  xpMultiplier: 1.2,
  currentStreak: 7,
};

const result = calculateXp(task, user);
console.log(result.delta); // e.g., 142
console.log(result.appliedRules); // Detailed breakdown
```

### XP Calculation Flow

The engine applies rules in this order:

1. **Base XP**: Determined by task difficulty
   - Easy: 10 XP
   - Medium: 25 XP
   - Hard: 50 XP

2. **Priority Multiplier**: Based on task priority (1-5)
   - Priority 1: 0.8x
   - Priority 2: 0.9x
   - Priority 3: 1.0x (default)
   - Priority 4: 1.25x
   - Priority 5: 1.5x

3. **Tag Bonuses**: Additive bonuses for special tags
   - `urgent`: +15 XP
   - `bug-fix`: +20 XP
   - `learning`: +10 XP
   - `refactor`: +15 XP
   - `documentation`: +8 XP
   - `testing`: +12 XP
   - `review`: +10 XP
   - `deployment`: +25 XP
   - `design`: +15 XP
   - `research`: +12 XP

4. **Streak Multiplier**: Based on consecutive active days
   - 0-2 days: 1.0x (no bonus)
   - 3-6 days: 1.1x
   - 7-13 days: 1.2x
   - 14-29 days: 1.3x
   - 30+ days: 1.5x

5. **Time-Based Adjustments**:
   - Early completion: +10 XP (completed before due date)
   - Late completion: -5 XP (completed after due date)
   - Early bird: +5 XP (completed 5 AM - 9 AM)
   - Night owl: +5 XP (completed 10 PM - 2 AM)
   - Weekend: +8 XP (completed Saturday or Sunday)

6. **User Multiplier**: Applied from user achievements/bonuses

7. **Caps and Rounding**:
   - Minimum: 5 XP per task
   - Maximum: 200 XP per task
   - Daily maximum: 1000 XP (optional)
   - Rounded to nearest integer

### Configuration

All XP coefficients are defined in `lib/gamification/config.ts`:

```typescript
import {
  BASE_XP,
  PRIORITY_MULTIPLIERS,
  TAG_BONUSES,
  getStreakMultiplier,
  TIME_BONUSES,
  XP_CAPS,
} from '@/lib/gamification/config';
```

To adjust the game balance, modify values in `config.ts` without touching the core engine logic.

### Edge Cases

The engine handles several edge cases:

- **Missing completedAt**: Returns 0 XP
- **Future completion date**: Returns 0 XP (invalid timestamp)
- **Very old completion**: Returns 0 XP if > 7 days old (prevents backdating)
- **Daily cap reached**: Returns 0 XP when daily limit hit
- **Unknown tags**: Ignored silently
- **Invalid priority**: Defaults to priority 3 multiplier

### Testing

The XP engine has comprehensive test coverage in `lib/__tests__/gamification/xpEngine.test.ts`:

```bash
npm test -- xpEngine
```

Tests cover:
- Basic calculations for all difficulty levels
- Priority multipliers
- Tag bonus stacking
- Streak multipliers
- Time-based bonuses
- User multipliers
- XP caps
- Edge cases
- Complex scenarios with multiple bonuses

### Applied Rules

The engine returns an `appliedRules` array for transparency:

```typescript
{
  delta: 142,
  appliedRules: [
    { key: 'base_xp', value: 50, description: 'Base XP for hard difficulty' },
    { key: 'priority_multiplier', value: 1.5, description: 'Priority 5 multiplier (50 × 1.5 = 75.0)' },
    { key: 'tag_bonus', value: 35, description: 'Tag bonuses: urgent, bug-fix (+35 XP)' },
    { key: 'streak_multiplier', value: 1.2, description: '7-day streak multiplier (110.0 × 1.2 = 132.0)' },
    { key: 'user_multiplier', value: 1.2, description: 'User multiplier (132.0 × 1.2 = 158.4)' },
    { key: 'rounding', value: 158, description: 'Rounded (158.40 → 158)' }
  ]
}
```

This makes it easy to debug XP calculations and show users exactly why they received a certain amount of XP.

### Integration

The XP engine is a pure function and doesn't interact with the database. Services that award XP should:

1. Call `calculateXp()` with task and user data
2. Update user's XP total
3. Log the activity to `ActivityLog`
4. Check for level-ups and achievements
5. Update streak information

Example integration:

```typescript
import { calculateXp } from '@/lib/gamification';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';

async function awardXpForTask(taskId: string, userId: string) {
  // Fetch data
  const task = await Task.findById(taskId);
  const user = await User.findById(userId);
  
  // Calculate XP
  const result = calculateXp(
    {
      priority: task.priority,
      difficulty: task.difficulty,
      tags: task.tags,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
    },
    {
      userId: user._id,
      xpMultiplier: user.xpMultiplier,
      currentStreak: user.currentStreak,
    }
  );
  
  // Award XP
  if (result.delta > 0) {
    await User.updateOne(
      { _id: userId },
      { $inc: { xp: result.delta } }
    );
    
    // Log activity
    await ActivityLog.create({
      userId,
      activityType: 'task_completed',
      metadata: {
        taskId,
        appliedRules: result.appliedRules,
      },
      xpEarned: result.delta,
      date: new Date(),
    });
  }
  
  return result;
}
```

### XP Awarding Service

The gamification system includes a complete XP awarding service that handles task completion, duplicate prevention, atomic database updates, activity logging, and event emission.

#### Basic Usage

```typescript
import { awardXpForTaskCompletion } from '@/lib/gamification';

// Award XP when a task is completed
const result = await awardXpForTaskCompletion(taskId, userId);

if (result.success) {
  console.log(`Awarded ${result.xpAwarded} XP`);
  console.log(`Total XP: ${result.totalXp}`);
  console.log(`Level: ${result.newLevel}`);
}
```

#### Features

**Duplicate Prevention:**
- Uses a unique compound index on `ActivityLog` (`userId`, `taskId`, `activityType`)
- Prevents XP inflation from repeated completion calls
- Returns idempotent results for duplicate requests

**Atomic Updates:**
- Uses MongoDB's `$inc` operator for XP updates
- Ensures consistency in concurrent scenarios
- Handles race conditions gracefully

**Activity Logging:**
- Records detailed XP computation in metadata
- Includes task information and applied rules
- Enables XP audit trail and analytics

**Event Emission:**
- Emits `xpAwarded` event with full computation details
- Emits `levelUp` event when user levels up
- Emits `levelCheckPending` for downstream processing (achievements, etc.)

**Level Calculation:**
- Automatic level progression based on XP (see Level System section below)
- Uses configurable exponential curve
- Supports multiple level-ups in single XP grant
- Records level-up events in ActivityLog with dedicated reason code

#### API Reference

##### `awardXpForTaskCompletion(taskId, userId, options?)`

Awards XP for completing a task.

**Parameters:**
- `taskId` (string): ID of the completed task
- `userId` (string): ID of the user who completed the task
- `options` (optional):
  - `now` (Date): Reference time for calculations (mainly for testing)
  - `applyDailyCap` (boolean): Whether to enforce daily XP cap
  - `dailyXpEarned` (number): XP already earned today (for cap calculation)
  - `validateAge` (boolean): Whether to validate completion age
  - `allowNegativeAdjustment` (boolean): Allow negative XP adjustments
  - `activityType` (string): Custom activity type (default: "task_completion")

**Returns:**
```typescript
{
  success: boolean;
  xpAwarded: number;
  totalXp: number;
  newLevel: number;
  reason?: string;
  alreadyAwarded?: boolean;
}
```

##### `adjustXpForTaskReopen(taskId, userId)`

Adjusts XP when a task is re-opened (status changes from done to not done).

**Parameters:**
- `taskId` (string): ID of the task being re-opened
- `userId` (string): ID of the user

**Returns:** Same as `awardXpForTaskCompletion`

**Behavior:**
- Removes previously awarded XP
- Deletes original activity log entry
- Creates new log entry for the adjustment
- Prevents XP from going negative
- Updates user level if needed

##### `calculateLevelFromXp(xp)`

Calculates user level from total XP.

**Parameters:**
- `xp` (number): Total experience points

**Returns:** Level number (minimum 1)

#### Event Listeners

Subscribe to gamification events for downstream processing:

```typescript
import { gamificationEvents, GAMIFICATION_EVENTS } from '@/lib/gamification';

// Listen for XP awards
gamificationEvents.on(GAMIFICATION_EVENTS.XP_AWARDED, (event) => {
  console.log(`User ${event.userId} earned ${event.xpDelta} XP`);
  console.log('Applied rules:', event.computation.appliedRules);
  
  // Trigger SSE/WebSocket notification
  // Check for achievement unlocks
  // Update leaderboards
});

// Listen for level ups
gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_UP, (event) => {
  console.log(`User ${event.userId} reached level ${event.newLevel}!`);
  
  // Send notification
  // Unlock level-based rewards
});

// Listen for level checks
gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_CHECK_PENDING, (event) => {
  // Trigger achievement checks
  // Update UI via SSE
});
```

#### Integration Example

The XP awarding service is automatically integrated into the tasks API:

```typescript
// In /app/api/tasks/[id]/route.ts
if (wasNotDone && isNowDone) {
  // Task just completed - award XP
  awardXpForTaskCompletion(taskId, userId).catch((error) => {
    console.error("Error awarding XP:", error);
  });
} else if (wasDone && isNowNotDone) {
  // Task re-opened - adjust XP
  adjustXpForTaskReopen(taskId, userId).catch((error) => {
    console.error("Error adjusting XP:", error);
  });
}
```

**Key Points:**
- XP awarding is done asynchronously (doesn't block API response)
- Errors are logged but don't fail the task update
- Works for both online and offline sync scenarios
- Idempotent - safe to call multiple times

#### Offline Sync Integration

When tasks are synced from offline mode, the XP awarding service will:

1. Check if XP was already awarded for the task
2. Only award XP once, even if sync happens multiple times
3. Use the task's `completedAt` timestamp for XP calculation
4. Apply the same rules and multipliers as online completions

This ensures users get credit for offline work without XP inflation.

## Level System

The level system provides a structured progression curve that rewards users for accumulating XP. It's designed to be configurable, performant, and transparent.

### Overview

Users start at level 1 and progress through levels by earning XP. The system uses an exponential progression curve that can be tuned via configuration without code changes.

**Key Features:**
- Exponential XP curve (configurable)
- Precomputed lookup table for levels 1-100
- Automatic level-up detection
- Activity logging for each level-up
- Event emission for downstream processing
- Support for multiple level-ups per XP grant
- Next level threshold tracking

### Progression Curve

The level system uses a configurable exponential formula:

```
XP Required = (level - 1)^exponent × baseXp
```

**Default Configuration (exponent=2.0, baseXp=50):**

| Level | XP Required | XP for Next Level | XP to Level Up |
|-------|-------------|-------------------|----------------|
| 1     | 0           | 50                | 50             |
| 2     | 50          | 200               | 150            |
| 3     | 200         | 450               | 250            |
| 4     | 450         | 800               | 350            |
| 5     | 800         | 1,250             | 450            |
| 10    | 4,050       | 5,000             | 950            |
| 20    | 18,050      | 20,000            | 1,950          |
| 50    | 120,050     | 122,500           | 2,450          |
| 100   | 490,050     | 495,000           | 4,950          |

### Configuration

Level progression is configured in `lib/gamification/config.ts`:

```typescript
export const LEVEL_PROGRESSION = {
  BASE_XP: 50,        // Base XP multiplier
  EXPONENT: 2.0,      // Curve exponent (2.0 = quadratic)
  MAX_PRECOMPUTED_LEVEL: 100, // Levels to precompute
};
```

**Tuning the Curve:**

- **BASE_XP**: Higher values make leveling slower overall
  - `25` = Faster progression (2x faster)
  - `50` = Default (balanced)
  - `100` = Slower progression (2x slower)

- **EXPONENT**: Controls curve steepness
  - `1.5` = Sub-quadratic (more linear, easier to reach high levels)
  - `2.0` = Quadratic (recommended, balanced)
  - `2.5` = Super-quadratic (steeper, harder to reach high levels)

**Example Configurations:**

```typescript
// Fast progression (casual players)
BASE_XP: 25, EXPONENT: 1.5

// Default (balanced)
BASE_XP: 50, EXPONENT: 2.0

// Slow progression (hardcore players)
BASE_XP: 100, EXPONENT: 2.5
```

### API Reference

#### `xpRequiredForLevel(level: number): number`

Calculate XP required to reach a specific level.

```typescript
import { xpRequiredForLevel } from '@/lib/gamification';

xpRequiredForLevel(1);  // 0
xpRequiredForLevel(2);  // 50
xpRequiredForLevel(5);  // 800
xpRequiredForLevel(10); // 4,050
```

#### `nextLevelThreshold(currentXp: number): number`

Get XP required for the next level given current XP.

```typescript
import { nextLevelThreshold } from '@/lib/gamification';

nextLevelThreshold(0);    // 50 (need 50 XP for level 2)
nextLevelThreshold(50);   // 200 (need 200 XP for level 3)
nextLevelThreshold(100);  // 200 (still level 2, need 200 XP for level 3)
```

#### `calculateLevelFromXp(xp: number): number`

Calculate current level from total XP.

```typescript
import { calculateLevelFromXp } from '@/lib/gamification/levels';

calculateLevelFromXp(0);    // 1
calculateLevelFromXp(50);   // 2
calculateLevelFromXp(200);  // 3
calculateLevelFromXp(4050); // 10
```

#### `getLevelInfo(currentXp: number): LevelInfo`

Get detailed level information including thresholds.

```typescript
import { getLevelInfo } from '@/lib/gamification';

const info = getLevelInfo(100);
// {
//   level: 2,
//   xpRequired: 50,
//   xpForNextLevel: 200
// }
```

#### `getLevelInfoFast(currentXp: number): LevelInfo`

Fast lookup using precomputed table (levels 1-100). Falls back to calculation for higher levels.

```typescript
import { getLevelInfoFast } from '@/lib/gamification';

// Uses lookup table (faster)
const info = getLevelInfoFast(100);

// Calculates on-demand (still fast)
const highLevelInfo = getLevelInfoFast(1000000);
```

#### `calculateLevelsCrossed(oldXp: number, newXp: number): number[]`

Calculate all levels crossed between two XP values.

```typescript
import { calculateLevelsCrossed } from '@/lib/gamification';

calculateLevelsCrossed(0, 50);   // [2]
calculateLevelsCrossed(0, 450);  // [2, 3, 4]
calculateLevelsCrossed(50, 199); // [] (no level-up)
```

#### `applyLevelChanges(user: any, gainedXp: number): Promise<LevelUpInfo[]>`

Apply level changes after XP gain. Handles level-up detection, user updates, logging, and events.

```typescript
import { applyLevelChanges } from '@/lib/gamification';

// After awarding XP
const levelUps = await applyLevelChanges(user, xpGained);

for (const levelUp of levelUps) {
  console.log(`Leveled up from ${levelUp.oldLevel} to ${levelUp.newLevel}`);
  console.log(`Unlocked: ${levelUp.unlockedRewards.join(', ')}`);
}
```

**What it does:**
1. Calculates levels crossed
2. Updates `user.level`
3. Updates `user.preferences.nextLevelAt`
4. Creates `ActivityLog` entries with `activityType: "level_up"`
5. Emits `levelUp` events for each level gained
6. Returns array of `LevelUpInfo` objects

**ActivityLog Entry:**
```typescript
{
  userId: "user123",
  activityType: "level_up",
  xpEarned: 0, // No XP earned from leveling itself
  date: Date,
  metadata: {
    oldLevel: 1,
    newLevel: 2,
    totalXp: 60,
    xpForNextLevel: 200
  }
}
```

#### `LEVEL_LOOKUP_TABLE: ReadonlyArray<LevelInfo>`

Precomputed lookup table for levels 1-100.

```typescript
import { LEVEL_LOOKUP_TABLE } from '@/lib/gamification';

// Access directly for maximum performance
const level5Info = LEVEL_LOOKUP_TABLE[4]; // 0-indexed
console.log(level5Info);
// {
//   level: 5,
//   xpRequired: 800,
//   xpForNextLevel: 1250
// }
```

### Usage Examples

#### Display Level Progress

```typescript
import { getLevelInfo } from '@/lib/gamification';

function LevelProgress({ user }: { user: IUser }) {
  const info = getLevelInfo(user.xp);
  const progress = (user.xp - info.xpRequired) / (info.xpForNextLevel - info.xpRequired);
  
  return (
    <div>
      <h3>Level {info.level}</h3>
      <ProgressBar value={progress * 100} />
      <p>{user.xp} / {info.xpForNextLevel} XP</p>
    </div>
  );
}
```

#### Check for Level-Up

```typescript
import { calculateLevelsCrossed } from '@/lib/gamification';

const oldXp = user.xp;
await awardXpForTaskCompletion(taskId, userId);
await user.reload(); // Refresh from DB
const newXp = user.xp;

const levelsCrossed = calculateLevelsCrossed(oldXp, newXp);
if (levelsCrossed.length > 0) {
  console.log(`Level up! Now level ${levelsCrossed[levelsCrossed.length - 1]}`);
}
```

#### Award Large XP Grants

```typescript
// Large XP grant (e.g., from achievement unlock)
const oldLevel = user.level;
user.xp += 1000; // Add 1000 XP

const levelUps = await applyLevelChanges(user, 1000);
await user.save();

// levelUps contains info for each level gained
console.log(`Gained ${levelUps.length} levels!`);
for (const levelUp of levelUps) {
  // Send notification, unlock rewards, etc.
  sendLevelUpNotification(user, levelUp);
}
```

### Level-Up Events

Each level-up emits an event through the shared event bus:

```typescript
import { gamificationEvents, GAMIFICATION_EVENTS } from '@/lib/gamification';

gamificationEvents.on(GAMIFICATION_EVENTS.LEVEL_UP, (event) => {
  console.log('Level up event:', event);
  // {
  //   userId: "user123",
  //   oldLevel: 1,
  //   newLevel: 2,
  //   totalXp: 60,
  //   timestamp: Date
  // }
  
  // Send push notification
  sendNotification(event.userId, {
    title: `Level ${event.newLevel} Reached!`,
    body: `You've reached level ${event.newLevel}. Keep up the great work!`,
  });
  
  // Unlock level-based rewards
  if (event.newLevel === 5) {
    unlockTheme(event.userId, "midnight");
  }
  
  // Update leaderboards
  updateLeaderboard(event.userId);
});
```

### Multiple Level-Ups

The system correctly handles scenarios where a user gains enough XP to skip multiple levels:

```typescript
// User at level 1 (0 XP) completes a hard task with bonuses
// and gains 500 XP, jumping to level 4

// The system will:
// 1. Detect levels 2, 3, and 4 were crossed
// 2. Create 3 separate ActivityLog entries (one per level)
// 3. Emit 3 separate level-up events
// 4. Update user.level to 4
// 5. Set user.preferences.nextLevelAt to 800 (level 5 threshold)

const user = await User.findById(userId);
user.xp = 0;

// Award 500 XP
user.xp += 500;
const levelUps = await applyLevelChanges(user, 500);

console.log(levelUps);
// [
//   { oldLevel: 1, newLevel: 2, totalXp: 500, unlockedRewards: [] },
//   { oldLevel: 2, newLevel: 3, totalXp: 500, unlockedRewards: [] },
//   { oldLevel: 3, newLevel: 4, totalXp: 500, unlockedRewards: [] }
// ]
```

Each level-up is tracked individually, ensuring accurate analytics and reward distribution.

### Boundary Cases

The level system handles edge cases correctly:

**Exact Threshold:**
```typescript
calculateLevelFromXp(50);  // 2 (exactly at threshold)
calculateLevelFromXp(200); // 3 (exactly at threshold)
```

**Just Below Threshold:**
```typescript
calculateLevelFromXp(49);  // 1 (one XP away from level 2)
calculateLevelFromXp(199); // 2 (one XP away from level 3)
```

**Overshoot:**
```typescript
calculateLevelsCrossed(49, 201); // [2, 3] (skips through level 2 to 3)
```

**Level Down (XP Removal):**
```typescript
// If user loses XP (e.g., task reopened)
const oldXp = 250; // Level 3
const newXp = 100; // Level 2
calculateLevelsCrossed(oldXp, newXp); // [] (returns empty for level decrease)
```

### Performance

- **Precomputed Table**: Levels 1-100 are precomputed at module load for O(1) lookup
- **Calculation**: Higher levels calculated on-demand using efficient formula
- **Lookup Complexity**: O(1) for levels 1-100, O(1) for calculation
- **Memory**: ~10KB for lookup table (100 levels × ~100 bytes per entry)

### Testing

Run level system tests:

```bash
npm test -- levels.test.ts
```

Tests cover:
- XP threshold calculations
- Level calculations from XP
- Next level threshold lookups
- Boundary cases (exact threshold, overshoot, just below)
- Multiple level-up scenarios
- Large XP grants
- Configuration flexibility
- Precomputed lookup table
- Level-up event emission
- ActivityLog entry creation

## Future Enhancements

Potential additions to consider:

- Daily/weekly quests system
- Social features (friend challenges)
- Seasonal events and limited achievements
- Achievement progress tracking (partial completion)
- Custom user avatars
- XP boost items/power-ups
- Team/guild systems
- Dynamic XP scaling based on user level
