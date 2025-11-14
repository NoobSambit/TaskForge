'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  level: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  period: 'weekly' | 'monthly';
  dateRange: {
    start: string;
    end: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUser: {
    rank: number | null;
    name: string;
    totalXp: number;
    level: number;
  } | null;
}

type Period = 'weekly' | 'monthly';

export function Leaderboard() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          period,
          page: page.toString(),
          limit: '50',
        });

        const response = await fetch(`/api/gamification/leaderboard?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to load leaderboard (${response.status})`
          );
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period, page]);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setPage(1); // Reset to first page when changing period
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of leaderboard
    const element = document.getElementById('leaderboard-container');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div id="leaderboard-container" className="space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const startDate = new Date(data.dateRange.start);
  const endDate = new Date(data.dateRange.end);
  const dateRangeStr =
    period === 'weekly'
      ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
      : format(startDate, 'MMMM yyyy');

  return (
    <div id="leaderboard-container" className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Global Leaderboard</h2>
        <p className="text-sm text-gray-600">{dateRangeStr}</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => handlePeriodChange('weekly')}
          className={`px-4 py-2 font-medium transition-colors ${
            period === 'weekly'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => handlePeriodChange('monthly')}
          className={`px-4 py-2 font-medium transition-colors ${
            period === 'monthly'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Current User Status */}
      {data.currentUser && (
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-gray-900">Your Rank</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-blue-600">
                #{data.currentUser.rank || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">{data.currentUser.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {data.currentUser.totalXp.toLocaleString()} XP
              </p>
              <p className="text-sm text-gray-600">Level {data.currentUser.level}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Player
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Level
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                XP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No leaderboard data available for this period
                </td>
              </tr>
            ) : (
              data.leaderboard.map((entry) => (
                <tr
                  key={entry.userId}
                  className={`transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    #{entry.rank}
                    {entry.isCurrentUser && (
                      <span className="ml-2 inline-block text-xs font-medium text-blue-600">
                        (YOU)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{entry.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    Level {entry.level}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {entry.totalXp.toLocaleString()} XP
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {data.pagination.page} of {data.pagination.totalPages}
            {' '}({data.pagination.total} total players)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.pagination.totalPages}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Anti-cheat note */}
      <div className="rounded-lg bg-yellow-50 p-4">
        <p className="text-xs font-medium text-yellow-800">
          💡 <strong>Fair Play:</strong> XP is calculated from completed tasks. Duplicate
          entries and rapid resubmissions are automatically prevented. Rankings update in
          real-time.
        </p>
      </div>
    </div>
  );
}
