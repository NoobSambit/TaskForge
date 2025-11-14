# Leaderboard Feature

The leaderboard system allows users to view global rankings based on XP earned weekly and monthly, with comprehensive privacy controls.

## Features

- **Global Rankings**: View top players ranked by XP earned
- **Weekly/Monthly Views**: Toggle between weekly and monthly leaderboard periods
- **Privacy Controls**: Opt in/out of leaderboard visibility, anonymize display name
- **Current User Tracking**: Always see your rank and progress
- **Pagination**: Browse through rankings with proper page management
- **Anti-Cheat Measures**: Built-in duplicate prevention and fair play enforcement

## Feature Flag

The leaderboard feature is controlled by the `FEATURE_LEADERBOARD` environment variable:

```bash
FEATURE_LEADERBOARD=true  # Enable leaderboard
FEATURE_LEADERBOARD=false # Disable leaderboard (default)
```

When disabled (default), all leaderboard endpoints return a 403 Forbidden response.

## API Endpoints

### Get Leaderboard

```
GET /api/gamification/leaderboard
```

**Query Parameters:**
- `period` (string): 'weekly' or 'monthly' (default: 'weekly')
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)

**Authentication:** Required

**Response:**
```json
{
  "data": {
    "period": "weekly",
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-07T23:59:59.999Z"
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    },
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user123",
        "name": "Alice",
        "totalXp": 5000,
        "level": 10,
        "isCurrentUser": false
      },
      {
        "rank": 2,
        "userId": "currentUserId",
        "name": "Bob",
        "totalXp": 4500,
        "level": 9,
        "isCurrentUser": true
      }
    ],
    "currentUserRank": 2,
    "currentUser": {
      "rank": 2,
      "name": "Bob",
      "totalXp": 4500,
      "level": 9
    }
  },
  "message": "Leaderboard data retrieved successfully"
}
```

### Get Preferences

```
GET /api/gamification/preferences
```

**Authentication:** Required

**Response:**
```json
{
  "data": {
    "leaderboardOptIn": true,
    "anonymousMode": false,
    "timezone": "UTC"
  }
}
```

### Update Preferences

```
PATCH /api/gamification/preferences
```

**Authentication:** Required

**Request Body:**
```json
{
  "leaderboardOptIn": true,
  "anonymousMode": false,
  "timezone": "UTC"
}
```

All fields are optional - only provided fields will be updated.

**Response:**
```json
{
  "data": {
    "leaderboardOptIn": true,
    "anonymousMode": false,
    "timezone": "UTC"
  },
  "message": "Preferences updated successfully"
}
```

## Components

### Leaderboard Component

```tsx
import { Leaderboard } from "@/components/gamification";

export default function LeaderboardPage() {
  return <Leaderboard />;
}
```

**Features:**
- Displays global leaderboard with weekly/monthly views
- Pagination support with next/previous navigation
- Shows current user's rank and status
- Handles loading and error states
- Responsive table layout
- Real-time XP display with thousands separators

### LeaderboardSettings Component

```tsx
import { LeaderboardSettings } from "@/components/gamification";

export default function SettingsPage() {
  return <LeaderboardSettings />;
}
```

**Features:**
- Toggle leaderboard opt-in
- Enable/disable anonymous mode (only available when opted in)
- Real-time preference updates
- Loading and error states
- Success feedback messages

## Privacy & Security

### Privacy Preferences

Users have two privacy controls:

#### 1. Leaderboard Opt-In (Default: enabled)
- When enabled: User appears on global leaderboard ranked by XP
- When disabled: User does not appear on leaderboard at all
- API filters users at database query level for security

#### 2. Anonymous Mode (Default: disabled)
- When enabled: User displays as "Anonymous #[last6OfUserId]" on leaderboard
- When disabled: User's real name is displayed
- Applied at API response level - database doesn't store anonymized names
- Only usable when opted into leaderboard

### API Filtering

The leaderboard endpoint uses MongoDB aggregation to:

1. Filter users by `preferences.leaderboardOptIn: true`
2. Join activity logs to calculate XP totals for the period
3. Exclude users with 0 XP from the leaderboard
4. Sort by total XP descending
5. Apply anonymization at application level

### Anti-Cheat Measures

1. **Duplicate Prevention**: ActivityLog has unique index on (userId, taskId, activityType)
2. **XP Capping**: Individual task XP is capped (minimum 5, maximum 200)
3. **Daily Caps**: Optional daily XP limit prevents farming (configurable)
4. **Activity Tracking**: All XP awards are logged with timestamp and task reference
5. **Fair Play Badge**: Component displays anti-cheat notice to users

## Database Schema

### User Model
```typescript
preferences: {
  leaderboardOptIn: boolean;      // Whether user appears on leaderboard
  anonymousMode: boolean;         // Whether name is anonymized
  timezone?: string;              // Optional timezone
  nextLevelAt?: number;           // XP required for next level
}
```

### ActivityLog Model
Required for leaderboard calculations:
```typescript
interface IActivityLog {
  userId: string;                 // User who earned XP
  activityType: string;           // Type of activity (e.g., "task_completed")
  taskId?: string;                // Reference to task
  metadata?: {
    [key: string]: any;
  };
  xpEarned: number;              // XP earned in this activity
  date: Date;                     // Activity date
  createdAt: Date;
  updatedAt: Date;
}
```

## Configuration

### Feature Flag

Set environment variable in `.env.local`:
```
FEATURE_LEADERBOARD=true
```

### Period Configuration

Date ranges are calculated automatically:
- **Weekly**: Sunday to Saturday (week starts on Sunday)
- **Monthly**: 1st to last day of month

### Pagination

- Default page size: 50
- Maximum page size: 100
- Automatically handles total pages calculation

## Testing

### Test Files

1. **`app/api/gamification/leaderboard/__tests__/route.test.ts`** - API endpoint tests
   - Feature flag validation
   - Authentication requirements
   - Period parameter handling
   - Privacy filtering
   - Pagination

2. **`app/api/gamification/preferences/__tests__/route.test.ts`** - Preferences API tests
   - GET preferences endpoint
   - PATCH preferences validation
   - Update atomicity

3. **`lib/__tests__/featureFlags.test.ts`** - Feature flags module tests
   - Flag reading from env vars
   - Feature access validation
   - User preference consideration

4. **`components/gamification/__tests__/Leaderboard.test.tsx`** - Component tests
   - Data transformation
   - Pagination logic
   - Anonymization
   - API integration

### Running Tests

```bash
npm test -- leaderboard
npm test -- preferences
npm test -- featureFlags
```

## Usage Examples

### Basic Usage

```tsx
import { Leaderboard, LeaderboardSettings } from "@/components/gamification";

// Display leaderboard
export default function LeaderboardPage() {
  return (
    <div>
      <h1>Global Leaderboard</h1>
      <Leaderboard />
    </div>
  );
}

// Settings page
export default function SettingsPage() {
  return (
    <div>
      <h2>Leaderboard Preferences</h2>
      <LeaderboardSettings />
    </div>
  );
}
```

### Feature Check in Components

```tsx
import { isFeatureEnabled } from "@/lib/featureFlags";

export function Dashboard() {
  const leaderboardEnabled = isFeatureEnabled("leaderboard");

  return (
    <div>
      {leaderboardEnabled && (
        <Link href="/leaderboard">View Leaderboard</Link>
      )}
    </div>
  );
}
```

### API Usage

```typescript
// Get leaderboard
const response = await fetch("/api/gamification/leaderboard?period=weekly&page=1&limit=50");
const { data } = await response.json();

// Get preferences
const prefs = await fetch("/api/gamification/preferences");
const { data: preferences } = await prefs.json();

// Update preferences
await fetch("/api/gamification/preferences", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    leaderboardOptIn: true,
    anonymousMode: false,
  }),
});
```

## Error Handling

### Feature Disabled

```
HTTP 403 Forbidden
{
  "error": "Leaderboard feature is not enabled"
}
```

### Unauthorized

```
HTTP 401 Unauthorized
{
  "error": "Authentication required"
}
```

### Invalid Parameters

```
HTTP 400 Bad Request
{
  "error": "Invalid query parameters",
  "details": [...]
}
```

## Performance Considerations

### Database Indexes

The following indexes should exist for optimal performance:

```typescript
// In User model:
index({ "preferences.leaderboardOptIn": 1 })

// In ActivityLog model:
index({ userId: 1, date: -1 })
index({ userId: 1, activityType: 1, date: -1 })
```

### Aggregation Pipeline

The aggregation pipeline is optimized with:
- Early filtering by `leaderboardOptIn` in `$match`
- Efficient `$lookup` with let binding for user ID joining
- `$group` at the end to minimize documents processed
- `$sort` before `$project` for efficiency

### Caching

- Leaderboard responses include `Cache-Control: no-cache` headers
- Results update in real-time as users complete tasks
- Client-side caching is discouraged due to dynamic rankings

## Troubleshooting

### Leaderboard Not Showing

1. Check `FEATURE_LEADERBOARD` environment variable is set to `true`
2. Verify user has opted in: `preferences.leaderboardOptIn === true`
3. Ensure user has at least 1 XP in the current period
4. Check browser console for API errors

### Preferences Not Updating

1. Verify authentication session is valid
2. Check PATCH request includes valid JSON body
3. Monitor network tab for error responses
4. Check user document in MongoDB for preference fields

### Performance Issues

1. Check database indexes are created
2. Review MongoDB slow query logs
3. Monitor aggregation pipeline complexity
4. Consider reducing `limit` parameter if querying large datasets

## Future Enhancements

- [ ] Global leaderboard filters (level ranges, streaks, etc.)
- [ ] Friend leaderboards (rank among friends only)
- [ ] Leaderboard achievements (reach top 10, etc.)
- [ ] Seasonal leaderboards with reset and rewards
- [ ] Leaderboard statistics (average XP, top earners, etc.)
- [ ] Real-time leaderboard updates via WebSocket
