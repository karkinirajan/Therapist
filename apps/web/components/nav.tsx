"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/api-client";

const ANON_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/tools", label: "CBT Tools" },
  { href: "/progress", label: "Progress" },
  { href: "/intake", label: "Intake" },
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

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentUser = useCurrentUser();
  const LINKS = currentUser.data ? AUTHED_LINKS : ANON_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* No `mx-auto` — matches the left-justified content column below it. */}
      <div className="flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href={currentUser.data ? "/dashboard" : "/"}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          CBT Recovery
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
        </nav>
      )}
    </header>
  );
}
