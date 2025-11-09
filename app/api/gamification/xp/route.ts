/**
 * XP API endpoint
 * 
 * GET /api/gamification/xp - Get user's current XP and level information
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders,
  parseQueryParams
} from "@/lib/gamification/apiHelpers";
import { 
  XpResponseSchema,
  PaginationQuerySchema
} from "@/lib/gamification/apiSchemas";
import { getUserActivityLogs } from "@/models/ActivityLog";
import { getLevelInfoFast } from "@/lib/gamification/levels";
import { format, startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

/**
 * GET handler for XP information
 * 
 * Query parameters:
 * - includeHistory: boolean - Include recent XP activity (default: false)
 * - days: number - Number of days to include in history (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, user } = auth;

    // Parse query parameters
    const query = parseQueryParams(request, {
      includeHistory: { type: "boolean", default: false },
      days: { type: "number", default: 7, validator: (v) => v >= 1 && v <= 365 },
    });

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    const nextLevelAt = user.preferences?.nextLevelAt;

    // Get level information
    const levelInfo = getLevelInfoFast(currentXp);

    // Calculate today's XP
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todayActivities = await getUserActivityLogs(userId, {
      activityType: "task_completed",
      fromDate: todayStart,
      toDate: todayEnd,
      limit: 100, // Should be plenty for one day
    });

    const todayXp = todayActivities.reduce((sum, activity) => {
      return sum + (activity.metadata?.xpAwarded || 0);
    }, 0);

    // Build response data
    const responseData = {
      xp: currentXp,
      level: currentLevel,
      nextLevelAt,
      todayXp,
      totalXp: currentXp,
      levelInfo: {
        currentLevel: levelInfo.currentLevel,
        currentXp: levelInfo.currentXp,
        xpForCurrentLevel: levelInfo.xpForCurrentLevel,
        xpForNextLevel: levelInfo.xpForNextLevel,
        progress: levelInfo.progress,
        levelsToNext: levelInfo.levelsToNext,
        totalXpForNextLevel: levelInfo.totalXpForNextLevel,
      },
    };

    // Include history if requested
    if (query.includeHistory) {
      const historyStart = startOfDay(new Date());
      historyStart.setDate(historyStart.getDate() - query.days + 1);

      const historyActivities = await getUserActivityLogs(userId, {
        activityType: "task_completed",
        fromDate: historyStart,
        limit: 500,
      });

      // Group by day
      const dailyXp: Record<string, number> = {};
      historyActivities.forEach(activity => {
        const date = format(activity.createdAt, "yyyy-MM-dd");
        const xp = activity.metadata?.xpAwarded || 0;
        dailyXp[date] = (dailyXp[date] || 0) + xp;
      });

      // Fill in missing days with 0
      const history = [];
      for (let i = 0; i < query.days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = format(date, "yyyy-MM-dd");
        history.unshift({
          date: dateStr,
          xp: dailyXp[dateStr] || 0,
        });
      }

      (responseData as any).history = history;
    }

    // Validate response
    const validatedData = XpResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "XP information retrieved successfully")
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid response data", "VALIDATION_ERROR", error.errors);
    }
    return handleApiError(error, "XP API GET");
  }
}

/**
 * Helper function for error responses
 */
function createErrorResponse(message: string, code: string, details?: any) {
  return createSuccessResponse(
    { error: message, code, details },
    undefined,
    400
  );
}