import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Therapist — CBT Accountability for ADHD & OCD",
    short_name: "Therapist",
    description:
      "A structured CBT-based accountability platform for ADHD and OCD.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0e0e",
    theme_color: "#eb5e28",
    icons: [{ src: "/icon", sizes: "32x32", type: "image/png" }],
  };
}
