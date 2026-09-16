import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /voice/memory-profile (get + delete). */
function handler(request: NextRequest) {
  return proxyToApi(request, "/voice/memory-profile");
}

export { handler as GET, handler as DELETE };
