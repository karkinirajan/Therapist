import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-only same-origin proxy helpers for the FastAPI auth endpoints.
 *
 * The browser must never call the FastAPI origin directly — it only ever
 * talks to this Next.js app's own origin (keeping `connect-src 'self'`
 * true in the CSP), and this module forwards the request server-side.
 * `API_BASE_URL` is deliberately NOT `NEXT_PUBLIC_*` so it never ships to
 * the client bundle.
 */

const REFRESH_COOKIE = "refresh_token";

function getApiBaseUrl(): string {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new Error(
      "API_BASE_URL is not set. Add it to your .env.local (see .env.example).",
    );
  }
  return base.replace(/\/$/, "");
}

/**
 * Proxies a request to `${API_BASE_URL}${apiPath}`, forwarding the request
 * body and the incoming `refresh_token` cookie, and passing FastAPI's
 * `Set-Cookie` response header through to the browser untouched so the
 * httpOnly refresh cookie round-trips correctly.
 */
export async function proxyToApi(
  request: NextRequest,
  apiPath: string,
): Promise<NextResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const targetUrl = `${apiBaseUrl}${apiPath}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  headers.set("accept", "application/json");

  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshCookie) {
    headers.set("cookie", `${REFRESH_COOKIE}=${refreshCookie}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  let apiResponse: Response;
  try {
    apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the authentication service." },
      { status: 502 },
    );
  }

  const responseBody = await apiResponse.text();
  const response = new NextResponse(responseBody || null, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
  });

  const responseContentType = apiResponse.headers.get("content-type");
  if (responseContentType) {
    response.headers.set("content-type", responseContentType);
  }

  // Forward every Set-Cookie header to the browser. FastAPI scopes the
  // refresh cookie to Path=/auth, which was correct when the browser
  // talked to FastAPI directly. Now that the cookie is set against *this*
  // origin instead, that scoping needs to change on two counts:
  //  1. The proxy routes that need to read it back live under /api/auth,
  //     not /auth, so a literal passthrough would never be re-attached to
  //     our own /api/auth/refresh etc. requests.
  //  2. middleware.ts also needs to see this cookie on *every* protected
  //     route (/checkin, /dashboard, ...) to do its redirect check — and
  //     those routes are outside any /auth-prefixed path entirely.
  // Rescoping to Path=/ satisfies both: the cookie stays HttpOnly (never
  // readable by JS either way) and is simply visible to the whole app on
  // this origin, matching how it's actually used here. Every other
  // attribute (HttpOnly, SameSite, Secure, Max-Age, value) passes through
  // as-is.
  const setCookieHeaders = apiResponse.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookieHeaders) {
    const rescoped = cookie.replace(/Path=\/auth\b/i, "Path=/");
    response.headers.append("set-cookie", rescoped);
  }

  return response;
}
