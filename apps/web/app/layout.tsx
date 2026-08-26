import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
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
    "A structured CBT-based recovery and life-systems coaching tool: intake, check-ins, a 6-month roadmap, CBT technique guidelines, and progress tracking. All data stays on this device.",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
              All data stays in this browser (local storage) — nothing is sent anywhere. Not a
              substitute for your prescriber. In a crisis, use{" "}
              <a href="/safety" className="underline underline-offset-2">
                Safety
              </a>
              , not this workflow.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
