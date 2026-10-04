import { proxyToApi } from "@/lib/auth-proxy";
import { type NextRequest } from "next/server";

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => proxyToApi(request, `/voice/sessions/${id}/socket-ticket`));
}
