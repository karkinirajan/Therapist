import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy for FastAPI's POST /voice/tts - deliberately NOT using
 * lib/auth-proxy.ts's `proxyToApi`, since that helper buffers the response
 * through `.text()`, which corrupts binary audio (UTF-8 decode/re-encode is
 * lossy for arbitrary bytes). This forwards the response body as an
 * ArrayBuffer instead, preserving the MP3 bytes exactly.
 */
export async function POST(request: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ detail: "API_BASE_URL is not configured." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const body = await request.text();

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/voice/tts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Unable to reach the voice service." }, { status: 502 });
  }

  const responseBody = await apiResponse.arrayBuffer();
  return new NextResponse(responseBody, {
    status: apiResponse.status,
    headers: {
      "content-type": apiResponse.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
