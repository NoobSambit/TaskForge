"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  activityType: string;
  description: string;
  xpChange?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface RecentActivityListProps {
  className?: string;
  limit?: number;
}

export function RecentActivityList({ 
  className = "", 
  limit = 10 
}: RecentActivityListProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/gamification/activity?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const data = await response.json();
      setActivities(data.data?.activities || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return "✅";
      case "level_up":
        return "⬆️";
      case "achievement_unlocked":
        return "🏆";
      case "streak_updated":
        return "🔥";
      case "theme_unlocked":
        return "🎨";
      default:
        return "📝";
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return "text-green-600 dark:text-green-400";
      case "level_up":
        return "text-blue-600 dark:text-blue-400";
      case "achievement_unlocked":
        return "text-purple-600 dark:text-purple-400";
      case "streak_updated":
        return "text-orange-600 dark:text-orange-400";
      case "theme_unlocked":
        return "text-pink-600 dark:text-pink-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`} role="alert" aria-live="polite">
        <p className="text-red-600 dark:text-red-400 mb-2">
          Failed to load recent activity
        </p>
        <button
          onClick={fetchActivities}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`} role="status" aria-busy="true">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5"></div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`} role="status" aria-live="polite">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No activity yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Complete your first task to start tracking your progress!
        </p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          Go to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="recent-activity-list">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button
          onClick={fetchActivities}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Refresh activity"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>

      <div 
        className="space-y-3"
        role="list"
        aria-label="Recent activities"
      >
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            role="listitem"
            data-activity-type={activity.activityType}
          >
            <div 
              className={`text-xl flex-shrink-0 ${getActivityColor(activity.activityType)}`}
              aria-hidden="true"
            >
              {getActivityIcon(activity.activityType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {activity.description}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <time dateTime={activity.createdAt}>
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </time>
                
                {activity.xpChange !== undefined && (
                  <>
                    <span>•</span>
                    <span className={`font-medium ${
                      activity.xpChange > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {activity.xpChange > 0 ? "+" : ""}{activity.xpChange} XP
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === limit && (
        <div className="text-center pt-2">
          <button
            onClick={() => window.open('/api/gamification/activity', '_blank')}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}