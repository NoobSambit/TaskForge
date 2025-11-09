# Theme Unlock System

## Overview

The Theme Unlock System provides a gamification layer that rewards users with new visual themes as they progress through levels. Themes are unlocked automatically when users reach specific levels, providing visual progression and customization options.

## Features

- **Level-based unlocking**: Themes unlock at specific levels (5, 10, 15, 20, 30, 40, 50, 75)
- **Rarity system**: Themes are categorized as common, rare, epic, or legendary
- **Automatic unlocking**: Themes unlock automatically during level-up events
- **Activity logging**: All theme unlocks are logged in the ActivityLog
- **API endpoints**: RESTful API for theme management
- **Migration support**: Automatic initialization for existing users

## Theme Definitions

### Available Themes

| Theme ID | Level Required | Rarity | Description |
|----------|---------------|--------|-------------|
| `default` | 1 | common | Clean and minimal light theme |
| `dark` | 1 | common | Dark mode for reduced eye strain |
| `ocean` | 5 | common | Deep blue theme inspired by the ocean |
| `forest` | 10 | common | Natural green theme for a calming experience |
| `sunset` | 15 | rare | Warm orange and pink tones |
| `midnight` | 20 | rare | Dark purple theme for night owls |
| `cyberpunk` | 30 | epic | Futuristic neon theme with electric colors |
| `golden` | 40 | epic | Luxurious gold and cream theme |
| `crystal` | 50 | legendary | Elegant crystal and glass theme |
| `void` | 75 | legendary | Ultimate dark theme for the elite |

### Theme Structure

Each theme includes:

```typescript
interface ThemeDefinition {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // User-facing description
  levelRequired: number;          // Level required to unlock
  rarity: ThemeRarity;           // common/rare/epic/legendary
  cssVariables: Record<string, string>; // CSS custom properties
  previewColors?: {               // Optional preview colors
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
}
```

## User Schema Extensions

The User model has been extended with theme-related fields:

```typescript
interface IUser {
  // ... existing fields
  theme: string;                  // Currently active theme (default: "default")
  unlockedThemes: string[];       // Array of unlocked theme IDs
  // ... existing fields
}
```

### Default Values

- `theme`: `"default"`
- `unlockedThemes`: `["default", "dark"]` (both available at level 1)
- Indexed fields: `theme` and `preferences.leaderboardOptIn`

## API Endpoints

### GET /api/themes

Fetch theme information for the authenticated user.

**Query Parameters:**
- `status` (optional): `"all"` | `"available"` | `"locked"` | `"future"`
  - `"all"` (default): Return comprehensive theme status
  - `"available"`: Return only unlocked themes
  - `"future"`: Return themes that will be unlocked at future levels

**Response (status=all):**
```json
{
  "currentTheme": "ocean",
  "userLevel": 5,
  "unlocked": [
    {
      "id": "default",
      "name": "Default Light",
      "description": "Clean and minimal light theme",
      "levelRequired": 1,
      "rarity": "common",
      "cssVariables": { ... }
    }
  ],
  "available": [...],  // Unlocked at current level but not claimed
  "locked": [...]      // Higher level requirements
}
```

**Response (status=available):**
```json
{
  "themes": [...]  // Array of unlocked theme definitions
}
```

**Response (status=future):**
```json
{
  "futureUnlocks": [
    {
      "level": 10,
      "themes": [...]  // Themes unlocked at level 10
    }
  ]
}
```

### PUT /api/themes/[themeId]

Update the user's active theme.

**Parameters:**
- `themeId`: The theme ID to activate

**Response (success):**
```json
{
  "success": true,
  "theme": "ocean",
  "user": {
    "id": "user123",
    "theme": "ocean",
    "unlockedThemes": ["default", "dark", "ocean"]
  }
}
```

**Error Responses:**
- `401`: Unauthorized (not authenticated)
- `403`: Theme not unlocked
- `404`: Theme does not exist
- `400`: Invalid theme ID
- `500`: Server error

## Level-Up Integration

Theme unlocking is automatically integrated into the level-up system:

1. **Level-up detection**: When a user levels up, the system checks for new themes
2. **Theme unlocking**: Eligible themes are added to `unlockedThemes`
3. **Activity logging**: Each unlock creates an ActivityLog entry with `activityType: "themeUnlock"`
4. **Event emission**: Theme unlocks are included in level-up event metadata

### ActivityLog Structure

```typescript
{
  userId: string,
  activityType: "themeUnlock",
  metadata: {
    themeId: string,
    themeName: string,
    themeRarity: ThemeRarity,
    levelUnlocked: number
  },
  xpEarned: 0,
  date: Date
}
```

## Service Functions

### Core Functions

- `unlockThemesForLevelUp(userId, newLevel, previousLevel)`: Unlock themes for level-up
- `getAvailableThemesForUser(userId)`: Get user's unlocked themes
- `updateUserTheme(userId, themeId)`: Update active theme with validation
- `getUserThemeStatus(userId)`: Get comprehensive theme status
- `initializeThemesForUser(userId)`: Setup default themes for new users
- `getFutureThemeUnlocks(userId)`: Get future unlock preview

### Helper Functions

- `getThemesAvailableAtLevel(level)`: All themes available at or below level
- `getThemesUnlockedAtLevel(level)`: Themes that unlock exactly at level
- `isThemeAvailableAtLevel(themeId, level)`: Check theme availability
- `getThemesByRarity(rarity)`: Filter themes by rarity
- `getDefaultThemes()`: Get level 1 themes

## Migration

### Theme Initialization Migration

Run the migration to ensure existing users have proper theme defaults:

```bash
# Preview changes
npm run migrate:themes:dry-run

# Apply changes
npm run migrate:themes
```

The migration:
1. Finds all users without proper theme configuration
2. Ensures `theme` is set (defaults to "default")
3. Ensures `unlockedThemes` includes ["default", "dark"]
4. Updates users atomically
5. Provides detailed progress reporting

## Error Handling

### Theme Unlock Errors

- **User not found**: Throws `Error("User not found: {userId}")`
- **Theme not unlocked**: Throws `Error('Theme "{themeId}" is not unlocked for user {userId}')`
- **Invalid theme**: Throws `Error('Theme "{themeId}" does not exist')`

### API Error Responses

- **403 Forbidden**: Theme not unlocked (with user-friendly message)
- **404 Not Found**: Theme does not exist
- **400 Bad Request**: Invalid theme ID
- **500 Internal Server Error**: Database or system errors

## Testing

### Unit Tests

- Theme definitions and helper functions
- Theme unlock service logic
- User theme management
- Level-up integration

### API Tests

- Authentication requirements
- Theme fetching with different status parameters
- Theme updates with validation
- Error handling for all edge cases

### Test Coverage

```bash
# Run theme-related tests
npm test -- lib/__tests__/gamification/themes.test.ts
npm test -- app/api/themes/__tests__/route.test.ts
```

## Usage Examples

### Frontend Integration

```typescript
// Fetch available themes
const response = await fetch('/api/themes?status=available');
const { themes } = await response.json();

// Update active theme
const updateResponse = await fetch('/api/themes/ocean', {
  method: 'PUT',
});
const { success, theme } = await updateResponse.json();
```

### Server-side Usage

```typescript
import { 
  getUserThemeStatus, 
  updateUserTheme 
} from "@/lib/gamification/themeUnlock";

// Get user's theme status
const status = await getUserThemeStatus(userId);

// Update theme (with validation)
await updateUserTheme(userId, 'ocean');
```

## Integration with Existing Gamification

The theme system integrates seamlessly with the existing gamification infrastructure:

- **XP Engine**: Unchanged, continues to power level progression
- **Level System**: Enhanced with theme unlock hooks
- **Activity Log**: Extended with theme unlock activity type
- **Event System**: Theme unlocks included in level-up events
- **Achievement System**: Can reference theme unlocks in predicates

## CSS Implementation

Themes use CSS custom properties for easy integration:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --accent-primary: #3b82f6;
  /* ... more variables */
}
```

To apply a theme, update the CSS variables dynamically:

```javascript
const theme = THEMES[themeId];
Object.entries(theme.cssVariables).forEach(([property, value]) => {
  document.documentElement.style.setProperty(property, value);
});
```

## Future Enhancements

### Potential Features

- **Seasonal themes**: Limited-time themes for events
- **Achievement-based themes**: Unlock through specific achievements
- **Custom themes**: User-created color schemes
- **Theme sharing**: Export/import theme configurations
- **Preview system**: Live theme preview before activation

### Extensions

- **Theme categories**: Group themes by style (minimal, vibrant, professional)
- **Accessibility themes**: High contrast and colorblind-friendly options
- **Brand themes**: Company/team-branded themes
- **Dynamic themes**: Time-based or location-aware themes

## Security Considerations

- **Authentication**: All theme operations require authenticated users
- **Authorization**: Users can only activate themes they've unlocked
- **Validation**: Theme IDs are validated against the theme registry
- **Rate limiting**: Consider rate limiting theme update endpoints
- **Input sanitization**: Theme IDs are sanitized before processing

## Performance Considerations

- **Database indexing**: `theme` field is indexed for efficient queries
- **Caching**: Theme definitions are static and can be cached
- **Atomic operations**: Theme updates use atomic MongoDB operations
- **Batch processing**: Migration processes users in batches to avoid timeouts