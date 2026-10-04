import { proxyToApi } from "@/lib/auth-proxy";
import { type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  return proxyToApi(request, "/me/export");
}
