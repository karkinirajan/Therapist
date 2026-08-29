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
          // Matches --primary in globals.css (the #124559 accent, literal
          // in both light and dark) — ImageResponse can't consume CSS
          // custom properties, so this is kept in sync by hand whenever the
          // palette changes.
          background: "#124559",
          borderRadius: 8,
          color: "#f8f9fa",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        T
      </div>
    ),
    size,
  );
}
