import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // "/" is left disallowed for now — it's still the old dual-purpose
        // dashboard page (out of scope for this change) and is expected to
        // become the new public landing page in a future pass, at which
        // point this should be revisited.
        allow: ["/about", "/policy", "/terms", "/faq"],
        disallow: "/",
      },
    ],
  };
}
