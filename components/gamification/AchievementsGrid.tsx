"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AchievementBadge } from "./AchievementBadge";
import { useToast } from "@/components/providers";
import { useGamificationStream } from "@/hooks/useGamificationStream";
import type { AchievementRarity } from "@/types/gamification";
import type { AchievementUnlockedEvent } from "@/lib/gamification/events";

interface AchievementData {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: AchievementRarity;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
}

interface AchievementsGridProps {
  initialAchievements?: AchievementData[];
  className?: string;
}

type FilterStatus = "all" | "unlocked" | "locked";

export function AchievementsGrid({
  initialAchievements = [],
  className = "",
}: AchievementsGridProps) {
  const [achievements, setAchievements] = useState<AchievementData[]>(
    initialAchievements
  );
  const [isLoading, setIsLoading] = useState(!initialAchievements.length);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<AchievementRarity | "all">(
    "all"
  );
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementData | null>(null);

  const { addToast } = useToast();
  const processedUnlocks = useMemo(() => new Set<string>(), []);

  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/gamification/achievements");
      if (!response.ok) {
        throw new Error("Failed to fetch achievements");
      }
      const data = await response.json();

      const formattedAchievements: AchievementData[] =
        data.data?.available?.map((achievement: any) => ({
          key: achievement.key,
          title: achievement.name || achievement.title || achievement.key,
          description: achievement.description || "",
          icon: achievement.icon || "🏆",
          category: achievement.category || "general",
          xpReward: achievement.xpReward || 0,
          rarity: achievement.rarity || "common",
          isUnlocked: achievement.isUnlocked || false,
          unlockedAt: achievement.unlockedAt,
          progress: achievement.progress || 0,
        })) || [];

      setAchievements(formattedAchievements);
    } catch (err) {
      console.error("Error fetching achievements:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialAchievements.length) {
      fetchAchievements();
    }
  }, [initialAchievements.length, fetchAchievements]);

  const handleAchievementUnlocked = useCallback(
    (event: AchievementUnlockedEvent) => {
      const achievementKey = event.achievement.key;

      if (processedUnlocks.has(achievementKey)) {
        return;
      }
      processedUnlocks.add(achievementKey);

      setAchievements((prev) =>
        prev.map((achievement) =>
          achievement.key === achievementKey
            ? {
                ...achievement,
                isUnlocked: true,
                unlockedAt: event.timestamp.toISOString(),
              }
            : achievement
        )
      );

      const achievement = event.achievement;
      addToast({
        title: `Achievement Unlocked: ${achievement.title}`,
        description: achievement.description,
        icon: achievement.icon || "🏆",
        rarity: achievement.rarity,
        duration: 6000,
      });
    },
    [addToast, processedUnlocks]
  );

  useGamificationStream({
    onEvent: (type, data) => {
      if (type === "achievementUnlocked") {
        handleAchievementUnlocked(data as AchievementUnlockedEvent);
      }
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(achievements.map((a) => a.category));
    return ["all", ...Array.from(cats).sort()];
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      if (
        statusFilter === "unlocked" &&
        !achievement.isUnlocked
      ) {
        return false;
      }
      if (
        statusFilter === "locked" &&
        achievement.isUnlocked
      ) {
        return false;
      }
      if (
        categoryFilter !== "all" &&
        achievement.category !== categoryFilter
      ) {
        return false;
      }
      if (
        rarityFilter !== "all" &&
        achievement.rarity !== rarityFilter
      ) {
        return false;
      }
      return true;
    });
  }, [achievements, statusFilter, categoryFilter, rarityFilter]);

  const stats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter((a) => a.isUnlocked).length;
    return {
      total,
      unlocked,
      locked: total - unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    };
  }, [achievements]);

  if (error) {
    return (
      <div
        className={`text-center py-12 ${className}`}
        role="alert"
        aria-live="polite"
      >
        <p className="text-red-600 dark:text-red-400">
          Failed to load achievements: {error.message}
        </p>
        <button
          onClick={fetchAchievements}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats header */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Achievements
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {stats.unlocked} of {stats.total} unlocked ({stats.percentage}%)
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {stats.percentage}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Complete
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
            role="progressbar"
            aria-valuenow={stats.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Overall achievement progress: ${stats.percentage}%`}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Status filter */}
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="unlocked">Unlocked ({stats.unlocked})</option>
              <option value="locked">Locked ({stats.locked})</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label
              htmlFor="category-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by category"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>

          {/* Rarity filter */}
          <div>
            <label
              htmlFor="rarity-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Rarity
            </label>
            <select
              id="rarity-filter"
              value={rarityFilter}
              onChange={(e) =>
                setRarityFilter(e.target.value as AchievementRarity | "all")
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter by rarity"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div
          className="text-center py-12"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading achievements...
          </p>
        </div>
      ) : filteredAchievements.length === 0 ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          <p className="text-gray-600 dark:text-gray-400">
            No achievements found matching your filters.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          role="list"
          aria-label="Achievements grid"
        >
          {filteredAchievements.map((achievement) => (
            <div key={achievement.key} role="listitem">
              <AchievementBadge
                {...achievement}
                onClick={() => setSelectedAchievement(achievement)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail modal (optional, for future expansion) */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedAchievement(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-modal-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-6xl mb-4" aria-hidden="true">
                {selectedAchievement.icon}
              </div>
              <h3
                id="achievement-modal-title"
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2"
              >
                {selectedAchievement.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedAchievement.description}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="capitalize">{selectedAchievement.category}</span>
                <span className="uppercase font-medium">
                  {selectedAchievement.rarity}
                </span>
              </div>
              {selectedAchievement.isUnlocked && selectedAchievement.unlockedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Unlocked on{" "}
                  {new Date(selectedAchievement.unlockedAt).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              )}
              <button
                onClick={() => setSelectedAchievement(null)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
