import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateUserTheme } from "@/lib/gamification/themeUnlock";

/**
 * PUT /api/themes/[themeId] - Update user's active theme
 * 
 * Updates the authenticated user's active theme to the specified themeId.
 * The user must have already unlocked the theme.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { themeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const themeId = params.themeId;
    const userId = session.user.id;

    // Validate themeId parameter
    if (!themeId || typeof themeId !== "string") {
      return NextResponse.json(
        { error: "Invalid theme ID" },
        { status: 400 }
      );
    }

    // Update user's theme
    const updatedUser = await updateUserTheme(userId, themeId);

    return NextResponse.json({
      success: true,
      theme: themeId,
      user: {
        id: updatedUser._id,
        theme: updatedUser.theme,
        unlockedThemes: updatedUser.unlockedThemes,
      },
    });
  } catch (error) {
    console.error("Error updating theme:", error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("not unlocked")) {
        return NextResponse.json(
          { error: "Theme is not unlocked. Complete more levels to unlock this theme." },
          { status: 403 }
        );
      }
      if (error.message.includes("does not exist")) {
        return NextResponse.json(
          { error: "Theme does not exist" },
          { status: 404 }
        );
      }
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 }
    );
  }
}