# Theme Gallery UI

## Overview

The Theme Gallery UI provides users with an interactive, accessible interface to browse, preview, and activate themes they have unlocked. It displays all available themes with visual indicators for lock status, level requirements, and preview swatches.

## Features

### User Interface Components

#### ThemeGallery Component
The main component that displays a grid of available and locked themes with comprehensive accessibility support.

**Props:**
- `className?: string` - Additional CSS classes for styling
- `maxColumns?: number` - Number of columns in the grid (default: 3)

**Features:**
- Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
- Loading state with animated spinner
- Error handling with user-friendly messages
- Empty state message when no themes available
- Comprehensive keyboard navigation support
- Screen reader optimization with ARIA labels

#### ThemeCard Component
Individual theme card component displayed within the gallery.

**Props:**
- `id: string` - Theme identifier
- `name: string` - Display name
- `description: string` - User-facing description
- `requiredLevel: number` - Level requirement to unlock
- `isUnlocked: boolean` - Whether the user has unlocked this theme
- `isEquipped: boolean` - Whether this is the currently active theme
- `previewColors?: object` - Color swatches for preview
- `currentLevel: number` - User's current level
- `onSelect: (themeId: string) => Promise<void>` - Theme selection handler
- `onPreview: (themeId: string) => void` - Theme preview handler
- `onClearPreview: () => void` - Clear preview handler

**Features:**
- Visual color swatches (4-color preview strips)
- Lock indicator (🔒) for locked themes
- Checkmark (✓) for currently equipped theme
- Progress bar showing level progression for locked themes
- Hover preview support (with accessibility fallback for reduced motion)
- Preview button for users with reduced motion preference
- Keyboard accessible (Enter/Space to select)
- Focus indicators for keyboard navigation
- ARIA attributes for screen readers

### useTheme Hook

Custom React hook for managing theme state and operations.

```typescript
const {
  currentTheme,        // Currently active theme ID
  themes,              // Array of all themes with unlock status
  isLoading,           // Loading state
  error,               // Error object if fetch failed
  setTheme,            // Async function to change theme
  previewTheme,        // Preview a theme temporarily
  clearPreview,        // Clear theme preview
} = useTheme();
```

**Functionality:**
- Fetches theme data from `/api/gamification/themes` on mount
- Applies theme by setting `data-theme` attribute on HTML and body elements
- Persists selection via `/api/gamification/themes` PATCH endpoint
- Stores theme preference in localStorage for instant restoration on page reload
- Supports temporary preview without changing the active theme
- Error handling and reporting

### CSS Variables System

Each theme defines a complete set of CSS variables for consistent styling across the application.

**Core CSS Variables:**
```css
--bg-primary          /* Primary background color */
--bg-secondary        /* Secondary background color */
--bg-tertiary         /* Tertiary background color */
--text-primary        /* Primary text color */
--text-secondary      /* Secondary text color */
--text-tertiary       /* Tertiary text color (lighter) */
--accent-primary      /* Primary accent color */
--accent-secondary    /* Secondary accent color */
--border-primary      /* Primary border color */
--border-secondary    /* Secondary border color */
--success             /* Success state color */
--warning             /* Warning state color */
--error               /* Error state color */
```

**Theme Application:**
```css
[data-theme="theme-id"] {
  --bg-primary: #value;
  --text-primary: #value;
  /* ... more variables ... */
}
```

**Accessibility Considerations:**
- All themes maintain WCAG AA contrast ratios
- Color choices support color-blind users
- Neon and high-contrast themes optimized for visibility
- Text color adjusts based on theme background for readability

### Accessibility Features

#### Keyboard Navigation
- Tab to navigate between theme cards
- Enter or Space to select/equip a theme
- Arrow keys supported in grid layout
- Clear focus indicators for keyboard users
- Locked themes are skipped in tab order (tabIndex="-1")
- Focus management maintained during theme changes

#### Screen Reader Support
- ARIA labels describe theme status and requirements
- `aria-pressed` indicates equipped themes
- `aria-disabled` indicates locked themes
- Progress bars include aria-valuenow, aria-valuemin, aria-valuemax
- Error messages properly announced
- Loading and empty states communicated

#### Motion Preferences
- Respects `prefers-reduced-motion` media query
- Disables animations for users with motion sensitivity
- Provides alternative "Preview" button for hover effect fallback
- Smooth color transitions without animation for accessibility
- No auto-animations on load or interaction

#### Color Contrast
All themes tested for:
- WCAG AA minimum 4.5:1 ratio for text
- 3:1 ratio for UI components
- Support for different color vision types
- High contrast modes for accessibility

## Integration Guide

### Basic Setup

1. **Wrap your app with GamificationProvider:**
```tsx
import { GamificationProvider } from "@/components/providers/GamificationProvider";

export default function App() {
  return (
    <GamificationProvider>
      <YourApp />
    </GamificationProvider>
  );
}
```

2. **Add ThemeInitializer to your layout:**
```tsx
import { ThemeInitializer } from "@/components/ThemeInitializer";

export default function RootLayout({ children }) {
  return (
    <html data-theme="default">
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
```

3. **Use ThemeGallery component:**
```tsx
import { ThemeGallery } from "@/components/gamification";

export default function SettingsPage() {
  return (
    <section>
      <h2>Themes</h2>
      <ThemeGallery maxColumns={3} />
    </section>
  );
}
```

### Using the useTheme Hook

```tsx
"use client";

import { useTheme } from "@/hooks/useTheme";

export function CustomThemeSwitcher() {
  const { currentTheme, themes, setTheme, previewTheme, clearPreview } = useTheme();

  if (!themes.length) {
    return <div>No themes available</div>;
  }

  return (
    <select value={currentTheme} onChange={(e) => setTheme(e.target.value)}>
      {themes
        .filter((t) => t.isUnlocked)
        .map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
    </select>
  );
}
```

### Styling with Theme Variables

Use CSS variables to style components that adapt to the current theme:

```css
.my-component {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-primary);
  padding: 1rem;
}

.my-component.highlight {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.my-component.error {
  color: var(--error);
  border-color: var(--error);
}
```

## API Integration

### GET /api/gamification/themes
Fetch available themes for the current user.

**Query Parameters:**
- `status?: "all" | "available" | "locked" | "future"` - Filter themes (default: "all")

**Response:**
```json
{
  "data": {
    "themes": [
      {
        "id": "default",
        "name": "Default Light",
        "description": "...",
        "requiredLevel": 1,
        "isUnlocked": true,
        "isEquipped": true,
        "previewColors": { ... }
      },
      ...
    ],
    "equipped": "default",
    "unlockedCount": 3,
    "totalCount": 10,
    "futureUnlocks": [
      {
        "level": 5,
        "themes": [{ "id": "ocean", "name": "Ocean Depths", "levelRequired": 5 }]
      }
    ]
  }
}
```

### PATCH /api/gamification/themes
Equip a theme for the current user.

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
  }
}
```

## Testing

### Component Testing

Test themes gallery functionality:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeGallery } from "@/components/gamification";
import { GamificationProvider } from "@/components/providers/GamificationProvider";

test("renders available themes", async () => {
  render(
    <GamificationProvider initialData={{ level: 5, xp: 250 }}>
      <ThemeGallery />
    </GamificationProvider>
  );

  await waitFor(() => {
    expect(screen.getByText("Default Light")).toBeInTheDocument();
    expect(screen.getByText("Ocean Depths")).toBeInTheDocument();
  });
});

test("allows equipping unlocked themes", async () => {
  render(
    <GamificationProvider initialData={{ level: 5, xp: 250 }}>
      <ThemeGallery />
    </GamificationProvider>
  );

  const themeButton = screen.getByRole("button", { name: /Ocean/ });
  fireEvent.click(themeButton);

  await waitFor(() => {
    expect(localStorage.getItem("theme")).toBe("ocean");
  });
});
```

### Hook Testing

Test theme hook behavior:
```tsx
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

test("applies theme to DOM on change", async () => {
  const { result } = renderHook(() => useTheme());

  await act(async () => {
    await result.current.setTheme("dark");
  });

  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(localStorage.getItem("theme")).toBe("dark");
});
```

## Troubleshooting

### Themes not persisting between reloads
- Ensure `ThemeInitializer` is in your layout
- Check localStorage is enabled in browser
- Verify API endpoint returns correct equipped theme

### Colors not applying
- Check that `data-theme` attribute is set on HTML element
- Verify CSS variables are defined for the theme
- Check browser DevTools for CSS variable resolution

### Accessibility issues
- Test with keyboard navigation (Tab, Enter, Space)
- Use screen reader (NVDA, JAWS, VoiceOver)
- Check contrast ratios in DevTools
- Test with `prefers-reduced-motion: reduce` enabled

## Performance Considerations

- Theme gallery uses memoization for theme cards
- CSS variables are native browser feature (no JS overhead)
- Framer Motion respects reduced-motion preference
- Theme fetching is cached at API level (check headers)
- Local theme changes don't require full page reload

## Browser Support

- All modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties (IE not supported)
- localStorage for persistence
- Media queries for accessibility features
- ARIA for assistive technology

## Future Enhancements

- Theme preview modal/sidebar
- Custom theme creation
- Seasonal/event-based themes
- Theme transition animations
- Export/import theme preferences
- Social sharing of theme preferences
