import { type NextRequest, NextResponse } from "next/server";

/**
 * Redirects the browser to /auth/google/authorize on this app's own origin
 * (never the internal API origin directly — browsers can't resolve the
 * Compose-internal API_BASE_URL, e.g. http://api:8000). next.config.ts's
 * rewrite forwards that request to FastAPI server-side.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/google/authorize", request.url), {
    status: 307,
  });
}
