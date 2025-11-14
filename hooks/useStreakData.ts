"use client";

import { useState, useEffect, useCallback } from "react";

interface StreakHistoryItem {
  date: string;
  count: number;
  hasActivity: boolean;
}

interface StreakData {
  current: number;
  longest: number;
  lastDate?: string;
  history: StreakHistoryItem[];
  isActive: boolean;
}

interface UseStreakDataOptions {
  days?: number;
  enabled?: boolean;
}

interface UseStreakDataReturn {
  data: StreakData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useStreakData(options: UseStreakDataOptions = {}): UseStreakDataReturn {
  const { days = 90, enabled = true } = options;
  
  const [data, setData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStreakData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/gamification/streaks?includeHistory=true&days=${days}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch streak data: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("Error fetching streak data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days, enabled]);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStreakData,
  };
}
