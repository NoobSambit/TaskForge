"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LevelBadge, XpProgressIndicator } from "@/components/gamification";
import { useGamification } from "@/components/providers";

interface DashboardHeroProps {
  className?: string;
}

export function DashboardHero({ className = "" }: DashboardHeroProps) {
  const { 
    xp, 
    levelInfo, 
    streak, 
    isConnected, 
    isPolling,
    lastUpdated,
    isLoading 
  } = useGamification();

  // Animation variants
  const heroVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      }
    },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      }
    },
  };

  const statsVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      }
    },
  };

  // Determine if we should animate (respect reduced motion)
  const shouldAnimate = typeof window !== "undefined" && 
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.div
      variants={shouldAnimate ? heroVariants : {}}
      initial="initial"
      animate="animate"
      className={`space-y-6 ${className}`}
    >
      {/* Welcome Section */}
      <motion.div variants={shouldAnimate ? cardVariants : {}} className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome back!
        </h1>
        <p className="text-muted-foreground">
          Track your progress and keep up the great work.
        </p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div variants={shouldAnimate ? cardVariants : {}}>
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Level and XP Progress */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <LevelBadge size="lg" />
                <div className="absolute -bottom-2 -right-2">
                  <div className={`w-4 h-4 rounded-full border-2 border-background ${
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  }`} />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg">Level {levelInfo.level}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {xp} Total XP
                </p>
                
                <XpProgressIndicator 
                  size="md" 
                  variant="linear"
                  showLabel={true}
                  className="w-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <motion.div 
                variants={shouldAnimate ? statsVariants : {}}
                className="bg-muted/50 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <svg 
                    className="w-8 h-8 text-orange-500" 
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
                </div>
                <div className="text-2xl font-bold">{streak}</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </motion.div>

              <motion.div 
                variants={shouldAnimate ? statsVariants : {}}
                className="bg-muted/50 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <svg 
                    className="w-8 h-8 text-primary" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" 
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {levelInfo.xpToNext !== null ? levelInfo.xpToNext : "—"}
                </div>
                <div className="text-sm text-muted-foreground">XP to Next</div>
              </motion.div>

              <motion.div 
                variants={shouldAnimate ? statsVariants : {}}
                className="bg-muted/50 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <svg 
                    className="w-8 h-8 text-green-500" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {isConnected ? "Live" : isPolling ? "Polling" : "Offline"}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </motion.div>

              <motion.div 
                variants={shouldAnimate ? statsVariants : {}}
                className="bg-muted/50 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <svg 
                    className="w-8 h-8 text-blue-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold">{levelInfo.progressPercentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </motion.div>
            </div>
          </div>

          {/* Last updated indicator */}
          {lastUpdated && (
            <div className="mt-4 text-center">
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {isPolling && " (polling)"}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Screen reader live region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {isConnected && "Connected to live gamification updates"}
        {isPolling && "Using polling for gamification updates"}
      </div>
    </motion.div>
  );
}