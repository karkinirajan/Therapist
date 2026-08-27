import { NextResponse, type NextRequest } from "next/server";

// Route prefixes that require a signed-in user. `/safety` is intentionally
// excluded — the crisis-support page must always be reachable, signed in or
// not.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/intake",
  "/checkin",
  "/roadmap",
  "/tools",
  "/progress",
  "/account",
  "/tracking",
];

const REFRESH_COOKIE = "refresh_token";

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * UX-only gate: redirects to /login when the refresh-token cookie is
 * missing. This cannot verify the cookie's signature or validity — edge
 * middleware has no way to call FastAPI to check that without adding
 * latency to every request — so it is not the security boundary. Real
 * enforcement happens server-side in FastAPI on every authenticated
 * request.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE);
  if (hasRefreshCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/intake/:path*",
    "/checkin/:path*",
    "/roadmap/:path*",
    "/tools/:path*",
    "/progress/:path*",
    "/account/:path*",
    "/tracking/:path*",
  ],
};
