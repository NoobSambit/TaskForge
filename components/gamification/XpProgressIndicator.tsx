"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/components/providers";

interface XpProgressIndicatorProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showAnimation?: boolean;
  className?: string;
  variant?: "circular" | "linear";
}

export function XpProgressIndicator({ 
  size = "md", 
  showLabel = true,
  showAnimation = true,
  className = "",
  variant = "circular"
}: XpProgressIndicatorProps) {
  const { xp, levelInfo, isConnected } = useGamification();

  // Size configurations
  const sizeConfig = {
    sm: {
      circular: { size: 40, strokeWidth: 3 },
      linear: { height: 4, fontSize: "text-xs" },
    },
    md: {
      circular: { size: 56, strokeWidth: 4 },
      linear: { height: 6, fontSize: "text-sm" },
    },
    lg: {
      circular: { size: 80, strokeWidth: 6 },
      linear: { height: 8, fontSize: "text-base" },
    },
  };

  const config = sizeConfig[size];

  // Calculate progress
  const progress = levelInfo.progressPercentage ?? 0;
  const xpToNext = levelInfo.xpToNext;
  const xpRequiredForNext = levelInfo.xpRequiredForNextLevel;

  // Animation variants
  const progressVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      }
    },
    xpGained: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      }
    },
  };

  // Determine if we should animate (respect reduced motion)
  const shouldAnimate = showAnimation && 
    typeof window !== "undefined" && 
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Circular progress component
  if (variant === "circular") {
    const { size: circularSize, strokeWidth } = config.circular;
    const radius = (circularSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={xp}
            variants={shouldAnimate ? progressVariants : {}}
            initial="initial"
            animate="animate"
            className="relative"
          >
            {/* Background circle */}
            <svg
              width={circularSize}
              height={circularSize}
              className="transform -rotate-90"
              aria-label={`XP Progress: ${progress.toFixed(1)}% to next level`}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* Background track */}
              <circle
                cx={circularSize / 2}
                cy={circularSize / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="none"
                className="text-muted-foreground/20"
              />
              
              {/* Progress circle */}
              <motion.circle
                cx={circularSize / 2}
                cy={circularSize / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="none"
                className="text-primary"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ 
                  strokeDashoffset: shouldAnimate ? strokeDashoffset : strokeDashoffset,
                  transition: {
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    duration: shouldAnimate ? 1 : 0,
                  }
                }}
                strokeLinecap="round"
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {showLabel && (
                <>
                  <span className="text-xs font-medium text-muted-foreground">
                    XP
                  </span>
                  <span className={`font-bold text-foreground ${size === "sm" ? "text-xs" : "text-sm"}`}>
                    {xp}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* XP to next level tooltip */}
        {showLabel && xpToNext !== null && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs text-muted-foreground">
              {xpToNext} to next
            </span>
          </div>
        )}
      </div>
    );
  }

  // Linear progress component
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">
            Level {levelInfo.level}
          </span>
          <span className="text-sm text-muted-foreground">
            {xp} / {xpRequiredForNext || "Max"} XP
          </span>
        </div>
      )}
      
      <div 
        className={`relative w-full bg-muted-foreground/20 rounded-full overflow-hidden`}
        style={{ height: config.linear.height }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`XP Progress: ${progress.toFixed(1)}% to next level`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={xp}
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progress}%`,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                duration: shouldAnimate ? 1 : 0,
              }
            }}
          />
        </AnimatePresence>
      </div>

      {showLabel && xpToNext !== null && (
        <div className="mt-1 text-center">
          <span className="text-xs text-muted-foreground">
            {xpToNext} XP to next level
          </span>
        </div>
      )}
    </div>
  );
}