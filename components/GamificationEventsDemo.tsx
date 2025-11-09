"use client";

/**
 * Demo component for gamification real-time events
 * 
 * This component demonstrates how to use the useGamificationStream hook
 * to receive real-time updates for XP, levels, achievements, streaks, and themes.
 */

import { useGamificationStream } from "@/hooks/useGamificationStream";
import { useState, useEffect } from "react";

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  recentAchievements: string[];
  unlockedThemes: string[];
}

export function GamificationEventsDemo() {
  const [state, setState] = useState<GamificationState>({
    xp: 0,
    level: 1,
    streak: 0,
    recentAchievements: [],
    unlockedThemes: [],
  });

  const {
    isConnected,
    isPolling,
    lastEvent,
    error,
    events,
    reconnect,
    disconnect,
  } = useGamificationStream({
    onEvent: (type, data) => {
      console.log(`🎮 Gamification Event: ${type}`, data);
      
      // Update local state based on event type
      setState(prev => {
        const newState = { ...prev };
        
        switch (type) {
          case "xpAwarded":
            newState.xp = data.totalXp;
            break;
          case "levelUp":
            newState.level = data.newLevel;
            break;
          case "streakUpdate":
            newState.streak = data.newStreak;
            break;
          case "achievementUnlocked":
            newState.recentAchievements = [
              data.achievement.title,
              ...prev.recentAchievements.slice(0, 4),
            ];
            break;
          case "themeUnlocked":
            newState.unlockedThemes = [
              ...new Set([...prev.unlockedThemes, data.themeId]),
            ];
            break;
        }
        
        return newState;
      });
    },
    onError: (error) => {
      console.error("🚨 Gamification Stream Error:", error);
    },
    onConnectionChange: (isConnected, isPolling) => {
      console.log(`📡 Connection status: ${isConnected ? "SSE Connected" : isPolling ? "Polling" : "Disconnected"}`);
    },
  });

  const getConnectionStatus = () => {
    if (isConnected) return { text: "Connected", color: "text-green-600" };
    if (isPolling) return { text: "Polling", color: "text-yellow-600" };
    return { text: "Offline", color: "text-red-600" };
  };

  const status = getConnectionStatus();

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Gamification Events</h2>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
          <div className="flex gap-2">
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-sm text-gray-600">XP</div>
          <div className="text-xl font-bold text-blue-600">{state.xp}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-sm text-gray-600">Level</div>
          <div className="text-xl font-bold text-purple-600">{state.level}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded">
          <div className="text-sm text-gray-600">Streak</div>
          <div className="text-xl font-bold text-orange-600">{state.streak} days</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-sm text-gray-600">Themes</div>
          <div className="text-xl font-bold text-green-600">{state.unlockedThemes.length}</div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Achievements</h3>
        <div className="space-y-1">
          {state.recentAchievements.length > 0 ? (
            state.recentAchievements.map((achievement, index) => (
              <div key={index} className="text-sm bg-yellow-50 p-2 rounded">
                🏆 {achievement}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">No achievements yet</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Last Event</h3>
        <div className="bg-gray-50 p-3 rounded">
          {lastEvent ? (
            <div>
              <div className="text-sm font-medium text-gray-600">
                Type: {lastEvent.type}
              </div>
              <pre className="text-xs text-gray-500 mt-1 overflow-x-auto">
                {JSON.stringify(lastEvent.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No events received yet</div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Events in history: {events.length}
        </div>
      </div>
    </div>
  );
}