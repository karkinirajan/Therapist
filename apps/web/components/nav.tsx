"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api-client";

// Signed-out visitors land on the marketing site, not the app — every other
// item that used to be here (`/checkin`, `/roadmap`, `/tools`, `/progress`,
// `/intake`) is gated by proxy.ts's PROTECTED_PREFIXES and would just bounce
// straight back to /login, so linking them from a signed-out nav was dead
// weight even before this pass. Login/Signup are rendered as buttons
// alongside Crisis Support instead of living in this link list.
const ANON_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

// Signed-in users get the real API-backed pages instead of the legacy
// localStorage ones, plus an Account link (accessible link, not just a
// dropdown-only affordance).
const AUTHED_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/tools", label: "CBT Tools" },
  { href: "/progress", label: "Progress" },
  { href: "/account", label: "Account" },
];

/** Small geometric wordmark — a rounded square in the accent color with a
 * "T" for Therapist, matching app/icon.tsx's favicon so the same mark
 * appears both in the tab and in the nav. Kept deliberately simple
 * (a shape + a letter, not an illustration). */
function Logomark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      className="shrink-0 rounded-md"
    >
      <rect width="24" height="24" rx="6" fill="#124559" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="var(--font-sans)"
        fill="#f8f9fa"
      >
        T
      </text>
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentUser = useCurrentUser();
  const LINKS = currentUser.data ? AUTHED_LINKS : ANON_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-chrome/95 backdrop-blur supports-[backdrop-filter]:bg-chrome/80">
      {/* No `mx-auto` — matches the left-justified content column below it. */}
      <div className="flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href={currentUser.data ? "/dashboard" : "/"}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-chrome-foreground"
        >
          <Logomark />
          Therapist
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!currentUser.data && (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          <Button asChild variant="destructive" size="sm" className="gap-1.5">
            <Link href="/safety">
              <LifeBuoy className="size-4" />
              <span className="hidden sm:inline">Crisis Support</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-0.5 border-t border-border px-4 py-2 md:hidden">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {!currentUser.data && (
            <div className="mt-1 flex gap-2 border-t border-border pt-2 sm:hidden">
              <Button asChild variant="ghost" size="sm" className="flex-1" onClick={() => setOpen(false)}>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="flex-1" onClick={() => setOpen(false)}>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
