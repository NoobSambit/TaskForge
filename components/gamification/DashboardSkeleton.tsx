"use client";

import React from "react";

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className = "" }: DashboardSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-busy="true">
      {/* Welcome Section Skeleton */}
      <div className="text-center space-y-3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mx-auto animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mx-auto animate-pulse"></div>
      </div>

      {/* Progress Overview Skeleton */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level and XP Progress */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="text-center space-y-2 w-full">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-24 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-20 mx-auto animate-pulse"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse"></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto animate-pulse"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-12 mx-auto animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-16 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streak Summary Skeleton */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-16 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-20 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak Heatmap Skeleton */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 animate-pulse mb-4"></div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div 
              key={i} 
              className="aspect-square bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>

      {/* Two Column Layout for Activity and Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Skeleton */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements Preview Skeleton */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Gallery Skeleton */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}