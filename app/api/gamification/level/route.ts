/**
 * Level API endpoint
 * 
 * GET /api/gamification/level - Get user's current level information and progress
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders
} from "@/lib/gamification/apiHelpers";
import { 
  LevelResponseSchema
} from "@/lib/gamification/apiSchemas";
import { getLevelInfoFast } from "@/lib/gamification/levels";
import { getUserActivityLogs } from "@/models/ActivityLog";
import { z } from "zod";

/**
 * GET handler for level information
 * 
 * Query parameters:
 * - includeHistory: boolean - Include level progression history (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, user } = auth;

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;

    // Get detailed level information
    const levelInfo = getLevelInfoFast(currentXp);

    // Get recent level-ups for history
    const url = new URL(request.url);
    const includeHistory = url.searchParams.get("includeHistory") === "true";

    let levelUpHistory = [];
    if (includeHistory) {
      const levelUpActivities = await getUserActivityLogs(userId, {
        activityType: "level_up",
        limit: 10,
      });

      levelUpHistory = levelUpActivities.map(activity => ({
        level: activity.metadata?.newLevel || activity.metadata?.level,
        previousLevel: activity.metadata?.previousLevel,
        xpAtLevelUp: activity.metadata?.xpAtLevelUp,
        unlockedAt: activity.createdAt.toISOString(),
      }));
    }

    // Build response data
    const responseData = {
      currentLevel: levelInfo.currentLevel,
      currentXp: levelInfo.currentXp,
      xpForCurrentLevel: levelInfo.xpForCurrentLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      progress: levelInfo.progress,
      levelsToNext: levelInfo.levelsToNext,
      totalXpForNextLevel: levelInfo.totalXpForNextLevel,
      recentLevelUps: levelUpHistory,
    };

    // Validate response
    const validatedData = LevelResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "Level information retrieved successfully")
    );

  } catch (error) {
    return handleApiError(error, "Level API GET");
  }
}