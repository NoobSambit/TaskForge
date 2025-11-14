"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DashboardHero, 
  AchievementsGrid, 
  ThemeGallery, 
  RecentActivityList,
  DashboardSkeleton
} from "@/components/gamification";
import { useGamification } from "@/components/providers";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useStreakData } from "@/hooks/useStreakData";

export default function GamificationDashboardPage() {
  const { 
    xp, 
    levelInfo, 
    streak, 
    isConnected, 
    isLoading: gamificationLoading,
    error: gamificationError
  } = useGamification();

  const { 
    data: streakData, 
    isLoading: streakLoading 
  } = useStreakData({ days: 90 });

  const { trackEvent, trackTimeOnPage, trackSectionInteraction } = useAnalytics();
  const pageStartTime = useRef(Date.now());
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Track page load time
  useEffect(() => {
    const loadTime = Date.now() - pageStartTime.current;
    trackEvent({
      event: 'page_load',
      properties: {
        page: 'gamification_dashboard',
        load_time_ms: loadTime,
      },
    });
  }, [trackEvent]);

  // Track time on page when unmounting
  useEffect(() => {
    return () => {
      trackTimeOnPage('gamification_dashboard', pageStartTime.current);
    };
  }, [trackTimeOnPage]);

  // Hide skeleton after initial data load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gamificationLoading && !streakLoading) {
        setShowSkeleton(false);
      }
    }, 1000); // Minimum skeleton display time for smooth UX

    return () => clearTimeout(timer);
  }, [gamificationLoading, streakLoading]);

  // Track section interactions
  const handleSectionClick = (sectionName: string) => {
    trackSectionInteraction(sectionName, 'click');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  // Show skeleton while loading
  if (showSkeleton || (gamificationLoading && !xp)) {
    return (
      <div className="container mx-auto px-4 py-6" data-page="gamification-dashboard">
        <DashboardSkeleton />
      </div>
    );
  }

  // Show error state
  if (gamificationError) {
    return (
      <div className="container mx-auto px-4 py-6" data-page="gamification-dashboard">
        <div 
          className="text-center py-12"
          role="alert"
          aria-live="polite"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't load your gamification data. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="container mx-auto px-4 py-6 space-y-8"
      data-page="gamification-dashboard"
      data-testid="gamification-dashboard"
      data-e2e="gamification-dashboard"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="dashboard-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Hero Section with XP Progress, Level, and Streaks */}
          <motion.div variants={sectionVariants}>
            <div 
              onClick={() => handleSectionClick('hero_section')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSectionClick('hero_section');
                }
              }}
              aria-label="Hero section with progress overview"
              data-e2e="hero-section"
            >
              <DashboardHero />
            </div>
          </motion.div>

          {/* Two Column Layout for Activity and Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <motion.div variants={sectionVariants}>
              <div 
                onClick={() => handleSectionClick('recent_activity')}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSectionClick('recent_activity');
                  }
                }}
                aria-label="Recent activity section"
                data-e2e="recent-activity-section"
              >
                <RecentActivityList limit={8} />
              </div>
            </motion.div>

            {/* Achievements Preview */}
            <motion.div variants={sectionVariants}>
              <div 
                onClick={() => handleSectionClick('achievements_preview')}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSectionClick('achievements_preview');
                  }
                }}
                aria-label="Achievements preview section"
                data-e2e="achievements-preview-section"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Achievements</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        trackSectionInteraction('achievements_view_all', 'click');
                        window.location.href = '/achievements';
                      }}
                      className="text-sm text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1"
                      aria-label="View all achievements"
                    >
                      View All
                    </button>
                  </div>
                  <AchievementsGrid 
                    className="bg-card rounded-xl border p-4 shadow-sm"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Theme Gallery */}
          <motion.div variants={sectionVariants}>
            <div 
              onClick={() => handleSectionClick('theme_gallery')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSectionClick('theme_gallery');
                }
              }}
              aria-label="Theme gallery section"
              data-e2e="theme-gallery-section"
            >
              <ThemeGallery />
            </div>
          </motion.div>

          {/* Connection Status Indicator */}
          <motion.div 
            variants={sectionVariants}
            className="text-center text-sm text-muted-foreground"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-gray-400"
              }`} />
              <span>
                {isConnected ? "Live updates" : "Offline mode"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {xp !== null && `Current XP: ${xp}, Level: ${levelInfo.level}, Streak: ${streak} days`}
        {isConnected && "Connected to live gamification updates"}
      </div>
    </div>
  );
}