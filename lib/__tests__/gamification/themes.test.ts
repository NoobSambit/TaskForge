/**
 * Theme System Tests
 * 
 * Tests for theme definitions, unlocking logic, and API routes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  THEMES, 
  getThemesAvailableAtLevel, 
  getThemesUnlockedAtLevel, 
  isThemeAvailableAtLevel,
  getThemesByRarity,
  getDefaultThemes 
} from "@/lib/gamification/themes";

describe("Theme Definitions", () => {
  it("should have all required theme properties", () => {
    Object.values(THEMES).forEach(theme => {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('description');
      expect(theme).toHaveProperty('levelRequired');
      expect(theme).toHaveProperty('rarity');
      expect(theme).toHaveProperty('cssVariables');
      expect(typeof theme.levelRequired).toBe('number');
      expect(theme.levelRequired).toBeGreaterThan(0);
      expect(['common', 'rare', 'epic', 'legendary']).toContain(theme.rarity);
    });
  });

  it("should have unique theme IDs", () => {
    const themeIds = Object.keys(THEMES);
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(themeIds.length);
  });

  it("should have default themes available at level 1", () => {
    const defaultThemes = getDefaultThemes();
    expect(defaultThemes.length).toBeGreaterThan(0);
    defaultThemes.forEach(theme => {
      expect(theme.levelRequired).toBe(1);
    });
  });

  it("should have themes with increasing level requirements", () => {
    const themes = Object.values(THEMES);
    const levels = themes.map(t => t.levelRequired).sort((a, b) => a - b);
    
    // Check that we have a good distribution of levels
    expect(levels[0]).toBe(1); // Should start at level 1
    expect(levels[levels.length - 1]).toBeGreaterThan(50); // Should have high-level themes
  });

  it("should have proper CSS variables structure", () => {
    Object.values(THEMES).forEach(theme => {
      expect(theme.cssVariables).toHaveProperty('--bg-primary');
      expect(theme.cssVariables).toHaveProperty('--text-primary');
      expect(theme.cssVariables).toHaveProperty('--accent-primary');
      expect(theme.cssVariables).toHaveProperty('--success');
      expect(theme.cssVariables).toHaveProperty('--warning');
      expect(theme.cssVariables).toHaveProperty('--error');
    });
  });
});

describe("Theme Helper Functions", () => {
  it("should get themes available at specific level", () => {
    const level1Themes = getThemesAvailableAtLevel(1);
    const level5Themes = getThemesAvailableAtLevel(5);
    const level10Themes = getThemesAvailableAtLevel(10);

    expect(level1Themes.length).toBeLessThan(level5Themes.length);
    expect(level5Themes.length).toBeLessThan(level10Themes.length);

    // All themes at level 1 should have levelRequired <= 1
    level1Themes.forEach(theme => {
      expect(theme.levelRequired).toBeLessThanOrEqual(1);
    });

    // All themes at level 10 should have levelRequired <= 10
    level10Themes.forEach(theme => {
      expect(theme.levelRequired).toBeLessThanOrEqual(10);
    });
  });

  it("should get themes unlocked at specific level", () => {
    const level5Themes = getThemesUnlockedAtLevel(5);
    const level10Themes = getThemesUnlockedAtLevel(10);

    // All themes unlocked at level 5 should have levelRequired === 5
    level5Themes.forEach(theme => {
      expect(theme.levelRequired).toBe(5);
    });

    // All themes unlocked at level 10 should have levelRequired === 10
    level10Themes.forEach(theme => {
      expect(theme.levelRequired).toBe(10);
    });

    // Should be mutually exclusive
    const level5Ids = new Set(level5Themes.map(t => t.id));
    const level10Ids = new Set(level10Themes.map(t => t.id));
    const intersection = [...level5Ids].filter(id => level10Ids.has(id));
    expect(intersection.length).toBe(0);
  });

  it("should check theme availability at level", () => {
    expect(isThemeAvailableAtLevel('default', 1)).toBe(true);
    expect(isThemeAvailableAtLevel('dark', 1)).toBe(true);
    expect(isThemeAvailableAtLevel('ocean', 5)).toBe(true);
    expect(isThemeAvailableAtLevel('ocean', 4)).toBe(false);
    expect(isThemeAvailableAtLevel('cyberpunk', 30)).toBe(true);
    expect(isThemeAvailableAtLevel('cyberpunk', 29)).toBe(false);
    expect(isThemeAvailableAtLevel('nonexistent', 10)).toBe(false);
  });

  it("should get themes by rarity", () => {
    const commonThemes = getThemesByRarity('common');
    const rareThemes = getThemesByRarity('rare');
    const epicThemes = getThemesByRarity('epic');
    const legendaryThemes = getThemesByRarity('legendary');

    expect(commonThemes.length).toBeGreaterThan(0);
    expect(rareThemes.length).toBeGreaterThan(0);
    expect(epicThemes.length).toBeGreaterThan(0);
    expect(legendaryThemes.length).toBeGreaterThan(0);

    // All themes in each category should have the correct rarity
    commonThemes.forEach(theme => expect(theme.rarity).toBe('common'));
    rareThemes.forEach(theme => expect(theme.rarity).toBe('rare'));
    epicThemes.forEach(theme => expect(theme.rarity).toBe('epic'));
    legendaryThemes.forEach(theme => expect(theme.rarity).toBe('legendary'));

    // Total should match all themes
    const totalThemes = commonThemes.length + rareThemes.length + epicThemes.length + legendaryThemes.length;
    expect(totalThemes).toBe(Object.keys(THEMES).length);
  });
});

describe("Theme Level Progression", () => {
  it("should have a reasonable distribution of themes across levels", () => {
    const levelCounts = new Map<number, number>();
    
    Object.values(THEMES).forEach(theme => {
      const count = levelCounts.get(theme.levelRequired) || 0;
      levelCounts.set(theme.levelRequired, count + 1);
    });

    // Should have themes at various levels
    expect(levelCounts.size).toBeGreaterThan(5);

    // Level 1 should have multiple themes (default themes)
    expect(levelCounts.get(1)).toBeGreaterThanOrEqual(2);

    // Should have some high-level themes
    const maxLevel = Math.max(...levelCounts.keys());
    expect(maxLevel).toBeGreaterThan(50);
  });

  it("should increase rarity with level requirements", () => {
    const themesByLevel = Array.from(Object.values(THEMES))
      .sort((a, b) => a.levelRequired - b.levelRequired);

    // Generally, higher level themes should have higher rarity
    // This is more of a design guideline test
    const earlyThemes = themesByLevel.slice(0, Math.floor(themesByLevel.length / 2));
    const lateThemes = themesByLevel.slice(Math.floor(themesByLevel.length / 2));

    const earlyRarityScore = earlyThemes.reduce((score, theme) => {
      const rarityValue = { common: 1, rare: 2, epic: 3, legendary: 4 };
      return score + rarityValue[theme.rarity];
    }, 0) / earlyThemes.length;

    const lateRarityScore = lateThemes.reduce((score, theme) => {
      const rarityValue = { common: 1, rare: 2, epic: 3, legendary: 4 };
      return score + rarityValue[theme.rarity];
    }, 0) / lateThemes.length;

    expect(lateRarityScore).toBeGreaterThanOrEqual(earlyRarityScore);
  });
});