import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /tracking/entries (record + list tracking entries). */

function handler(request: NextRequest) {
  return proxyToApi(request, `/tracking/entries${request.nextUrl.search}`);
}

export { handler as GET, handler as POST };
