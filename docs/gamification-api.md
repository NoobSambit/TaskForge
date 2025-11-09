# Gamification API Documentation

This document describes the RESTful API endpoints for the gamification system. All endpoints require authentication except the index endpoint.

## Base URL

```
https://your-domain.com/api/gamification
```

## Authentication

All protected endpoints require a valid authentication session. The API uses NextAuth.js session management.

**Headers:**
- Cookie: Session cookie from NextAuth.js

**Authentication Responses:**
- `401 Unauthorized` - No valid session
- `403 Forbidden` - User doesn't have permission (rare in gamification context)

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Endpoints

### 1. API Index

**GET** `/api/gamification`

Lists all available gamification API endpoints with their parameters and requirements.

**Authentication:** Not required

**Response:** Endpoint listing with metadata

---

### 2. XP Information

**GET** `/api/gamification/xp`

Get user's current XP, level, and related information.

**Authentication:** Required

**Query Parameters:**
- `includeHistory` (boolean, default: false) - Include recent XP activity
- `days` (number, default: 7, range: 1-365) - Number of days to include in history

**Response:**
```json
{
  "data": {
    "xp": 1250,
    "level": 5,
    "nextLevelAt": 1600,
    "todayXp": 75,
    "totalXp": 1250,
    "levelInfo": {
      "currentLevel": 5,
      "currentXp": 1250,
      "xpForCurrentLevel": 800,
      "xpForNextLevel": 1600,
      "progress": 0.5625,
      "levelsToNext": 1,
      "totalXpForNextLevel": 1600
    },
    "history": [  // Only if includeHistory=true
      {
        "date": "2024-01-15",
        "xp": 75
      }
    ]
  }
}
```

---

### 3. Level Information

**GET** `/api/gamification/level`

Get detailed level information and progression.

**Authentication:** Required

**Query Parameters:**
- `includeHistory` (boolean, default: false) - Include level progression history

**Response:**
```json
{
  "data": {
    "currentLevel": 5,
    "currentXp": 1250,
    "xpForCurrentLevel": 800,
    "xpForNextLevel": 1600,
    "progress": 0.5625,
    "levelsToNext": 1,
    "totalXpForNextLevel": 1600,
    "recentLevelUps": [  // Only if includeHistory=true
      {
        "level": 5,
        "previousLevel": 4,
        "xpAtLevelUp": 800,
        "unlockedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 4. Streaks

**GET** `/api/gamification/streaks`

Get user's current streak information.

**Authentication:** Required

**Query Parameters:**
- `includeHistory` (boolean, default: false) - Include daily streak history
- `days` (number, default: 30, range: 1-100) - Number of days to include in history

**Response:**
```json
{
  "data": {
    "current": 7,
    "longest": 15,
    "lastDate": "2024-01-15T23:59:59.000Z",
    "isActive": true,
    "history": [  // Only if includeHistory=true
      {
        "date": "2024-01-15",
        "count": 3,
        "hasActivity": true
      }
    ]
  }
}
```

**POST** `/api/gamification/streaks`

Recalculate streaks from activity history.

**Authentication:** Required

**Request Body:**
```json
{
  "fromDate": "2024-01-01T00:00:00.000Z"  // Optional
}
```

**Response:**
```json
{
  "data": {
    "message": "Streaks recalculated successfully",
    "streaks": {
      "current": 7,
      "longest": 15,
      "lastDate": "2024-01-15T23:59:59.000Z"
    },
    "activitiesProcessed": 45,
    "corrections": [
      {
        "date": "2024-01-10",
        "previousValue": 0,
        "newValue": 1,
        "reason": "Found activity"
      }
    ]
  }
}
```

---

### 5. Achievements

**GET** `/api/gamification/achievements`

Get user's achievements and available ones.

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `status` (string, default: "all") - Filter: "all", "unlocked", "available", "locked"
- `category` (string, optional) - Filter by achievement category
- `rarity` (string, optional) - Filter by rarity: "common", "rare", "epic", "legendary"

**Response:**
```json
{
  "data": {
    "unlocked": [
      {
        "key": "first_task",
        "title": "First Steps",
        "description": "Complete your first task",
        "rarity": "common",
        "category": "milestones",
        "xpReward": 10,
        "unlockedAt": "2024-01-15T10:30:00.000Z",
        "isUnlocked": true
      }
    ],
    "available": [
      {
        "key": "task_master",
        "title": "Task Master",
        "description": "Complete 100 tasks",
        "rarity": "epic",
        "category": "milestones",
        "xpReward": 100,
        "isUnlocked": false,
        "progress": 0.45
      }
    ],
    "totalUnlocked": 5,
    "totalAvailable": 25,
    "recentUnlocks": [
      {
        "key": "week_warrior",
        "title": "Week Warrior",
        "unlockedAt": "2024-01-15T10:30:00.000Z",
        "isUnlocked": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "hasMore": true,
      "totalPages": 2
    }
  }
}
```

---

### 6. Themes

**GET** `/api/gamification/themes`

Get user's available themes.

**Authentication:** Required

**Query Parameters:**
- `status` (string, default: "all") - Filter: "all", "available", "locked", "future"

**Response:**
```json
{
  "data": {
    "themes": [
      {
        "id": "default",
        "name": "Default",
        "description": "Clean and simple theme",
        "requiredLevel": 1,
        "isUnlocked": true,
        "isEquipped": true,
        "previewColors": {
          "primary": "#3b82f6",
          "background": "#ffffff"
        }
      },
      {
        "id": "dark",
        "name": "Dark Mode",
        "description": "Easy on the eyes dark theme",
        "requiredLevel": 1,
        "isUnlocked": true,
        "isEquipped": false,
        "previewColors": {
          "primary": "#60a5fa",
          "background": "#1f2937"
        }
      }
    ],
    "equipped": "default",
    "unlockedCount": 3,
    "totalCount": 8,
    "futureUnlocks": [
      {
        "themeId": "neon",
        "requiredLevel": 10,
        "unlocksAt": "Level 10"
      }
    ]
  }
}
```

**PATCH** `/api/gamification/themes`

Update user's equipped theme.

**Authentication:** Required

**Request Body:**
```json
{
  "themeId": "dark"
}
```

**Response:**
```json
{
  "data": {
    "themeId": "dark",
    "previousTheme": "default",
    "message": "Theme updated successfully"
  },
  "message": "Theme equipped successfully"
}
```

---

### 7. Activity History

**GET** `/api/gamification/activity`

Get user's gamification activity history.

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `activityType` (string, optional) - Filter by activity type:
  - "task_completed"
  - "level_up"
  - "achievement_unlocked"
  - "streak_updated"
  - "theme_unlocked"
- `fromDate` (string, optional) - ISO date string to filter from
- `toDate` (string, optional) - ISO date string to filter to

**Response:**
```json
{
  "data": {
    "activities": [
      {
        "id": "65a1b2c3d4e5f6789012345",
        "activityType": "task_completed",
        "description": "Task completed: Review project proposal",
        "xpChange": 25,
        "metadata": {
          "taskId": "task_123",
          "taskTitle": "Review project proposal",
          "xpAwarded": 25,
          "difficulty": "medium"
        },
        "createdAt": "2024-01-15T14:30:00.000Z"
      }
    ],
    "total": 45,
    "hasMore": true,
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": true,
      "nextPage": 2
    },
    "filters": {
      "activityType": "task_completed",
      "fromDate": "2024-01-01T00:00:00.000Z",
      "toDate": "2024-01-15T23:59:59.000Z"
    }
  }
}
```

---

### 8. Snapshot (Polling Fallback)

**GET** `/api/gamification/snapshot`

Get current gamification snapshot for polling fallback mechanism.

**Authentication:** Required

**Response:**
```json
{
  "xp": 1250,
  "level": 5,
  "streak": 7,
  "recentAchievements": [
    {
      "key": "first_task",
      "title": "First Steps",
      "unlockedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "unlockedThemes": ["default", "dark", "neon"],
  "timestamp": "2024-01-15T15:30:00.000Z"
}
```

---

### 9. Real-time Events (SSE)

**GET** `/api/gamification/events`

Server-Sent Events stream for real-time gamification updates.

**Authentication:** Required

**Headers:**
- `Accept: text/event-stream`
- `Cache-Control: no-cache`

**Event Types:**
- `connected` - Initial connection confirmation
- `xpAwarded` - XP awarded for task completion
- `levelUp` - User leveled up
- `achievementUnlocked` - Achievement unlocked
- `streakUpdate` - Streak updated
- `themeUnlocked` - Theme unlocked

**Event Format:**
```
data: {"type":"xpAwarded","data":{"userId":"user123","xp":25,"taskId":"task456"},"timestamp":"2024-01-15T15:30:00.000Z"}
```

**HEAD** `/api/gamification/events`

Health check for SSE connection.

**Authentication:** Required

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_ID` | Invalid ID format provided |
| `INTERNAL_ERROR` | Server-side error occurred |
| `USER_NOT_FOUND` | User not found in database |
| `THEME_NOT_AVAILABLE` | Theme is locked or doesn't exist |
| `INVALID_DATE_FORMAT` | Date string is not valid ISO format |

## Rate Limiting

- Most endpoints have reasonable rate limiting
- XP awarding is idempotent and handles duplicate requests
- Real-time events have connection limits per user

## Caching

- GET endpoints include cache-control headers to prevent stale data
- Real-time updates should use SSE for immediate changes
- Polling fallback uses the snapshot endpoint

## Feature Flags

Some features might be behind feature flags:

- Leaderboard functionality (planned)
- Advanced achievement categories
- Custom theme creation
- Social sharing features

Check the `/api/gamification` index endpoint for current feature availability.