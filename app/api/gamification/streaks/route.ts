/**
 * Streaks API endpoint
 * 
 * GET /api/gamification/streaks - Get user's current streak information
 * POST /api/gamification/streaks/recompute - Recalculate streaks from activity history
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders
} from "@/lib/gamification/apiHelpers";
import { 
  StreaksResponseSchema,
  RecomputeStreakRequestSchema
} from "@/lib/gamification/apiSchemas";
import { getUserActivityLogs } from "@/models/ActivityLog";
import { updateUserGamification } from "@/models/User";
import { recalculateStreaks } from "@/lib/gamification/streaks";
import { format, startOfDay, subDays } from "date-fns";
import { z } from "zod";

/**
 * GET handler for streak information
 * 
 * Query parameters:
 * - includeHistory: boolean - Include daily streak history (default: false)
 * - days: number - Number of days to include in history (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, user } = auth;

    const url = new URL(request.url);
    const includeHistory = url.searchParams.get("includeHistory") === "true";
    const days = Math.min(100, Math.max(1, parseInt(url.searchParams.get("days") || "30")));

    // Get current streak information
    const currentStreak = user.streaks?.current || user.currentStreak || 0;
    const longestStreak = user.streaks?.longest || user.longestStreak || 0;
    const lastStreakDate = user.streaks?.lastDate || user.lastStreakDate;

    let streakHistory = [];
    
    if (includeHistory) {
      // Get activity history for the specified period
      const historyStart = startOfDay(subDays(new Date(), days - 1));
      const historyEnd = new Date();

      const activities = await getUserActivityLogs(userId, {
        activityType: "task_completed",
        fromDate: historyStart,
        toDate: historyEnd,
        limit: 1000,
      });

      // Group activities by date and count completions
      const dailyActivity: Record<string, number> = {};
      activities.forEach(activity => {
        const dateKey = format(activity.createdAt, "yyyy-MM-dd");
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
      });

      // Build streak history
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const dateKey = format(date, "yyyy-MM-dd");
        
        streakHistory.push({
          date: dateKey,
          count: dailyActivity[dateKey] || 0,
          hasActivity: (dailyActivity[dateKey] || 0) > 0,
        });
      }
    }

    // Build response data
    const responseData = {
      current: currentStreak,
      longest: longestStreak,
      lastDate: lastStreakDate?.toISOString(),
      history: streakHistory,
      isActive: currentStreak > 0,
    };

    // Validate response
    const validatedData = StreaksResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "Streak information retrieved successfully")
    );

  } catch (error) {
    return handleApiError(error, "Streaks API GET");
  }
}

/**
 * POST handler for recomputing streaks
 * 
 * Request body:
 * - fromDate: string (optional) - ISO date string to start recalculation from
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId } = auth;

    // Parse request body
    const body = await request.json();
    const validatedBody = RecomputeStreakRequestSchema.parse(body);

    // Recalculate streaks
    const fromDate = validatedBody.fromDate ? new Date(validatedBody.fromDate) : undefined;
    const streakResult = await recalculateStreaks(userId, fromDate);

    if (!streakResult.success) {
      return createSuccessResponse(
        { error: streakResult.error || "Failed to recalculate streaks" },
        undefined,
        400
      );
    }

    // Update user with new streak information
    if (streakResult.streaks) {
      await updateUserGamification(userId, {
        currentStreak: streakResult.streaks.current,
        longestStreak: streakResult.streaks.longest,
        lastStreakDate: streakResult.streaks.lastDate,
        "streaks.current": streakResult.streaks.current,
        "streaks.longest": streakResult.streaks.longest,
        "streaks.lastDate": streakResult.streaks.lastDate,
      });
    }

    return createSuccessResponse({
      message: "Streaks recalculated successfully",
      streaks: streakResult.streaks,
      activitiesProcessed: streakResult.activitiesProcessed,
      corrections: streakResult.corrections,
    }, "Streak recombination completed");

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createSuccessResponse(
        { error: "Invalid request body", details: error.errors },
        undefined,
        400
      );
    }
    return handleApiError(error, "Streaks API POST");
  }
}