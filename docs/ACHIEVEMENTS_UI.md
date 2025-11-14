# Achievements UI Components

This document describes the achievement display and notification system built for the gamification feature.

## Overview

The achievements UI consists of three main components:

1. **Toast System** - Real-time notifications for achievement unlocks
2. **AchievementBadge** - Individual achievement display card
3. **AchievementsGrid** - Grid layout with filtering and real-time updates

## Components

### Toast System

#### Toast Component (`components/ui/Toast.tsx`)

Displays individual toast notifications with rarity-based styling and auto-dismiss functionality.

**Features:**
- Rarity-based color schemes (common, rare, epic, legendary)
- Auto-dismiss with configurable duration
- Manual close button
- Reduced-motion support (instant fades vs. animations)
- Accessibility attributes (role="alert", aria-live)

**Props:**
```typescript
interface ToastData {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  rarity?: AchievementRarity;
  duration?: number; // milliseconds, 0 = no auto-dismiss
}
```

**Usage:**
```tsx
<Toast
  id="toast-1"
  title="Achievement Unlocked"
  description="Complete your first task"
  icon="🎯"
  rarity="common"
  duration={5000}
  onClose={(id) => console.log(`Toast ${id} closed`)}
/>
```

#### ToastProvider (`components/providers/ToastProvider.tsx`)

Context provider for managing toast queue and lifecycle.

**Features:**
- Queue management with configurable max toasts
- Automatic overflow handling (FIFO)
- Deduplication support
- Global toast API via `useToast` hook

**Props:**
```typescript
interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number; // default: 5
}
```

**Usage:**
```tsx
import { ToastProvider, useToast } from "@/components/providers";

function App() {
  return (
    <ToastProvider maxToasts={5}>
      <YourApp />
    </ToastProvider>
  );
}

function SomeComponent() {
  const { addToast, removeToast, clearAll } = useToast();
  
  const showNotification = () => {
    addToast({
      title: "Achievement Unlocked",
      icon: "🏆",
      rarity: "legendary",
      duration: 6000,
    });
  };
}
```

### AchievementBadge Component

**Location:** `components/gamification/AchievementBadge.tsx`

Displays individual achievements with locked/unlocked states, progress tracking, and rarity styling.

**Features:**
- Locked vs. unlocked visual differentiation
- Rarity-based color schemes with glow effects
- Progress bar for partially completed achievements
- Accessibility labels and keyboard navigation
- Optional click handler for detail view
- Reduced-motion support

**Props:**
```typescript
interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  isUnlocked: boolean;
  unlockedAt?: string; // ISO date string
  progress?: number; // 0-1 for locked achievements
  xpReward?: number;
  category?: string;
  onClick?: () => void;
  className?: string;
}
```

**Visual States:**
- **Unlocked:** Full color, shadow glow, displays unlock date
- **Locked:** Grayscale filter, reduced opacity, shows progress bar if progress > 0
- **Progress:** Animated progress bar with percentage display

**Usage:**
```tsx
<AchievementBadge
  title="Task Master"
  description="Complete 25 tasks"
  icon="🏆"
  rarity="rare"
  isUnlocked={false}
  progress={0.6}
  xpReward={100}
  category="tasks"
  onClick={() => showDetails()}
/>
```

### AchievementsGrid Component

**Location:** `components/gamification/AchievementsGrid.tsx`

Grid layout for displaying all achievements with real-time updates and filtering.

**Features:**
- Responsive grid (1 col mobile → 4 cols desktop)
- Real-time achievement unlock notifications
- Status, category, and rarity filters
- Progress stats with visual progress bar
- Modal detail view for achievements
- SSE integration for live updates
- Loading and error states
- Accessibility support (ARIA labels, keyboard navigation)

**Props:**
```typescript
interface AchievementsGridProps {
  initialAchievements?: AchievementData[];
  className?: string;
}
```

**Data Format:**
```typescript
interface AchievementData {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-1
}
```

**Usage:**
```tsx
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid";
import { ToastProvider } from "@/components/providers";

export default function AchievementsPage() {
  return (
    <ToastProvider>
      <AchievementsGrid />
    </ToastProvider>
  );
}
```

## Real-Time Updates

The achievements grid automatically connects to the gamification event stream via `useGamificationStream` hook.

**Events Handled:**
- `achievementUnlocked` - Updates grid and shows toast notification

**Flow:**
1. User completes an action that unlocks an achievement
2. Server emits `achievementUnlocked` event via SSE
3. Grid receives event and updates achievement state
4. Toast notification appears with achievement details
5. Grid re-renders to show newly unlocked achievement

**Deduplication:**
- Toast notifications are deduplicated by achievement key
- Prevents duplicate toasts if server sends multiple events

## Filtering

The grid supports three filter types:

### Status Filter
- **All** - Show all achievements
- **Unlocked** - Only show unlocked achievements
- **Locked** - Only show locked achievements

### Category Filter
- Dynamically populated from available achievements
- Categories include: tasks, progression, streaks, special, etc.

### Rarity Filter
- **All Rarities**
- **Common** - Gray color scheme
- **Rare** - Blue color scheme
- **Epic** - Purple color scheme
- **Legendary** - Gold/amber color scheme

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Enter and Space keys trigger achievement detail view
- Tab navigation follows logical order
- Focus indicators on all interactive elements

### Screen Readers
- Semantic HTML (article, button, dialog roles)
- ARIA labels for all meaningful content
- Progress bars with aria-valuenow/min/max
- Live regions for dynamic content (toasts, loading states)

### Reduced Motion
- Respects `prefers-reduced-motion` media query
- Animations disabled/simplified when preference set
- Toasts use instant fades instead of spring animations
- Progress bars use simple transitions

### Color Contrast
- All text meets WCAG AA contrast requirements
- Rarity colors tested for accessibility
- Dark mode support with appropriate contrast

## Styling

All components use Tailwind CSS with the following conventions:

### Rarity Colors
```typescript
const rarityColors = {
  common: "gray",   // border-gray-400, bg-gray-50
  rare: "blue",     // border-blue-400, bg-blue-50
  epic: "purple",   // border-purple-400, bg-purple-50
  legendary: "amber" // border-amber-400, bg-amber-50
};
```

### Responsive Breakpoints
- Mobile: 1 column
- Small (sm): 2 columns
- Large (lg): 3 columns
- Extra Large (xl): 4 columns

## Testing

Comprehensive test coverage for all components:

### Toast Tests (`components/ui/__tests__/Toast.test.tsx`)
- Render title and description
- Apply rarity styles
- Auto-dismiss functionality
- Manual close button
- Accessibility attributes

### ToastProvider Tests (`components/providers/__tests__/ToastProvider.test.tsx`)
- Add/remove toasts
- Max toasts limit
- Clear all functionality
- Context requirement

### AchievementBadge Tests (`components/gamification/__tests__/AchievementBadge.test.tsx`)
- Locked/unlocked states
- Progress display
- Rarity styling
- Click handlers
- Keyboard navigation
- Accessibility labels

### AchievementsGrid Tests (`components/gamification/__tests__/AchievementsGrid.test.tsx`)
- Initial render with data
- API fetching
- Filter functionality (status, category, rarity)
- Real-time event handling
- Toast deduplication
- Modal interactions
- Accessibility attributes

**Run Tests:**
```bash
npm test -- AchievementBadge
npm test -- AchievementsGrid
npm test -- Toast
npm test -- ToastProvider
```

## API Integration

The grid fetches data from `/api/gamification/achievements`:

**Request:**
```http
GET /api/gamification/achievements?page=1&limit=20&status=all&category=tasks&rarity=rare
```

**Response:**
```typescript
{
  data: {
    unlocked: UserAchievement[],
    available: Achievement[],
    totalUnlocked: number,
    totalAvailable: number,
    recentUnlocks: UserAchievement[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      hasMore: boolean,
      totalPages: number
    }
  }
}
```

See [Gamification API Documentation](./gamification-api.md) for full API details.

## Example Page

A complete example page is available at:
- **File:** `app/(dashboard)/achievements/page.tsx`
- **Route:** `/achievements`
- **Description:** Full-featured achievements page with grid and toast notifications

## Future Enhancements

Potential improvements for future iterations:

1. **Search Functionality** - Search achievements by title/description
2. **Sort Options** - Sort by date unlocked, rarity, XP reward
3. **Share Achievements** - Social sharing for unlocked achievements
4. **Achievement Details** - Expanded detail view with completion tips
5. **Collections** - Group achievements into collections/sets
6. **Animations** - Unlock animations with confetti/particle effects
7. **Sound Effects** - Optional audio feedback for unlocks
8. **Progress Notifications** - Show progress updates before unlock
9. **Favorites** - Pin favorite achievements to top
10. **Comparison** - Compare achievements with other users

## Troubleshooting

### Toasts Not Appearing
- Ensure `ToastProvider` wraps your component tree
- Check that `useGamificationStream` is connecting properly
- Verify SSE endpoint is accessible

### Achievements Not Loading
- Check `/api/gamification/achievements` endpoint
- Verify authentication is working
- Check browser console for errors

### Filters Not Working
- Ensure achievement data has proper category/rarity fields
- Check that filter state is updating (React DevTools)

### Accessibility Issues
- Test with keyboard navigation only
- Use screen reader (NVDA, JAWS, VoiceOver)
- Check reduced-motion preference
- Validate with aXe DevTools

## Related Documentation

- [Gamification API](./gamification-api.md)
- [Real-Time Gamification](./REALTIME_GAMIFICATION.md)
- [Gamification Overview](./GAMIFICATION.md)
