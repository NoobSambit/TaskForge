/**
 * Helper utilities for gamification API endpoints
 * 
 * This module consolidates shared logic like authentication,
 * error handling, and common response patterns to avoid duplication
 * across gamification API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/models/User";
import type { IUser } from "@/models/User";

/**
 * Standard error response shapes
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  data: T;
  message?: string;
}

/**
 * Authenticate the request and return user information
 * 
 * @param request - The Next.js request object
 * @returns Object with userId and full user data, or error response
 */
export async function authenticateRequest(request: NextRequest): Promise<
  | { success: true; userId: string; user: IUser }
  | { success: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication required" } as ApiError,
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;
  
  // Load user data to ensure they exist
  const user = await getUserById(userId);
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "User not found" } as ApiError,
        { status: 404 }
      ),
    };
  }

  return { success: true, userId, user };
}

/**
 * Handle common API errors with consistent responses
 * 
 * @param error - The error object
 * @param context - Context description for logging
 * @returns NextResponse with appropriate error status
 */
export function handleApiError(
  error: any,
  context: string
): NextResponse {
  console.error(`Error in ${context}:`, error);

  // Handle specific error types
  if (error.name === "ValidationError") {
    return NextResponse.json(
      { 
        error: "Validation failed", 
        code: "VALIDATION_ERROR",
        details: error.message 
      } as ApiError,
      { status: 400 }
    );
  }

  if (error.name === "CastError") {
    return NextResponse.json(
      { 
        error: "Invalid ID format", 
        code: "INVALID_ID" 
      } as ApiError,
      { status: 400 }
    );
  }

  // Generic server error
  return NextResponse.json(
    { 
      error: "Internal server error", 
      code: "INTERNAL_ERROR" 
    } as ApiError,
    { status: 500 }
  );
}

/**
 * Create a standardized success response
 * 
 * @param data - The response data
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: SuccessResponse<T> = { data };
  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Parse and validate query parameters with defaults
 * 
 * @param request - The Next.js request object
 * @param params - Parameter definitions with defaults and validation
 * @returns Parsed parameters object
 */
export function parseQueryParams<T extends Record<string, any>>(
  request: NextRequest,
  params: {
    [K in keyof T]: {
      type: "string" | "number" | "boolean" | "string[]";
      default?: T[K];
      required?: boolean;
      validator?: (value: any) => boolean;
    };
  }
): T {
  const { searchParams } = new URL(request.url);
  const result: any = {};

  for (const [key, config] of Object.entries(params)) {
    const rawValue = searchParams.get(key);
    let value: any = rawValue;

    // Type conversion
    switch (config.type) {
      case "number":
        value = rawValue ? parseInt(rawValue, 10) : undefined;
        break;
      case "boolean":
        value = rawValue === "true" || rawValue === "1";
        break;
      case "string[]":
        value = rawValue ? rawValue.split(",").map(s => s.trim()) : [];
        break;
      // string: no conversion needed
    }

    // Validation
    if (value !== undefined && config.validator && !config.validator(value)) {
      throw new Error(`Invalid value for parameter '${key}'`);
    }

    // Required check
    if (config.required && (value === undefined || value === null)) {
      throw new Error(`Required parameter '${key}' is missing`);
    }

    // Default value
    if (value === undefined && config.default !== undefined) {
      value = config.default;
    }

    result[key] = value;
  }

  return result as T;
}

/**
 * Common cache control headers for gamification data
 */
export const GAMIFICATION_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * Apply cache control headers to a response
 * 
 * @param response - The NextResponse object
 * @returns Response with cache headers applied
 */
export function withCacheHeaders(response: NextResponse): NextResponse {
  Object.entries(GAMIFICATION_CACHE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}