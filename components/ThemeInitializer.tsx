"use client";

import { useEffect } from "react";

/**
 * ThemeInitializer component
 * 
 * Runs on client-side mount to restore the user's previously selected theme
 * from localStorage. This prevents flash of default theme when page loads.
 */
export function ThemeInitializer() {
  useEffect(() => {
    // Get theme from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
      document.body.setAttribute("data-theme", savedTheme);
    }
  }, []);

  return null;
}
