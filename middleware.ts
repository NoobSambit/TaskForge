export { auth as middleware } from "lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/tasks/:path*", "/settings/:path*", "/api/tasks/:path*"],
};
