"use client";

import { useCallback, useEffect, useState } from "react";

interface Theme {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  isUnlocked: boolean;
  isEquipped: boolean;
  previewColors?: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
}

export interface UseThemeReturn {
  currentTheme: string;
  themes: Theme[];
  isLoading: boolean;
  error: Error | null;
  setTheme: (themeId: string) => Promise<void>;
  previewTheme: (themeId: string) => void;
  clearPreview: () => void;
}

export function useTheme(): UseThemeReturn {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchThemes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gamification/themes");
      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }
      const data = await response.json();
      setThemes(data.data.themes);
      setCurrentTheme(data.data.equipped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch themes on mount
  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  // Apply theme to body element
  const applyThemeToDOM = useCallback((themeId: string) => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.setAttribute("data-theme", themeId);

    // Also set the theme in body for backwards compatibility
    document.body.setAttribute("data-theme", themeId);

    // Store preference in localStorage
    localStorage.setItem("theme", themeId);
  }, []);

  // Apply current theme on load and when it changes
  useEffect(() => {
    if (!isLoading && currentTheme) {
      applyThemeToDOM(currentTheme);
    }
  }, [currentTheme, isLoading, applyThemeToDOM]);

  const setTheme = useCallback(
    async (themeId: string) => {
      try {
        const response = await fetch("/api/gamification/themes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ themeId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.data?.error || "Failed to update theme");
        }

        setCurrentTheme(themeId);
        applyThemeToDOM(themeId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        throw error;
      }
    },
    [applyThemeToDOM]
  );

  const previewTheme = useCallback((themeId: string) => {
    if (typeof document === "undefined") return;

    // Only apply preview if not already the current theme
    if (themeId !== currentTheme) {
      document.documentElement.setAttribute("data-theme-preview", themeId);
      document.body.setAttribute("data-theme-preview", themeId);
    }
  }, [currentTheme]);

  const clearPreview = useCallback(() => {
    if (typeof document === "undefined") return;

    document.documentElement.removeAttribute("data-theme-preview");
    document.body.removeAttribute("data-theme-preview");
  }, []);

  return {
    currentTheme,
    themes,
    isLoading,
    error,
    setTheme,
    previewTheme,
    clearPreview,
  };
}
