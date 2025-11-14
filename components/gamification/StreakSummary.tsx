"use client";

import React from "react";
import { motion } from "framer-motion";

interface StreakSummaryProps {
  current: number;
  longest: number;
  isActive?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function StreakSummary({ 
  current, 
  longest, 
  isActive = true,
  isLoading = false,
  className = "" 
}: StreakSummaryProps) {
  // Determine if we should animate (respect reduced motion)
  const shouldAnimate = typeof window !== "undefined" && 
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const badgeVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      }
    },
  };

  const flameVariants = {
    initial: { scale: 1 },
    animate: shouldAnimate && isActive ? {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }
    } : { scale: 1 },
  };

  if (isLoading) {
    return (
      <div className={`flex gap-4 ${className}`}>
        <div className="flex-1 bg-muted/50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2" />
          <div className="h-8 bg-muted rounded w-12" />
        </div>
        <div className="flex-1 bg-muted/50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-20 mb-2" />
          <div className="h-8 bg-muted rounded w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${className}`} role="region" aria-label="Streak summary">
      {/* Current Streak */}
      <motion.div
        variants={shouldAnimate ? badgeVariants : {}}
        initial="initial"
        animate="animate"
        className={`
          flex-1 rounded-lg p-4 border transition-colors
          ${isActive 
            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900" 
            : "bg-muted/50 border-muted"
          }
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <motion.svg
                variants={shouldAnimate ? flameVariants : {}}
                animate="animate"
                className={`w-5 h-5 ${
                  isActive 
                    ? "text-orange-500" 
                    : "text-muted-foreground"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </motion.svg>
              <span className="text-sm font-medium text-muted-foreground">
                Current Streak
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span 
                className={`text-3xl font-bold ${
                  isActive 
                    ? "text-orange-600 dark:text-orange-400" 
                    : "text-foreground"
                }`}
                aria-label={`${current} day${current !== 1 ? 's' : ''}`}
              >
                {current}
              </span>
              <span className="text-sm text-muted-foreground">
                {current === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          {isActive && (
            <span 
              className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400"
              aria-label="Streak is active"
            >
              Active
            </span>
          )}
        </div>
      </motion.div>

      {/* Longest Streak */}
      <motion.div
        variants={shouldAnimate ? badgeVariants : {}}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className="flex-1 bg-muted/50 rounded-lg p-4 border border-muted"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-5 h-5 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">
                Longest Streak
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span 
                className="text-3xl font-bold text-foreground"
                aria-label={`${longest} day${longest !== 1 ? 's' : ''}`}
              >
                {longest}
              </span>
              <span className="text-sm text-muted-foreground">
                {longest === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          {longest > 0 && longest === current && (
            <span 
              className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400"
              aria-label="Personal record"
            >
              PR
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
