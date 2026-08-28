import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Matches --primary in globals.css (oklch(0.36 0.13 288) ≈ this
          // hex) — ImageResponse can't consume CSS custom properties, so this
          // is kept in sync by hand whenever the palette changes.
          background: "#3d2b7c",
          borderRadius: 8,
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        C
      </div>
    ),
    size,
  );
}
