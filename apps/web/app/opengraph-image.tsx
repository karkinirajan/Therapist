import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static social-preview image (OG/Twitter card) for every page that doesn't
// override it. Colors are hardcoded to match --background/--foreground/
// --primary in globals.css (dark theme values, teal/cyan palette) —
// ImageResponse can't consume CSS custom properties, so this is kept in
// sync by hand whenever the palette changes, same as app/icon.tsx.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#012f34",
          color: "#fcfeff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              background: "#037682",
              border: "2px solid #22e4f9",
              borderRadius: 12,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fcfeff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" />
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Therapist
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Structure the days willpower alone can&apos;t carry.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8ddbff", marginTop: 24, maxWidth: 820 }}>
          CBT-based accountability, built for ADHD &amp; OCD.
        </div>
      </div>
    ),
    size,
  );
}
