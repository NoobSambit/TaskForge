import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Simple middleware for PWA - auth check moved to route level
  // Edge runtime doesn't support mongoose
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/tasks/:path*", "/settings/:path*"],
};
