import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Mirrors robots.ts's "allow" list — only the public, indexable marketing
// pages. /safety is intentionally excluded even though it's crawlable
// (allowed in robots.ts) since it's a utility page, not a marketing
// destination worth ranking.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/policy", "/terms", "/faq"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
