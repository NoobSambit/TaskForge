"use client";

import React from "react";
import { LevelBadge } from "@/components/gamification";
import { useGamification } from "@/components/providers";

interface GamificationHeaderProps {
  className?: string;
}

export function GamificationHeader({ className = "" }: GamificationHeaderProps) {
  const { xp, level, levelInfo, streak, isConnected } = useGamification();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* XP/Level Progress Pill */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer group"
        role="button"
        tabIndex={0}
        onClick={() => {
          // Could open a detailed modal or navigate to stats page
          console.log("Show detailed gamification stats");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            // Could open a detailed modal or navigate to stats page
            console.log("Show detailed gamification stats");
          }
        }}
        aria-label={`Current progress: Level ${level}, ${xp} XP, ${streak} day streak. Click for details.`}
      >
        {/* Level Badge */}
        <div className="relative">
          <LevelBadge size="sm" />
          {/* Connection indicator for accessibility */}
          <span className="sr-only">
            {isConnected ? "Connected to live updates" : "Offline mode"}
          </span>
        </div>

        {/* XP and Level Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm">
            <span className="font-medium text-foreground">Lvl {level}</span>
            <span className="text-muted-foreground mx-1">•</span>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              {xp} XP
            </span>
          </div>
          
          {/* Streak indicator */}
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <svg 
                className="w-3 h-3" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span className="text-xs font-medium">{streak}</span>
            </div>
          )}
        </div>

        {/* Progress to next level (mini indicator) */}
        {levelInfo.xpToNext !== null && (
          <div className="hidden sm:block w-12 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${levelInfo.progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Screen reader live region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {isConnected && "Connected to gamification updates"}
      </div>
    </div>
  );
}