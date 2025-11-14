"use client";

import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useGamification } from "@/components/providers/GamificationProvider";

interface ThemeCardProps {
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
  currentLevel: number;
  onSelect: (themeId: string) => Promise<void>;
  onPreview: (themeId: string) => void;
  onClearPreview: () => void;
}

function ThemeCard({
  id,
  name,
  description,
  requiredLevel,
  isUnlocked,
  isEquipped,
  previewColors,
  currentLevel,
  onSelect,
  onPreview,
  onClearPreview,
}: ThemeCardProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [showPreviewButton, setShowPreviewButton] = useState(false);

  const handleClick = async () => {
    if (!isUnlocked || isEquipped) return;

    setIsSelecting(true);
    try {
      await onSelect(id);
    } catch (error) {
      console.error("Failed to select theme:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isEquipped) {
        handleClick();
      }
    }
  };

  const handleMouseEnter = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion && isUnlocked && !isEquipped) {
      onPreview(id);
    } else if (prefersReducedMotion) {
      setShowPreviewButton(true);
    }
  };

  const handleMouseLeave = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      onClearPreview();
    }
    setShowPreviewButton(false);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(id);
  };

  const progressPercentage = Math.min((currentLevel / requiredLevel) * 100, 100);
  const shouldShowProgress = !isUnlocked && currentLevel > 0;

  return (
    <motion.div
      whileHover={isUnlocked && !isEquipped ? { scale: 1.02 } : undefined}
      className={`
        relative rounded-lg border-2 overflow-hidden transition-all duration-200
        ${isUnlocked ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-gray-300 bg-gray-50 dark:bg-gray-900/20"}
        ${isEquipped ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-0" : ""}
        ${!isUnlocked ? "cursor-not-allowed" : "cursor-pointer"}
        ${isSelecting ? "opacity-50" : ""}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isUnlocked && !isEquipped ? 0 : -1}
      role="button"
      aria-label={`${name} theme, ${isUnlocked ? "unlocked" : `locked - requires level ${requiredLevel}`}${isEquipped ? ", currently active" : ""}`}
      aria-pressed={isEquipped}
      aria-disabled={!isUnlocked}
    >
      {/* Preview Swatches */}
      {previewColors && (
        <div className="flex h-16 overflow-hidden">
          <div
            className="flex-1 transition-colors duration-200"
            style={{ backgroundColor: previewColors.primary }}
            aria-hidden="true"
          />
          <div
            className="flex-1 transition-colors duration-200"
            style={{ backgroundColor: previewColors.secondary }}
            aria-hidden="true"
          />
          <div
            className="flex-1 transition-colors duration-200"
            style={{ backgroundColor: previewColors.background }}
            aria-hidden="true"
          />
          <div
            className="flex-1 transition-colors duration-200"
            style={{ backgroundColor: previewColors.accent }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          </div>

          {isEquipped && (
            <div
              className="ml-2 text-xl"
              role="img"
              aria-label="Currently equipped"
            >
              ✓
            </div>
          )}
        </div>

        {/* Progress bar for locked themes */}
        {shouldShowProgress && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                Level {requiredLevel}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {currentLevel}/{requiredLevel}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                role="progressbar"
                aria-valuenow={Math.round(progressPercentage)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Level progress: ${Math.round(progressPercentage)}%`}
              />
            </div>
          </div>
        )}

        {/* Lock indicator */}
        {!isUnlocked && (
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              <span className="text-lg">🔒</span>
              <span>Requires Level {requiredLevel}</span>
            </span>
          </div>
        )}

        {/* Preview button for reduced motion */}
        {showPreviewButton && isUnlocked && !isEquipped && (
          <div className="mt-3">
            <button
              onClick={handlePreviewClick}
              className="w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-0"
              aria-label={`Preview ${name} theme`}
            >
              Preview
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ThemeGalleryProps {
  className?: string;
  maxColumns?: number;
}

export function ThemeGallery({ className = "", maxColumns = 3 }: ThemeGalleryProps) {
  const { currentTheme, themes, isLoading, error, setTheme, previewTheme, clearPreview } = useTheme();
  let currentLevel = 1;
  try {
    const gamification = useGamification();
    currentLevel = gamification?.level ?? 1;
  } catch {
    // If useGamification is not available, use default level
    currentLevel = 1;
  }

  const [selectedError, setSelectedError] = useState<string | null>(null);

  const handleSelectTheme = useCallback(
    async (themeId: string) => {
      setSelectedError(null);
      try {
        await setTheme(themeId);
      } catch (err) {
        setSelectedError(
          err instanceof Error ? err.message : "Failed to select theme"
        );
      }
    },
    [setTheme]
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading themes...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-950/20 p-6 ${className}`}>
        <h3 className="font-semibold text-red-700 dark:text-red-300">
          Failed to Load Themes
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {error.message}
        </p>
      </div>
    );
  }

  const gridColsClass = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
  }[maxColumns] || "lg:grid-cols-3";

  return (
    <div className={className}>
      {selectedError && (
        <div className="mb-4 rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {selectedError}
          </p>
        </div>
      )}

      <div
        className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${gridColsClass}`}
        role="region"
        aria-label="Theme gallery"
      >
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            id={theme.id}
            name={theme.name}
            description={theme.description}
            requiredLevel={theme.requiredLevel}
            isUnlocked={theme.isUnlocked}
            isEquipped={theme.isEquipped}
            previewColors={theme.previewColors}
            currentLevel={currentLevel}
            onSelect={handleSelectTheme}
            onPreview={previewTheme}
            onClearPreview={clearPreview}
          />
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No themes available at your current level.
          </p>
        </div>
      )}
    </div>
  );
}
