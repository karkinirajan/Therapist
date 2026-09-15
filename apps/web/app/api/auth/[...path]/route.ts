import { NextResponse, type NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/**
 * Same-origin proxy for the FastAPI auth endpoints (signup, login, refresh,
 * logout, me, and the Google OAuth authorize redirect). The browser only
 * ever calls this Next.js route; the actual FastAPI origin never reaches
 * client JS.
 *
 * /api/auth/google/start and /api/auth/google-exchange are handled by their
 * own more specific route files, which Next.js matches before this
 * catch-all.
 */

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiPath = `/auth/${path.join("/")}${request.nextUrl.search}`;

  // Every anonymous page load calls useCurrentUser(), which attempts a
  // silent refresh via POST /api/auth/refresh. For a signed-out visitor
  // there's no refresh_token cookie at all, so that request is guaranteed
  // to fail - short-circuit here with the exact same 401 shape FastAPI
  // would return, instead of paying a full network round-trip to the
  // backend for a request we already know can't succeed. (The 401 status
  // itself is load-bearing - lib/api-client.ts's refresh() specifically
  // checks for it - so this only saves the wasted hop, it doesn't change
  // the response contract.)
  if (path.join("/") === "refresh" && request.method === "POST" && !request.cookies.has("refresh_token")) {
    return NextResponse.json({ detail: "Missing refresh token" }, { status: 401 });
  }

  return proxyToApi(request, apiPath);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
