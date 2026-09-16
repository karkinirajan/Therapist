import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /voice/sessions (start + list sessions). */
function handler(request: NextRequest) {
  return proxyToApi(request, `/voice/sessions${request.nextUrl.search}`);
}

export { handler as GET, handler as POST };
