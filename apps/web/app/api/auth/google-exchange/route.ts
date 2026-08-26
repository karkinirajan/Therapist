import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/**
 * Proxies the one-time OAuth exchange code to FastAPI's
 * POST /auth/google/exchange, forwarding cookies the same way the main
 * auth proxy does.
 */
export function POST(request: NextRequest) {
  return proxyToApi(request, "/auth/google/exchange");
}
