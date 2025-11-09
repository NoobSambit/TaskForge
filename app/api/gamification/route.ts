/**
 * Gamification API index endpoint
 * 
 * GET /api/gamification - List all available gamification API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET handler for API index
 */
export async function GET(request: NextRequest) {
  // Check authentication but allow public access to endpoint listing
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user?.id;

  const baseUrl = new URL(request.url).origin;

  const endpoints = [
    {
      path: "/api/gamification",
      method: "GET",
      description: "List all available gamification API endpoints",
      authRequired: false,
    },
    {
      path: "/api/gamification/xp",
      method: "GET",
      description: "Get user's current XP and level information",
      authRequired: true,
      queryParams: {
        includeHistory: { type: "boolean", default: "false", description: "Include recent XP activity" },
        days: { type: "number", default: "7", description: "Number of days to include in history" },
      },
    },
    {
      path: "/api/gamification/level",
      method: "GET",
      description: "Get user's current level information and progress",
      authRequired: true,
      queryParams: {
        includeHistory: { type: "boolean", default: "false", description: "Include level progression history" },
      },
    },
    {
      path: "/api/gamification/streaks",
      method: "GET",
      description: "Get user's current streak information",
      authRequired: true,
      queryParams: {
        includeHistory: { type: "boolean", default: "false", description: "Include daily streak history" },
        days: { type: "number", default: "30", description: "Number of days to include in history" },
      },
    },
    {
      path: "/api/gamification/streaks",
      method: "POST",
      description: "Recalculate streaks from activity history",
      authRequired: true,
      body: {
        fromDate: { type: "string", optional: true, description: "ISO date string to start recalculation from" },
      },
    },
    {
      path: "/api/gamification/achievements",
      method: "GET",
      description: "Get user's achievements and available ones",
      authRequired: true,
      queryParams: {
        page: { type: "number", default: "1", description: "Page number" },
        limit: { type: "number", default: "20", description: "Items per page (max: 100)" },
        status: { type: "string", default: "all", description: "Filter: all, unlocked, available, locked" },
        category: { type: "string", optional: true, description: "Filter by achievement category" },
        rarity: { type: "string", optional: true, description: "Filter by rarity: common, rare, epic, legendary" },
      },
    },
    {
      path: "/api/gamification/themes",
      method: "GET",
      description: "Get user's available themes",
      authRequired: true,
      queryParams: {
        status: { type: "string", default: "all", description: "Filter: all, available, locked, future" },
      },
    },
    {
      path: "/api/gamification/themes",
      method: "PATCH",
      description: "Update user's equipped theme",
      authRequired: true,
      body: {
        themeId: { type: "string", required: true, description: "The ID of the theme to equip" },
      },
    },
    {
      path: "/api/gamification/activity",
      method: "GET",
      description: "Get user's gamification activity history",
      authRequired: true,
      queryParams: {
        page: { type: "number", default: "1", description: "Page number" },
        limit: { type: "number", default: "20", description: "Items per page (max: 100)" },
        activityType: { type: "string", optional: true, description: "Filter by activity type" },
        fromDate: { type: "string", optional: true, description: "ISO date string to filter from" },
        toDate: { type: "string", optional: true, description: "ISO date string to filter to" },
      },
    },
    {
      path: "/api/gamification/snapshot",
      method: "GET",
      description: "Get current gamification snapshot (polling fallback)",
      authRequired: true,
    },
    {
      path: "/api/gamification/events",
      method: "GET",
      description: "Server-Sent Events stream for real-time updates",
      authRequired: true,
    },
    {
      path: "/api/gamification/events",
      method: "HEAD",
      description: "Health check for SSE connection",
      authRequired: true,
    },
  ];

  const response = {
    title: "Gamification API",
    version: "1.0.0",
    description: "RESTful API for user gamification data including XP, levels, achievements, themes, and activity tracking",
    baseUrl,
    authenticated: isAuthenticated,
    endpoints: endpoints.map(endpoint => ({
      ...endpoint,
      url: `${baseUrl}${endpoint.path}`,
    })),
    responseFormats: {
      success: {
        type: "object",
        properties: {
          data: { type: "any" },
          message: { type: "string", optional: true },
        },
      },
      error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string", optional: true },
          details: { type: "any", optional: true },
        },
      },
    },
    statusCodes: {
      200: "Successful request",
      400: "Bad request - invalid parameters or body",
      401: "Unauthorized - authentication required",
      403: "Forbidden - insufficient permissions",
      404: "Not found - resource doesn't exist",
      500: "Internal server error",
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}