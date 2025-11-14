"use client";

import { useEffect, useCallback } from "react";

interface AnalyticsOptions {
  event: string;
  properties?: Record<string, any>;
  value?: number;
}

interface UseAnalyticsReturn {
  trackEvent: (options: AnalyticsOptions) => void;
  trackTimeOnPage: (pageName: string, startTime: number) => void;
  trackSectionInteraction: (sectionName: string, action: string) => void;
}

export type { AnalyticsOptions, UseAnalyticsReturn };

/**
 * Stub analytics hook for tracking user interactions.
 * 
 * This is a placeholder implementation that can be replaced with a real
 * analytics service when available. Currently logs to console for development.
 * 
 * Privacy: Respects opt-in preferences and doesn't track personal data.
 */
export function useAnalytics(): UseAnalyticsReturn {
  const isOptedIn = typeof window !== 'undefined' && 
    localStorage.getItem('analytics-opt-in') === 'true';

  const trackEvent = useCallback((options: AnalyticsOptions) => {
    if (!isOptedIn) {
      return;
    }

    const eventData = {
      event: options.event,
      properties: options.properties || {},
      value: options.value,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
    };

    // Stub: Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventData);
    }

    // TODO: Send to real analytics service when available
    // Example: analytics.track(options.event, options.properties);
  }, [isOptedIn]);

  const trackTimeOnPage = useCallback((pageName: string, startTime: number) => {
    if (!isOptedIn) {
      return;
    }

    const timeSpent = Date.now() - startTime;
    
    trackEvent({
      event: 'time_on_page',
      properties: {
        page_name: pageName,
        time_spent_ms: timeSpent,
        time_spent_seconds: Math.round(timeSpent / 1000),
      },
      value: Math.round(timeSpent / 1000),
    });
  }, [trackEvent]);

  const trackSectionInteraction = useCallback((
    sectionName: string, 
    action: string
  ) => {
    trackEvent({
      event: 'section_interaction',
      properties: {
        section_name: sectionName,
        action, // 'click', 'view', 'hover', etc.
      },
    });
  }, [trackEvent]);

  // Track page view on mount
  useEffect(() => {
    if (isOptedIn) {
      trackEvent({
        event: 'page_view',
        properties: {
          page_title: document.title,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        },
      });
    }
  }, [trackEvent, isOptedIn]);

  return {
    trackEvent,
    trackTimeOnPage,
    trackSectionInteraction,
  };
}