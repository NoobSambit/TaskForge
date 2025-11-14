/**
 * User Preferences API endpoint
 * 
 * GET /api/gamification/preferences - Get user preferences
 * PATCH /api/gamification/preferences - Update user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  handleApiError,
  createSuccessResponse,
  withCacheHeaders,
} from "@/lib/gamification/apiHelpers";
import User, { IGamificationPreferences } from "@/models/User";
import { z } from "zod";

// Validation schema for preferences
const PreferencesSchema = z.object({
  leaderboardOptIn: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
  timezone: z.string().optional(),
}).strict();

type PreferencesInput = z.infer<typeof PreferencesSchema>;

/**
 * GET handler for user preferences
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { user } = auth;

    const preferences = {
      leaderboardOptIn: user.preferences?.leaderboardOptIn ?? true,
      anonymousMode: user.preferences?.anonymousMode ?? false,
      timezone: user.preferences?.timezone,
    };

    return withCacheHeaders(
      createSuccessResponse(preferences, "Preferences retrieved successfully")
    );
  } catch (error) {
    return handleApiError(error, "Preferences API GET");
  }
}

/**
 * PATCH handler for updating user preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const { userId } = auth;

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate preferences
    const preferences = PreferencesSchema.parse(body);

    // Build update object
    const updates: Record<string, any> = {};
    if (preferences.leaderboardOptIn !== undefined) {
      updates["preferences.leaderboardOptIn"] = preferences.leaderboardOptIn;
    }
    if (preferences.anonymousMode !== undefined) {
      updates["preferences.anonymousMode"] = preferences.anonymousMode;
    }
    if (preferences.timezone !== undefined) {
      updates["preferences.timezone"] = preferences.timezone;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, lean: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updatedPreferences = {
      leaderboardOptIn: updatedUser.preferences?.leaderboardOptIn ?? true,
      anonymousMode: updatedUser.preferences?.anonymousMode ?? false,
      timezone: updatedUser.preferences?.timezone,
    };

    return createSuccessResponse(updatedPreferences, "Preferences updated successfully");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preferences", details: error.errors },
        { status: 400 }
      );
    }
    return handleApiError(error, "Preferences API PATCH");
  }
}
