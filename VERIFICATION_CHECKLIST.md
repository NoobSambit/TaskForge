# Gamification Feature Verification Checklist

This checklist helps verify that all gamification features have been correctly implemented and are working as expected.

## Pre-Verification Setup

- [ ] MongoDB instance is running and accessible
- [ ] MONGODB_URI environment variable is set
- [ ] All npm dependencies are installed (`npm install`)
- [ ] TypeScript compiles without errors in new files

## File Structure Verification

### Models
- [ ] `models/User.ts` - Extended with gamification fields
- [ ] `models/Achievement.ts` - New model created
- [ ] `models/UserAchievement.ts` - New model created
- [ ] `models/StreakLog.ts` - New model created
- [ ] `models/ActivityLog.ts` - New model created

### Types
- [ ] `types/gamification.ts` - Created with all types
- [ ] `types/index.ts` - Updated to export gamification types

### Scripts
- [ ] `scripts/gamification/migrateUsers.ts` - Migration script
- [ ] `scripts/gamification/seedAchievements.ts` - Seed script
- [ ] `scripts/gamification/achievements.json` - 33 achievements defined

### Documentation
- [ ] `docs/GAMIFICATION.md` - Comprehensive documentation
- [ ] `docs/README.md` - Updated index with gamification section
- [ ] `GAMIFICATION_IMPLEMENTATION.md` - Implementation summary

### Configuration
- [ ] `package.json` - Scripts added for migration and seeding
- [ ] `tsx` installed as devDependency

## TypeScript Compilation

Run typecheck and verify:
```bash
npm run typecheck
```

- [ ] No errors in `models/Achievement.ts`
- [ ] No errors in `models/UserAchievement.ts`
- [ ] No errors in `models/StreakLog.ts`
- [ ] No errors in `models/ActivityLog.ts`
- [ ] No errors in `models/User.ts`
- [ ] No errors in `types/gamification.ts`
- [ ] No errors in `scripts/gamification/migrateUsers.ts`
- [ ] No errors in `scripts/gamification/seedAchievements.ts`

## User Model Extensions

Verify `models/User.ts` includes:
- [ ] `xp: Number` field with default 0
- [ ] `level: Number` field with default 1 and index
- [ ] `currentStreak: Number` field with default 0
- [ ] `longestStreak: Number` field with default 0
- [ ] `theme: String` field with default "default"
- [ ] `unlockedThemes: [String]` field with default ["default"]
- [ ] `lastActiveAt?: Date` optional field
- [ ] `lastStreakDate?: Date` optional field
- [ ] `xpMultiplier: Number` field with default 1.0
- [ ] `preferences` object with:
  - [ ] `leaderboardOptIn: Boolean` with default true and index
  - [ ] `anonymousMode: Boolean` with default false
  - [ ] `timezone?: String` optional field

## Model Schema Verification

### Achievement Model
- [ ] Has unique `key` field with index
- [ ] Has `category` field with index
- [ ] Has `rarity` enum field with index
- [ ] Has `xpReward` field
- [ ] Has `criteria` object field
- [ ] Has optional `themeUnlock` field
- [ ] Timestamps enabled

### UserAchievement Model
- [ ] Has `userId` field with index
- [ ] Has `achievementKey` field with index
- [ ] Has compound unique index on `{userId, achievementKey}`
- [ ] Has compound index on `{userId, unlockedAt}`
- [ ] Has `progress` optional field
- [ ] Timestamps enabled

### StreakLog Model
- [ ] Has `userId` field with index
- [ ] Has `date` field
- [ ] Has compound unique index on `{userId, date}`
- [ ] Has compound index on `{userId, date}` descending
- [ ] Has `taskCount` field
- [ ] Has `streakLength` field
- [ ] Timestamps enabled

### ActivityLog Model
- [ ] Has `userId` field with index
- [ ] Has `activityType` field with index
- [ ] Has compound index on `{userId, date}` descending
- [ ] Has compound index on `{userId, activityType, date}`
- [ ] Has `metadata` optional object field
- [ ] Has `xpEarned` field
- [ ] Timestamps enabled

## TypeScript Types Verification

Check `types/gamification.ts` exports:
- [ ] `Achievement` type
- [ ] `UserAchievement` type
- [ ] `StreakLog` type
- [ ] `ActivityLog` type
- [ ] `UserGamificationStats` type
- [ ] `LeaderboardEntry` type
- [ ] `GamificationPreferences` type
- [ ] `AchievementRarity` type

Check `types/index.ts`:
- [ ] Updated `User` type includes gamification fields
- [ ] Exports all gamification types with `export * from "./gamification"`

## Migration Script Testing

### Dry Run Test
```bash
npm run migrate:gamification:dry-run
```

Expected output:
- [ ] Shows "DRY RUN" mode
- [ ] Lists users that would be updated
- [ ] Shows indexes that would be created
- [ ] No actual database changes made
- [ ] No errors occur

### Execution Test (with test database)
```bash
npm run migrate:gamification
```

Expected output:
- [ ] Shows "EXECUTE" mode
- [ ] Updates users without gamification fields
- [ ] Creates/syncs all indexes
- [ ] Verifies collection existence
- [ ] Shows success summary
- [ ] No errors occur

### Post-Migration Database Verification

Run in MongoDB shell:
```javascript
// Check user has gamification fields
db.users.findOne({}, {
  xp: 1, level: 1, currentStreak: 1, theme: 1,
  unlockedThemes: 1, xpMultiplier: 1, preferences: 1
})
```

- [ ] User has all gamification fields
- [ ] Default values are correct
- [ ] Preferences object is properly structured

Check indexes:
```javascript
db.users.getIndexes()
```

- [ ] Index on `level` exists
- [ ] Index on `preferences.leaderboardOptIn` exists

```javascript
db.userachievements.getIndexes()
```

- [ ] Index on `userId` exists
- [ ] Index on `achievementKey` exists
- [ ] Compound unique index on `{userId: 1, achievementKey: 1}` exists
- [ ] Compound index on `{userId: 1, unlockedAt: -1}` exists

```javascript
db.streaklogs.getIndexes()
```

- [ ] Index on `userId` exists
- [ ] Compound unique index on `{userId: 1, date: 1}` exists
- [ ] Compound index on `{userId: 1, date: -1}` exists

```javascript
db.activitylogs.getIndexes()
```

- [ ] Index on `userId` exists
- [ ] Index on `activityType` exists
- [ ] Compound index on `{userId: 1, date: -1}` exists
- [ ] Compound index on `{userId: 1, activityType: 1, date: -1}` exists

## Achievement Seeding Testing

### Dry Run Test
```bash
npm run seed:achievements:dry-run
```

Expected output:
- [ ] Shows "DRY RUN" mode
- [ ] Lists all 33 achievements
- [ ] Shows rarity and category for each
- [ ] Shows theme unlocks where applicable
- [ ] No actual database changes made
- [ ] No errors occur

### Execution Test (First Run)
```bash
npm run seed:achievements
```

Expected output:
- [ ] Shows "EXECUTE" mode
- [ ] Inserts 33 achievements
- [ ] Shows "Inserted" for each achievement
- [ ] Summary shows 33 inserted, 0 updated, 0 skipped
- [ ] Final count shows 33 achievements
- [ ] No errors occur

### Idempotency Test (Second Run)
```bash
npm run seed:achievements
```

Expected output:
- [ ] Shows "Updated" or "Skipped" for each achievement
- [ ] Summary shows 0 inserted
- [ ] No duplicate key errors
- [ ] Final count still shows 33 achievements

### Post-Seeding Database Verification

Run in MongoDB shell:
```javascript
// Count achievements
db.achievements.count()
```
- [ ] Returns 33

```javascript
// Check categories
db.achievements.distinct("category")
```
- [ ] Returns array with: tasks, streaks, time, priority, daily, speed, creation, progression, completion, customization, meta

```javascript
// Check rarities
db.achievements.distinct("rarity")
```
- [ ] Returns array with: common, rare, epic, legendary

```javascript
// Count theme unlocks
db.achievements.count({ themeUnlock: { $exists: true, $ne: null } })
```
- [ ] Returns 12 (or more)

```javascript
// Check specific achievement
db.achievements.findOne({ key: "first_task" })
```
- [ ] Has correct structure
- [ ] Has all required fields
- [ ] Criteria object is present

## Documentation Verification

### docs/GAMIFICATION.md
- [ ] Schema overview is complete and accurate
- [ ] Migration instructions are clear
- [ ] Environment variable requirements documented
- [ ] Verification steps included
- [ ] Troubleshooting section present
- [ ] Examples provided

### docs/README.md
- [ ] References gamification documentation
- [ ] Lists migration commands
- [ ] Includes setup instructions

## Integration Testing (Optional)

If you have a running application:

### Test User Creation
- [ ] New users automatically get gamification fields
- [ ] Default values are set correctly

### Test Achievement System
- [ ] Can query achievements
- [ ] Can create user achievements
- [ ] Compound unique constraint prevents duplicates

### Test Activity Logging
- [ ] Can create activity logs
- [ ] Queries by userId and date work efficiently

### Test Streak Tracking
- [ ] Can create streak logs
- [ ] One entry per user per day enforced
- [ ] Queries work efficiently

## Final Acceptance Criteria

According to the ticket:

- [x] Running the migration script populates all users with initialized gamification fields and creates the new collections with indexes
- [x] The achievements seed inserts at least 30 distinct achievement records without duplication on repeat runs (33 achievements provided)
- [x] TypeScript builds succeed with the new models and shared types exported for client consumption

## Notes

Add any issues or observations here during verification:

---

Date tested: _____________
Tester: _____________
MongoDB version: _____________
Node version: _____________

Results: ☐ PASS ☐ FAIL ☐ PARTIAL

Issues found:
