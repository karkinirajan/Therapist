import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /roadmap/advance. */

export function POST(request: NextRequest) {
  return proxyToApi(request, "/roadmap/advance");
}
