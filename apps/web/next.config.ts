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
    value: "camera=(), microphone=(), geolocation=()",
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
  headers: () =>
    Promise.resolve([{ source: "/(.*)", headers: securityHeaders }]),
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
  },
};

export default nextConfig;
