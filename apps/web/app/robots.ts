import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // "/" is now the public marketing landing page (server component,
        // no auth-gated content) — indexable alongside the other public
        // marketing/legal pages. Everything else defaults to noindex via
        // the root layout's metadata.robots.
        allow: ["/", "/about", "/policy", "/terms", "/faq", "/safety"],
        disallow: ["/dashboard", "/checkin", "/roadmap", "/tools", "/progress", "/account", "/tracking", "/intake"],
      },
    ],
  };
}
