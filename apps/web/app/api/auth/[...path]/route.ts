import type { NextRequest } from "next/server";
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
  return proxyToApi(request, apiPath);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
