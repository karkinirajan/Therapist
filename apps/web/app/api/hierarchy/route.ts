import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /hierarchy (create + list exposure hierarchy items). */

function handler(request: NextRequest) {
  return proxyToApi(request, "/hierarchy");
}

export { handler as GET, handler as POST };
