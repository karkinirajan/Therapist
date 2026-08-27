import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /tracking/categories (the 6 seeded categories). */

export function GET(request: NextRequest) {
  return proxyToApi(request, "/tracking/categories");
}
