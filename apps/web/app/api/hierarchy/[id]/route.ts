import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/auth-proxy";

/** Same-origin proxy for FastAPI's /hierarchy/{id} (get/update/delete one item). */

async function handler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToApi(request, `/hierarchy/${id}`);
}

export { handler as GET, handler as PUT, handler as DELETE };
