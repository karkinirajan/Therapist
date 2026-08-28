import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Providers } from "@/lib/providers";

// Plus Jakarta Sans: rounder terminals than Geist at the same weights, reads
// warmer/more elegant at bold display sizes while staying highly legible at
// body sizes — see globals.css for the full rationale. Loading weights
// 500-800 covers the app's range from body copy through bold headings
// without relying on synthetic bold (font-synthesis is disabled).
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sans-vars",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Therapist",
  title: {
    default: "CBT Recovery & Life-Systems Coach",
    template: "%s | CBT Recovery",
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
    <html lang="en" className={`${fontSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="min-h-screen bg-background">
            <Nav />
            <main id="main-content" className="mx-auto max-w-5xl px-4 py-8">
              {children}
            </main>
            <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-muted-foreground">
              Not a substitute for your prescriber. In a crisis, use{" "}
              <a href="/safety" className="underline underline-offset-2">
                Safety
              </a>
              , not this workflow. See the{" "}
              <a href="/policy" className="underline underline-offset-2">
                Privacy Policy
              </a>{" "}
              for what&apos;s collected and how it&apos;s stored.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
