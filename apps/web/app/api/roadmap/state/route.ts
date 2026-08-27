import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /roadmap/state. */

export function GET(request: NextRequest) {
  return proxyToApi(request, "/roadmap/state");
}
