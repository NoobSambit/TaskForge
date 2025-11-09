/**
 * Achievements API endpoint
 * 
 * GET /api/gamification/achievements - Get user's achievements and available ones
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders
} from "@/lib/gamification/apiHelpers";
import { 
  AchievementsResponseSchema,
  AchievementsQuerySchema
} from "@/lib/gamification/apiSchemas";
import { getUserAchievements } from "@/models/UserAchievement";
import { getAchievementsByCategory } from "@/models/Achievement";
import { evaluateAchievementsForUser } from "@/lib/gamification/achievementsEngine";
import { subDays } from "date-fns";
import { z } from "zod";

/**
 * GET handler for achievements
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * - status: "all" | "unlocked" | "available" | "locked" (default: "all")
 * - category: string - Filter by achievement category
 * - rarity: "common" | "rare" | "epic" | "legendary" - Filter by rarity
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
    const url = new URL(request.url);
    const query = {
      page: Math.max(1, parseInt(url.searchParams.get("page") || "1")),
      limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20"))),
      status: url.searchParams.get("status") || "all",
      category: url.searchParams.get("category") || undefined,
      rarity: url.searchParams.get("rarity") || undefined,
    };

    // Validate query parameters
    const validatedQuery = AchievementsQuerySchema.parse(query);

    const { page, limit, status, category, rarity } = validatedQuery;

    // Get user's unlocked achievements
    const unlockedAchievements = await getUserAchievements(userId, {
      limit: 1000, // Get all for filtering
    });

    // Get all available achievements
    const allAchievements = await getAchievementsByCategory(category);

    // Filter by rarity if specified
    const filteredAchievements = rarity 
      ? allAchievements.filter(achievement => achievement.rarity === rarity)
      : allAchievements;

    // Get user's achievement context for progress calculation
    const recentUnlocksDate = subDays(new Date(), 30);
    const recentUnlocks = unlockedAchievements.filter(
      ua => ua.unlockedAt > recentUnlocksDate
    );

    // Evaluate achievements to get progress information
    const evaluationResult = await evaluateAchievementsForUser(userId, {
      currentLevel: user.level || 1,
      currentStreak: user.streaks?.current || user.currentStreak || 0,
      totalTasksCompleted: 0, // This would need to be calculated from activity logs
      totalTasksCreated: 0, // This would need to be calculated
      highPriorityTasksCompleted: 0, // This would need to be calculated
      tasksCompletedToday: 0, // This would need to be calculated
      achievementsUnlocked: unlockedAchievements.length,
    });

    // Build achievement list with user progress
    const achievementsWithProgress = filteredAchievements.map(achievement => {
      const userAchievement = unlockedAchievements.find(ua => ua.achievementKey === achievement.key);
      const isUnlocked = !!userAchievement;
      const progress = evaluationResult.notUnlocked.includes(achievement.key) ? 0 : 1;

      return {
        ...achievement,
        isUnlocked,
        unlockedAt: userAchievement?.unlockedAt?.toISOString(),
        progress,
      };
    });

    // Filter based on status
    let filteredResults = achievementsWithProgress;
    switch (status) {
      case "unlocked":
        filteredResults = achievementsWithProgress.filter(a => a.isUnlocked);
        break;
      case "available":
        filteredResults = achievementsWithProgress.filter(a => !a.isUnlocked && a.progress > 0);
        break;
      case "locked":
        filteredResults = achievementsWithProgress.filter(a => !a.isUnlocked && a.progress === 0);
        break;
      // "all" - no filtering needed
    }

    // Pagination
    const total = filteredResults.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    // Build response data
    const responseData = {
      unlocked: unlockedAchievements.map(ua => ({
        key: ua.achievementKey,
        title: ua.achievementTitle || ua.achievementKey,
        description: "", // Would need to fetch from achievement definition
        rarity: "common" as const, // Would need to fetch from achievement definition
        category: "", // Would need to fetch from achievement definition
        xpReward: 0, // Would need to fetch from achievement definition
        unlockedAt: ua.unlockedAt.toISOString(),
        isUnlocked: true,
      })),
      available: paginatedResults,
      totalUnlocked: unlockedAchievements.length,
      totalAvailable: filteredResults.length,
      recentUnlocks: recentUnlocks.map(ua => ({
        key: ua.achievementKey,
        title: ua.achievementTitle || ua.achievementKey,
        unlockedAt: ua.unlockedAt.toISOString(),
        isUnlocked: true,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: endIndex < total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Validate response
    const validatedData = AchievementsResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "Achievements retrieved successfully")
    );

  } catch (error) {
    return handleApiError(error, "Achievements API GET");
  }
}