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

## Future Enhancements

Potential additions to consider:

- Daily/weekly quests system
- Social features (friend challenges)
- Seasonal events and limited achievements
- Achievement progress tracking (partial completion)
- Custom user avatars
- XP boost items/power-ups
- Team/guild systems
