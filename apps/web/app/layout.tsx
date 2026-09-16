import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Providers } from "@/lib/providers";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-vars",
  display: "swap",
});

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-vars",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-vars",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_DESCRIPTION =
  "A structured CBT-based recovery and life-systems coaching tool for ADHD and OCD: intake, daily/weekly/monthly tracking, a 6-month roadmap, CBT and ERP technique guidelines, and progress tracking.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Therapist",
  title: {
    default: "Therapist — CBT Accountability for ADHD & OCD",
    template: "%s | Therapist",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "ADHD accountability",
    "OCD accountability",
    "CBT tracker",
    "ERP tracking",
    "ADHD tool",
    "OCD tool",
    "cognitive behavioral therapy app",
  ],
  authors: [{ name: "Therapist" }],
  // Root default is noindex/nofollow (the authenticated app) — public
  // marketing pages (/, /about, /policy, /terms, /faq) explicitly opt back
  // in via their own metadata.robots, matching app/robots.ts's rules.
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    siteName: "Therapist",
    title: "Therapist — CBT Accountability for ADHD & OCD",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Therapist" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Therapist — CBT Accountability for ADHD & OCD",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#070707" },
    { media: "(prefers-color-scheme: dark)", color: "#070707" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}>
      <body className="antialiased font-sans">
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="min-h-screen bg-background bg-grid">
            <Nav />
            {/* Content is capped at max-w-7xl and centered in the viewport.
                Full-width on mobile. */}
            <main id="main-content" className="mx-auto max-w-7xl px-4 py-8">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
