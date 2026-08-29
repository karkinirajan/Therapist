import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Providers } from "@/lib/providers";

// JetBrains Mono, used for the entire app — nav, footer, headings, body,
// forms, buttons — not just a single code-styled surface. See globals.css
// for the full rationale (including the mono-body-readability mitigation).
// One font load covers both --font-sans and --font-mono (consolidated in
// globals.css) so there's a single mono voice everywhere instead of two.
// Weights 400-800 cover body copy through the boldest headings without
// relying on synthetic bold (font-synthesis is disabled).
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-vars",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Therapist",
  title: {
    default: "Therapist — CBT Accountability for ADHD & OCD",
    template: "%s | Therapist",
  },
  description:
    "A structured CBT-based recovery and life-systems coaching tool for ADHD and OCD: intake, daily/weekly/monthly tracking, a 6-month roadmap, CBT and ERP technique guidelines, and progress tracking.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontMono.variable}>
      <body className="antialiased">
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="min-h-screen bg-background">
            <Nav />
            {/* No `mx-auto` — content is capped at max-w-5xl for line-length
                but hugs the left edge on sm+ instead of floating centered
                in the viewport. Full-width on mobile either way. */}
            <main id="main-content" className="max-w-5xl px-4 py-8">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
