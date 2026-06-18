import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Route-level auth gate (SPEC-001 FR-005, NFR-004).
 *
 * Runs on the server (Edge) for every request matching `config.matcher`.
 * If the session cookie is missing, redirect to /login with the original path
 * preserved as `?next=` for post-login return.
 *
 * (Next 16 `proxy` convention — successor to `middleware`.)
 */
export function proxy(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Protected routes (FR-005): creator dashboard, notifications, contracts.
  matcher: [
    "/dashboard/:path*",
    "/notifications/:path*",
    "/contracts/:path*",
  ],
};
