import { NextResponse, type NextRequest } from "next/server";

/**
 * Browsers request /favicon.ico directly regardless of the <link rel="icon">
 * tag Next.js generates from app/icon.tsx — redirect that blind fetch to the
 * real dynamic icon instead of leaving it as a 404 (Lighthouse best-practices
 * flags unhandled console errors, and a 404 on every page load is one).
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/icon", request.url), { status: 308 });
}
