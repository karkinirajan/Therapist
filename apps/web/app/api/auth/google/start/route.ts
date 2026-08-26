import { NextResponse } from "next/server";

/**
 * Plain redirect proxy to FastAPI's Google OAuth authorize endpoint.
 * No body/cookie forwarding needed — this is a straight 307 so the
 * browser's top-level navigation lands on Google's consent screen.
 */
export function GET() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json(
      { detail: "API_BASE_URL is not configured." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(
    `${apiBaseUrl.replace(/\/$/, "")}/auth/google/authorize`,
    { status: 307 },
  );
}
