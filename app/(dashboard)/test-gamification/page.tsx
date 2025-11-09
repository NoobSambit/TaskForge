"use client";

import React from "react";
import { LevelBadge, XpProgressIndicator, DashboardHero } from "@/components/gamification";
import { GamificationProvider } from "@/components/providers/GamificationProvider";

export default function GamificationTestPage() {
  return (
    <GamificationProvider initialData={{ xp: 150, level: 3, currentStreak: 5 }}>
      <div className="container mx-auto p-8 space-y-8">
        <h1 className="text-2xl font-bold mb-6">Gamification Components Test</h1>
        
        {/* Level Badge Tests */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Level Badges</h2>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <LevelBadge size="sm" />
              <p className="text-sm mt-2">Small</p>
            </div>
            <div className="text-center">
              <LevelBadge size="md" />
              <p className="text-sm mt-2">Medium</p>
            </div>
            <div className="text-center">
              <LevelBadge size="lg" />
              <p className="text-sm mt-2">Large</p>
            </div>
          </div>
        </section>

        {/* Progress Indicator Tests */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Progress Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Circular Progress</h3>
              <div className="flex justify-center">
                <XpProgressIndicator variant="circular" size="lg" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Linear Progress</h3>
              <XpProgressIndicator variant="linear" />
            </div>
          </div>
        </section>

        {/* Dashboard Hero */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Dashboard Hero</h2>
          <DashboardHero />
        </section>
      </div>
    </GamificationProvider>
  );
}