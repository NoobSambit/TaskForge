/**
 * Gamification snapshot API endpoint
 * 
 * Provides a current snapshot of the user's gamification state
 * for the polling fallback mechanism.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/models/User";
import { getUserAchievements } from "@/models/UserAchievement";
import type { GamificationSnapshot } from "@/lib/gamification/polling";

/**
 * GET handler for gamification snapshot
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const userId = session.user.id;

    // Get user data
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get recent achievements (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentAchievements = await getUserAchievements(userId, {
      unlockedAfter: twentyFourHoursAgo,
      limit: 10,
    });

    // Build snapshot
    const snapshot: GamificationSnapshot = {
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streaks?.current || user.currentStreak || 0,
      recentAchievements: recentAchievements.map(ua => ({
        key: ua.achievementKey,
        title: ua.achievementTitle || ua.achievementKey,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      unlockedThemes: user.unlockedThemes || [],
      timestamp: new Date().toISOString(),
    };

    // Add cache control headers
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    console.error("Error fetching gamification snapshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}