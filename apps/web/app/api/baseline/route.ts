import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /baseline (create/get/redo the one-time intake snapshot). */

function handler(request: NextRequest) {
  return proxyToApi(request, "/baseline");
}

export { handler as GET, handler as POST, handler as PUT };
