import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /me/gate-state — drives the hard-gate UI. */

export function GET(request: NextRequest) {
  return proxyToApi(request, "/me/gate-state");
}
