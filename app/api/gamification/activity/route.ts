/**
 * Activity API endpoint
 * 
 * GET /api/gamification/activity - Get user's gamification activity history
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders
} from "@/lib/gamification/apiHelpers";
import { 
  ActivityResponseSchema,
  ActivityQuerySchema
} from "@/lib/gamification/apiSchemas";
import { getUserActivityLogs } from "@/models/ActivityLog";
import { format, isValid, parseISO } from "date-fns";
import { z } from "zod";

/**
 * GET handler for activity history
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * - activityType: string - Filter by activity type
 * - fromDate: string - ISO date string to filter from
 * - toDate: string - ISO date string to filter to
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId } = auth;

    // Parse query parameters
    const url = new URL(request.url);
    const query = {
      page: Math.max(1, parseInt(url.searchParams.get("page") || "1")),
      limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20"))),
      activityType: url.searchParams.get("activityType") || undefined,
      fromDate: url.searchParams.get("fromDate") || undefined,
      toDate: url.searchParams.get("toDate") || undefined,
    };

    // Validate query parameters
    const validatedQuery = ActivityQuerySchema.parse(query);
    const { page, limit, activityType, fromDate, toDate } = validatedQuery;

    // Parse dates
    const parsedFromDate = fromDate ? parseISO(fromDate) : undefined;
    const parsedToDate = toDate ? parseISO(toDate) : undefined;

    // Validate dates
    if (fromDate && (!isValid(parsedFromDate!) || isNaN(parsedFromDate!.getTime()))) {
      return createSuccessResponse(
        { error: "Invalid fromDate format" },
        undefined,
        400
      );
    }

    if (toDate && (!isValid(parsedToDate!) || isNaN(parsedToDate!.getTime()))) {
      return createSuccessResponse(
        { error: "Invalid toDate format" },
        undefined,
        400
      );
    }

    // Get activity logs
    const activities = await getUserActivityLogs(userId, {
      activityType: activityType as any,
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      limit: limit + 1, // Get one extra to check if there are more
    });

    // Check if there are more results
    const hasMore = activities.length > limit;
    const paginatedActivities = hasMore ? activities.slice(0, limit) : activities;

    // Transform activities for response
    const transformedActivities = paginatedActivities.map(activity => {
      let description = "";
      let xpChange: number | undefined;

      switch (activity.activityType) {
        case "task_completed":
          description = `Task completed: ${activity.metadata?.taskTitle || "Unknown task"}`;
          xpChange = activity.metadata?.xpAwarded;
          break;
        case "level_up":
          description = `Level up! Reached level ${activity.metadata?.newLevel || activity.metadata?.level}`;
          break;
        case "achievement_unlocked":
          description = `Achievement unlocked: ${activity.metadata?.achievementTitle || activity.metadata?.achievementKey}`;
          xpChange = activity.metadata?.xpReward;
          break;
        case "streak_updated":
          description = `Streak updated: ${activity.metadata?.newStreak || activity.metadata?.streak} days`;
          break;
        case "theme_unlocked":
          description = `Theme unlocked: ${activity.metadata?.themeName || activity.metadata?.themeId}`;
          break;
        default:
          description = activity.description || activity.activityType;
      }

      return {
        id: activity._id?.toString() || activity.id,
        activityType: activity.activityType,
        description,
        xpChange,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
      };
    });

    // Build response data
    const responseData = {
      activities: transformedActivities,
      total: paginatedActivities.length,
      hasMore,
      pagination: {
        page,
        limit,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
      },
      filters: {
        activityType,
        fromDate,
        toDate,
      },
    };

    // Validate response
    const validatedData = ActivityResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "Activity history retrieved successfully")
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createSuccessResponse(
        { error: "Invalid query parameters", details: error.errors },
        undefined,
        400
      );
    }
    return handleApiError(error, "Activity API GET");
  }
}