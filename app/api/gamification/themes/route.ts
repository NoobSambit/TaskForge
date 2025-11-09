/**
 * Themes API endpoint
 * 
 * GET /api/gamification/themes - Get user's available themes
 * PATCH /api/gamification/themes - Update user's equipped theme
 */

import { NextRequest } from "next/server";
import { 
  authenticateRequest, 
  handleApiError, 
  createSuccessResponse,
  withCacheHeaders
} from "@/lib/gamification/apiHelpers";
import { 
  ThemesResponseSchema,
  UpdateThemeRequestSchema,
  ThemesQuerySchema
} from "@/lib/gamification/apiSchemas";
import { updateUserGamification } from "@/models/User";
import { 
  getAvailableThemesForUser, 
  getUserThemeStatus, 
  getFutureThemeUnlocks 
} from "@/lib/gamification/themeUnlock";
import { z } from "zod";

/**
 * GET handler for themes
 * 
 * Query parameters:
 * - status: "all" | "available" | "locked" | "future" (default: "all")
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
      status: url.searchParams.get("status") || "all",
    };

    // Validate query parameters
    const validatedQuery = ThemesQuerySchema.parse(query);
    const { status } = validatedQuery;

    // Get theme information
    const allThemes = await getUserThemeStatus(userId);
    const userLevel = user.level || 1;

    // Filter themes based on status
    let filteredThemes = allThemes;
    switch (status) {
      case "available":
        filteredThemes = allThemes.filter(theme => theme.isUnlocked);
        break;
      case "locked":
        filteredThemes = allThemes.filter(theme => !theme.isUnlocked && theme.requiredLevel <= userLevel + 5);
        break;
      case "future":
        filteredThemes = allThemes.filter(theme => theme.requiredLevel > userLevel + 5);
        break;
      // "all" - no filtering needed
    }

    // Get future unlocks
    const futureUnlocks = await getFutureThemeUnlocks(userId);

    // Build response data
    const responseData = {
      themes: filteredThemes,
      equipped: user.theme || "default",
      unlockedCount: allThemes.filter(theme => theme.isUnlocked).length,
      totalCount: allThemes.length,
      futureUnlocks,
    };

    // Validate response
    const validatedData = ThemesResponseSchema.parse(responseData);

    return withCacheHeaders(
      createSuccessResponse(validatedData.data, "Themes retrieved successfully")
    );

  } catch (error) {
    return handleApiError(error, "Themes API GET");
  }
}

/**
 * PATCH handler for updating user's equipped theme
 * 
 * Request body:
 * - themeId: string - The ID of the theme to equip
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, user } = auth;

    // Parse request body
    const body = await request.json();
    const validatedBody = UpdateThemeRequestSchema.parse(body);
    const { themeId } = validatedBody;

    // Get available themes for user
    const availableThemes = await getAvailableThemesForUser(userId);
    const isThemeAvailable = availableThemes.some(theme => theme.id === themeId);

    if (!isThemeAvailable) {
      return createSuccessResponse(
        { error: "Theme not available or not unlocked" },
        undefined,
        400
      );
    }

    // Update user's theme
    await updateUserGamification(userId, {
      theme: themeId,
    });

    return createSuccessResponse({
      themeId,
      previousTheme: user.theme || "default",
      message: "Theme updated successfully",
    }, "Theme equipped successfully");

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createSuccessResponse(
        { error: "Invalid request body", details: error.errors },
        undefined,
        400
      );
    }
    return handleApiError(error, "Themes API PATCH");
  }
}