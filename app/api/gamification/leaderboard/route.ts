/**
 * Leaderboard API endpoint
 * 
 * GET /api/gamification/leaderboard - Get global leaderboard rankings
 * 
 * Query parameters:
 * - period: 'weekly' | 'monthly' (default: 'weekly')
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 50, max: 100)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  handleApiError,
  createSuccessResponse,
  withCacheHeaders,
} from "@/lib/gamification/apiHelpers";
import { isFeatureEnabled } from "@/lib/featureFlags";
import User from "@/models/User";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { z } from "zod";
import type { IUser } from "@/models/User";

// Validation schema for query parameters
const LeaderboardQuerySchema = z.object({
  period: z.enum(["weekly", "monthly"]).default("weekly"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

/**
 * GET handler for leaderboard
 */
export async function GET(request: NextRequest) {
  try {
    // Check if feature is enabled
    if (!isFeatureEnabled("leaderboard")) {
      return NextResponse.json(
        { error: "Leaderboard feature is not enabled" },
        { status: 403 }
      );
    }

    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, user } = auth;

    // Parse query parameters
    const url = new URL(request.url);
    const queryInput = {
      period: url.searchParams.get("period") || "weekly",
      page: Math.max(1, parseInt(url.searchParams.get("page") || "1")),
      limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50"))),
    };

    const query = LeaderboardQuerySchema.parse(queryInput);
    const { period, page, limit } = query;

    // Calculate date range for the period
    const now = new Date();
    let dateRange: { start: Date; end: Date };

    if (period === "weekly") {
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      dateRange = { start: weekStart, end: weekEnd };
    } else {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      dateRange = { start: monthStart, end: monthEnd };
    }

    // Get all users with leaderboard opt-in
    // Using aggregation pipeline to calculate XP totals
    const userIdVariable = "$$userId";
    const leaderboardPipeline: any[] = [
      {
        $match: {
          "preferences.leaderboardOptIn": true,
        },
      },
      {
        $lookup: {
          from: "activitylogs",
          let: { userId: { $toString: "$_id" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userId", userIdVariable],
                },
                date: {
                  $gte: dateRange.start,
                  $lte: dateRange.end,
                },
                activityType: "task_completed",
              },
            },
            {
              $group: {
                _id: null,
                totalXp: { $sum: "$xpEarned" },
              },
            },
          ],
          as: "xpData",
        },
      },
      {
        $addFields: {
          totalXp: {
            $ifNull: [{ $arrayElemAt: ["$xpData.totalXp", 0] }, 0],
          },
        },
      },
      {
        $match: {
          totalXp: { $gt: 0 },
        },
      },
      {
        $sort: { totalXp: -1 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          totalXp: 1,
          anonymousMode: "$preferences.anonymousMode",
          level: 1,
        },
      },
    ];

    const leaderboardData: any[] = await User.aggregate(leaderboardPipeline);

    // Apply anonymization
    const anonymizedLeaderboard = leaderboardData.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      name: user.anonymousMode ? `Anonymous #${user._id.toString().slice(-6)}` : user.name,
      totalXp: user.totalXp,
      level: user.level,
      isCurrentUser: user._id.toString() === userId,
    }));

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedLeaderboard = anonymizedLeaderboard.slice(skip, skip + limit);

    // Add global rank for current user if not on current page
    let currentUserRank = null;
    const currentUserEntry = anonymizedLeaderboard.find(
      (u) => u.userId.toString() === userId
    );
    if (currentUserEntry) {
      currentUserRank = currentUserEntry.rank;
    }

    const response = {
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      pagination: {
        page,
        limit,
        total: anonymizedLeaderboard.length,
        totalPages: Math.ceil(anonymizedLeaderboard.length / limit),
      },
      leaderboard: paginatedLeaderboard,
      currentUserRank,
      currentUser: user.preferences?.leaderboardOptIn
        ? {
            rank: currentUserRank,
            name: user.preferences?.anonymousMode
              ? `Anonymous #${userId.slice(-6)}`
              : user.name,
            totalXp: currentUserEntry?.totalXp || 0,
            level: user.level,
          }
        : null,
    };

    return withCacheHeaders(
      createSuccessResponse(response, "Leaderboard data retrieved successfully")
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return handleApiError(error, "Leaderboard API GET");
  }
}
