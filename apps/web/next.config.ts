import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ]
      .join("; ")
      .trim(),
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    // microphone=(self) — required for the voice therapy feature's
    // SpeechRecognition capture. Was microphone=() (blocked entirely)
    // before that feature existed; camera/geolocation stay blocked, this
    // app has no use for either.
    value: "camera=(), microphone=(self), geolocation=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Standalone output traces the minimal set of files/deps needed to run
  // `node server.js` and copies them into `.next/standalone` — lets the
  // Docker production image skip shipping full node_modules. No effect on
  // the Vercel deploy path (Vercel ignores `output` and uses its own build
  // pipeline) or on `next dev`/`next build` locally; it only changes what
  // `next build` additionally emits under `.next/standalone` and
  // `.next/static`.
  output: "standalone",
  // The Docker build context is the monorepo root (see apps/web/Dockerfile),
  // so node_modules ends up hoisted one level above this app by npm
  // workspaces. Without this, `output: "standalone"`'s file tracer assumes
  // apps/web itself is the project root and can miss hoisted dependencies
  // when copying into .next/standalone, producing an image that's missing
  // packages at runtime. Pointing it at the actual repo root (two levels up
  // from this file) makes the trace match the real dependency layout.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  headers: () =>
    Promise.resolve([{ source: "/(.*)", headers: securityHeaders }]),
  // Google's OAuth redirect_uri (registered in Google Cloud Console) has to
  // be a real, browser-reachable URL under this app's own public origin —
  // FastAPI can't be that URL directly, since it's never publicly exposed
  // (see deploy/ec2/nginx.conf's comment). This rewrite makes
  // /auth/google/authorize and /auth/google/callback resolve on this app's
  // origin for the browser, while Next's own server proxies the actual
  // request to FastAPI's API_BASE_URL (which only needs to be reachable
  // server-to-server, e.g. the Compose-internal http://api:8000 - never
  // resolvable from the browser itself).
  rewrites: () =>
    Promise.resolve([
      {
        source: "/auth/google/:path*",
        destination: `${process.env.API_BASE_URL ?? "http://localhost:8000"}/auth/google/:path*`,
      },
    ]),
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
  },
};

export default nextConfig;
