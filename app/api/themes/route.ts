import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getAvailableThemesForUser, 
  getUserThemeStatus, 
  getFutureThemeUnlocks 
} from "@/lib/gamification/themeUnlock";

/**
 * GET /api/themes - Get available themes for the authenticated user
 * 
 * Query parameters:
 * - status: "all" | "available" | "locked" | "future" (default: "all")
 *   - "all": Return all themes with user's unlock status
 *   - "available": Return only unlocked themes
 *   - "locked": Return only themes that are locked but available at current level
 *   - "future": Return only themes that will be unlocked at future levels
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const userId = session.user.id;

    switch (status) {
      case "available": {
        const themes = await getAvailableThemesForUser(userId);
        return NextResponse.json({ themes });
      }

      case "future": {
        const futureUnlocks = await getFutureThemeUnlocks(userId);
        return NextResponse.json({ futureUnlocks });
      }

      default: {
        // "all" or any other value - return comprehensive status
        const themeStatus = await getUserThemeStatus(userId);
        return NextResponse.json(themeStatus);
      }
    }
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}