import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /checkins (create + list check-ins). */

function handler(request: NextRequest) {
  return proxyToApi(request, `/checkins${request.nextUrl.search}`);
}

export { handler as GET, handler as POST };
