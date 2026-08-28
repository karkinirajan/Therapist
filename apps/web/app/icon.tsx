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
          // Matches --primary in globals.css light-mode (Catppuccin Latte
          // mauve, #8839ef) — ImageResponse can't consume CSS custom
          // properties, so this is kept in sync by hand whenever the
          // palette changes.
          background: "#8839ef",
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
