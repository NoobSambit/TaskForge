/**
 * Theme Unlock System
 * 
 * Defines available themes with their level requirements and rarity metadata.
 * Themes are unlocked as users progress through levels.
 */

export type ThemeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  rarity: ThemeRarity;
  cssVariables: Record<string, string>;
  previewColors?: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
}

/**
 * Available themes with their unlock requirements
 */
export const THEMES: Record<string, ThemeDefinition> = {
  // Base themes - always available
  default: {
    id: 'default',
    name: 'Default Light',
    description: 'Clean and minimal light theme',
    levelRequired: 1,
    rarity: 'common',
    cssVariables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      '--text-primary': '#1e293b',
      '--text-secondary': '#64748b',
      '--text-tertiary': '#94a3b8',
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#60a5fa',
      '--border-primary': '#e2e8f0',
      '--border-secondary': '#cbd5e1',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    },
    previewColors: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      background: '#1e293b',
      accent: '#3b82f6',
    },
  },
  dark: {
    id: 'dark',
    name: 'Default Dark',
    description: 'Dark mode for reduced eye strain',
    levelRequired: 1,
    rarity: 'common',
    cssVariables: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#cbd5e1',
      '--text-tertiary': '#94a3b8',
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#60a5fa',
      '--border-primary': '#334155',
      '--border-secondary': '#475569',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    },
    previewColors: {
      primary: '#0f172a',
      secondary: '#1e293b',
      background: '#f8fafc',
      accent: '#3b82f6',
    },
  },

  // Unlocked themes
  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Deep blue theme inspired by the ocean',
    levelRequired: 5,
    rarity: 'common',
    cssVariables: {
      '--bg-primary': '#f0f9ff',
      '--bg-secondary': '#e0f2fe',
      '--bg-tertiary': '#bae6fd',
      '--text-primary': '#0c4a6e',
      '--text-secondary': '#075985',
      '--text-tertiary': '#0284c7',
      '--accent-primary': '#0284c7',
      '--accent-secondary': '#38bdf8',
      '--border-primary': '#7dd3fc',
      '--border-secondary': '#38bdf8',
      '--success': '#059669',
      '--warning': '#d97706',
      '--error': '#dc2626',
    },
    previewColors: {
      primary: '#f0f9ff',
      secondary: '#e0f2fe',
      background: '#0c4a6e',
      accent: '#0284c7',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural green theme for a calming experience',
    levelRequired: 10,
    rarity: 'common',
    cssVariables: {
      '--bg-primary': '#f0fdf4',
      '--bg-secondary': '#dcfce7',
      '--bg-tertiary': '#bbf7d0',
      '--text-primary': '#14532d',
      '--text-secondary': '#166534',
      '--text-tertiary': '#15803d',
      '--accent-primary': '#16a34a',
      '--accent-secondary': '#4ade80',
      '--border-primary': '#86efac',
      '--border-secondary': '#4ade80',
      '--success': '#059669',
      '--warning': '#d97706',
      '--error': '#dc2626',
    },
    previewColors: {
      primary: '#f0fdf4',
      secondary: '#dcfce7',
      background: '#14532d',
      accent: '#16a34a',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm orange and pink tones',
    levelRequired: 15,
    rarity: 'rare',
    cssVariables: {
      '--bg-primary': '#fff7ed',
      '--bg-secondary': '#fed7aa',
      '--bg-tertiary': '#fdba74',
      '--text-primary': '#7c2d12',
      '--text-secondary': '#9a3412',
      '--text-tertiary': '#c2410c',
      '--accent-primary': '#ea580c',
      '--accent-secondary': '#fb923c',
      '--border-primary': '#fdba74',
      '--border-secondary': '#fb923c',
      '--success': '#059669',
      '--warning': '#d97706',
      '--error': '#dc2626',
    },
    previewColors: {
      primary: '#fff7ed',
      secondary: '#fed7aa',
      background: '#7c2d12',
      accent: '#ea580c',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Purple',
    description: 'Dark purple theme for night owls',
    levelRequired: 20,
    rarity: 'rare',
    cssVariables: {
      '--bg-primary': '#1e1b4b',
      '--bg-secondary': '#312e81',
      '--bg-tertiary': '#4c1d95',
      '--text-primary': '#e9d5ff',
      '--text-secondary': '#d8b4fe',
      '--text-tertiary': '#c084fc',
      '--accent-primary': '#8b5cf6',
      '--accent-secondary': '#a78bfa',
      '--border-primary': '#6d28d9',
      '--border-secondary': '#7c3aed',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    },
    previewColors: {
      primary: '#1e1b4b',
      secondary: '#312e81',
      background: '#e9d5ff',
      accent: '#8b5cf6',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Futuristic neon theme with electric colors',
    levelRequired: 30,
    rarity: 'epic',
    cssVariables: {
      '--bg-primary': '#0a0a0a',
      '--bg-secondary': '#1a1a1a',
      '--bg-tertiary': '#262626',
      '--text-primary': '#00ff88',
      '--text-secondary': '#00cc6a',
      '--text-tertiary': '#00994d',
      '--accent-primary': '#ff00ff',
      '--accent-secondary': '#ff66ff',
      '--border-primary': '#ff00ff',
      '--border-secondary': '#cc00cc',
      '--success': '#00ff88',
      '--warning': '#ffaa00',
      '--error': '#ff0066',
    },
    previewColors: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      background: '#00ff88',
      accent: '#ff00ff',
    },
  },
  golden: {
    id: 'golden',
    name: 'Golden Royale',
    description: 'Luxurious gold and cream theme',
    levelRequired: 40,
    rarity: 'epic',
    cssVariables: {
      '--bg-primary': '#fffbeb',
      '--bg-secondary': '#fef3c7',
      '--bg-tertiary': '#fde68a',
      '--text-primary': '#78350f',
      '--text-secondary': '#92400e',
      '--text-tertiary': '#b45309',
      '--accent-primary': '#f59e0b',
      '--accent-secondary': '#fbbf24',
      '--border-primary': '#fcd34d',
      '--border-secondary': '#fbbf24',
      '--success': '#059669',
      '--warning': '#d97706',
      '--error': '#dc2626',
    },
    previewColors: {
      primary: '#fffbeb',
      secondary: '#fef3c7',
      background: '#78350f',
      accent: '#f59e0b',
    },
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Clear',
    description: 'Elegant crystal and glass theme',
    levelRequired: 50,
    rarity: 'legendary',
    cssVariables: {
      '--bg-primary': '#fafafa',
      '--bg-secondary': '#f5f5f5',
      '--bg-tertiary': '#e5e5e5',
      '--text-primary': '#171717',
      '--text-secondary': '#404040',
      '--text-tertiary': '#737373',
      '--accent-primary': '#06b6d4',
      '--accent-secondary': '#22d3ee',
      '--border-primary': '#a5f3fc',
      '--border-secondary': '#67e8f9',
      '--success': '#059669',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    },
    previewColors: {
      primary: '#fafafa',
      secondary: '#f5f5f5',
      background: '#171717',
      accent: '#06b6d4',
    },
  },
  void: {
    id: 'void',
    name: 'Void Walker',
    description: 'Ultimate dark theme for the elite',
    levelRequired: 75,
    rarity: 'legendary',
    cssVariables: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0a0a',
      '--bg-tertiary': '#141414',
      '--text-primary': '#e5e5e5',
      '--text-secondary': '#a3a3a3',
      '--text-tertiary': '#737373',
      '--accent-primary': '#ec4899',
      '--accent-secondary': '#f472b6',
      '--border-primary': '#8b5cf6',
      '--border-secondary': '#a78bfa',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
    },
    previewColors: {
      primary: '#000000',
      secondary: '#0a0a0a',
      background: '#e5e5e5',
      accent: '#ec4899',
    },
  },
};

/**
 * Get all themes available at a specific level
 */
export function getThemesAvailableAtLevel(level: number): ThemeDefinition[] {
  return Object.values(THEMES).filter(theme => theme.levelRequired <= level);
}

/**
 * Get themes that become available at a specific level
 */
export function getThemesUnlockedAtLevel(level: number): ThemeDefinition[] {
  return Object.values(THEMES).filter(theme => theme.levelRequired === level);
}

/**
 * Check if a theme is available at a given level
 */
export function isThemeAvailableAtLevel(themeId: string, level: number): boolean {
  const theme = THEMES[themeId];
  return theme ? theme.levelRequired <= level : false;
}

/**
 * Get themes by rarity
 */
export function getThemesByRarity(rarity: ThemeRarity): ThemeDefinition[] {
  return Object.values(THEMES).filter(theme => theme.rarity === rarity);
}

/**
 * Get default themes (always available)
 */
export function getDefaultThemes(): ThemeDefinition[] {
  return Object.values(THEMES).filter(theme => theme.levelRequired === 1);
}