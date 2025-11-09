"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useGamificationStream } from "@/hooks/useGamificationStream";
import { getLevelInfoFast } from "@/lib/gamification/levels";
import type { UserGamificationStats } from "@/types/gamification";

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  levelInfo: {
    level: number;
    xpRequiredForLevel: number;
    xpRequiredForNextLevel: number | null;
    xpProgress: number;
    xpToNext: number | null;
    progressPercentage: number;
  };
  isConnected: boolean;
  isPolling: boolean;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: Error | null;
}

interface GamificationContextType extends GamificationState {
  refresh: () => void;
  reconnect: () => void;
  disconnect: () => void;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

interface GamificationProviderProps {
  children: React.ReactNode;
  initialData?: Partial<UserGamificationStats>;
  pollingInterval?: number;
}

export function GamificationProvider({ 
  children, 
  initialData,
  pollingInterval = 30000 
}: GamificationProviderProps) {
  // State management
  const [state, setState] = useState<GamificationState>({
    xp: initialData?.xp ?? 0,
    level: initialData?.level ?? 1,
    streak: initialData?.currentStreak ?? 0,
    levelInfo: getLevelInfoFast(initialData?.xp ?? 0),
    isConnected: false,
    isPolling: false,
    lastUpdated: null,
    isLoading: true,
    error: null,
  });

  // Update level info when XP changes
  const updateLevelInfo = useCallback((newXp: number) => {
    const levelInfo = getLevelInfoFast(newXp);
    setState(prev => ({
      ...prev,
      xp: newXp,
      levelInfo,
      level: levelInfo.level,
    }));
  }, []);

  // Handle gamification events
  const handleEvent = useCallback((type: string, data: any) => {
    const now = new Date();
    
    switch (type) {
      case "xpAwarded":
        setState(prev => ({
          ...prev,
          xp: data.totalXp,
          lastUpdated: now,
          isLoading: false,
        }));
        updateLevelInfo(data.totalXp);
        break;
        
      case "levelUp":
        setState(prev => ({
          ...prev,
          level: data.newLevel,
          lastUpdated: now,
          isLoading: false,
        }));
        updateLevelInfo(data.totalXp);
        break;
        
      case "streakUpdate":
        setState(prev => ({
          ...prev,
          streak: data.newStreak,
          lastUpdated: now,
          isLoading: false,
        }));
        break;
        
      case "connected":
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
        break;
        
      case "error":
        setState(prev => ({
          ...prev,
          error: new Error(data.error || "Unknown error"),
          isLoading: false,
        }));
        break;
    }
  }, [updateLevelInfo]);

  // Handle connection errors
  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  // Handle connection state changes
  const handleConnectionChange = useCallback((isConnected: boolean, isPolling: boolean) => {
    setState(prev => ({
      ...prev,
      isConnected,
      isPolling,
    }));
  }, []);

  // Set up gamification stream
  const {
    isConnected: streamConnected,
    isPolling: streamPolling,
    reconnect,
    disconnect,
  } = useGamificationStream({
    onEvent: handleEvent,
    onError: handleError,
    onConnectionChange: handleConnectionChange,
    pollingConfig: {
      interval: pollingInterval,
    },
  });

  // Update connection state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isConnected: streamConnected,
      isPolling: streamPolling,
    }));
  }, [streamConnected, streamPolling]);

  // Fetch initial data if not provided
  useEffect(() => {
    if (initialData) {
      setState(prev => ({
        ...prev,
        xp: initialData.xp ?? prev.xp,
        level: initialData.level ?? prev.level,
        streak: initialData.currentStreak ?? prev.streak,
        levelInfo: getLevelInfoFast(initialData.xp ?? prev.xp),
        isLoading: false,
      }));
      return;
    }

    // Fetch initial data from API
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/gamification/snapshot");
        if (response.ok) {
          const data = await response.json();
          setState(prev => ({
            ...prev,
            xp: data.xp,
            level: data.level,
            streak: data.streak,
            levelInfo: getLevelInfoFast(data.xp),
            lastUpdated: new Date(data.timestamp),
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch initial gamification data:", error);
        setState(prev => ({
          ...prev,
          error: error as Error,
          isLoading: false,
        }));
      }
    };

    fetchInitialData();
  }, [initialData]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch("/api/gamification/snapshot");
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          xp: data.xp,
          level: data.level,
          streak: data.streak,
          levelInfo: getLevelInfoFast(data.xp),
          lastUpdated: new Date(data.timestamp),
          isLoading: false,
          error: null,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
    }
  }, []);

  const contextValue: GamificationContextType = {
    ...state,
    refresh,
    reconnect,
    disconnect,
  };

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}

export { GamificationContext };