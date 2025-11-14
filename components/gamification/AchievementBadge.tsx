"use client";

import React from "react";
import { motion } from "framer-motion";
import type { AchievementRarity } from "@/types/gamification";

export interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  xpReward?: number;
  category?: string;
  onClick?: () => void;
  className?: string;
}

const rarityColors: Record<
  AchievementRarity,
  { border: string; bg: string; text: string; glow: string }
> = {
  common: {
    border: "border-gray-400 dark:border-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900",
    text: "text-gray-700 dark:text-gray-300",
    glow: "shadow-gray-400/50",
  },
  rare: {
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    glow: "shadow-blue-400/50",
  },
  epic: {
    border: "border-purple-400 dark:border-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-700 dark:text-purple-300",
    glow: "shadow-purple-400/50",
  },
  legendary: {
    border: "border-amber-400 dark:border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    glow: "shadow-amber-400/50",
  },
};

export function AchievementBadge({
  title,
  description,
  icon,
  rarity,
  isUnlocked,
  unlockedAt,
  progress = 0,
  xpReward,
  category,
  onClick,
  className = "",
}: AchievementBadgeProps) {
  const colors = rarityColors[rarity];
  const shouldAnimate =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cardVariants = shouldAnimate
    ? {
        unlocked: {
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 20,
          },
        },
        locked: {
          scale: 1,
        },
        hover: {
          scale: 1.03,
          y: -4,
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
          },
        },
      }
    : {};

  const iconVariants = shouldAnimate
    ? {
        unlocked: {
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
          transition: {
            duration: 0.5,
            ease: "easeInOut",
          },
        },
        locked: {
          opacity: 0.4,
          filter: "grayscale(100%)",
        },
      }
    : {
        locked: {
          opacity: 0.4,
        },
      };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="locked"
      animate={isUnlocked ? "unlocked" : "locked"}
      whileHover={onClick ? "hover" : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : "article"}
      aria-label={`${title} achievement, ${isUnlocked ? "unlocked" : "locked"}, ${rarity} rarity`}
      className={`
        relative rounded-lg border-2 p-4
        transition-all duration-200
        ${colors.border} ${colors.bg}
        ${isUnlocked ? colors.glow + " shadow-lg" : "opacity-75"}
        ${onClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" : ""}
        ${!isUnlocked ? "filter grayscale" : ""}
        ${className}
      `}
    >
      {/* Rarity badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`
            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase
            ${colors.text} ${colors.bg}
          `}
          aria-label={`${rarity} rarity`}
        >
          {rarity}
        </span>
      </div>

      {/* Icon */}
      <motion.div
        variants={iconVariants}
        className="flex items-center justify-center text-5xl mb-3"
        aria-hidden="true"
      >
        {icon}
      </motion.div>

      {/* Content */}
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {description}
        </p>

        {/* Progress bar for locked achievements */}
        {!isUnlocked && progress > 0 && (
          <div className="pt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full ${colors.border} bg-current`}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${Math.round(progress * 100)}%`}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.round(progress * 100)}% complete
            </p>
          </div>
        )}

        {/* Unlock date */}
        {isUnlocked && unlockedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-500 dark:text-gray-400">
          {category && (
            <span className="capitalize" aria-label={`Category: ${category}`}>
              {category}
            </span>
          )}
          {xpReward !== undefined && (
            <span className="font-medium" aria-label={`XP reward: ${xpReward}`}>
              +{xpReward} XP
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
