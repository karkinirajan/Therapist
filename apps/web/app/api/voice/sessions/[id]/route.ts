import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's GET /voice/sessions/{id}. */
async function handler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToApi(request, `/voice/sessions/${id}`);
}

export { handler as GET };
