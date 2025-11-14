'use client';

import React, { useState, useEffect } from 'react';

interface Preferences {
  leaderboardOptIn: boolean;
  anonymousMode: boolean;
  timezone?: string;
}

export function LeaderboardSettings() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/gamification/preferences');

        if (!response.ok) {
          throw new Error('Failed to load preferences');
        }

        const result = await response.json();
        setPreferences(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleToggle = async (key: keyof Preferences, value: boolean) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/gamification/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSuccess('Preferences saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
      // Revert change on error
      setPreferences({ ...preferences, [key]: !value });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded bg-gray-100" />
        <div className="h-20 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Leaderboard Settings</h3>
        <p className="text-sm text-gray-600">
          Control how you appear on the global leaderboard
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Leaderboard Opt-in */}
      <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div className="space-y-1">
          <label className="font-medium text-gray-900">
            Opt in to Leaderboard
          </label>
          <p className="text-sm text-gray-600">
            When enabled, your XP and rank will appear on the global leaderboard
          </p>
        </div>
        <button
          onClick={() =>
            handleToggle('leaderboardOptIn', !preferences.leaderboardOptIn)
          }
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            preferences.leaderboardOptIn
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-200 hover:bg-gray-300'
          } ${isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.leaderboardOptIn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Anonymous Mode */}
      <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div className="space-y-1">
          <label className="font-medium text-gray-900">
            Anonymous Mode
          </label>
          <p className="text-sm text-gray-600">
            Hide your name on the leaderboard and display as "Anonymous"
          </p>
        </div>
        <button
          onClick={() =>
            handleToggle('anonymousMode', !preferences.anonymousMode)
          }
          disabled={isSaving || !preferences.leaderboardOptIn}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            preferences.anonymousMode && preferences.leaderboardOptIn
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-200 hover:bg-gray-300'
          } ${
            isSaving || !preferences.leaderboardOptIn
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.anonymousMode && preferences.leaderboardOptIn
                ? 'translate-x-6'
                : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Info message */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Your XP is earned through completed tasks and cannot be
          manipulated. The leaderboard is updated in real-time as you complete tasks.
        </p>
      </div>
    </div>
  );
}
