import Link from "next/link";

const LINK_SECTIONS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/safety", label: "Safety" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

/**
 * Site footer — applies the same chrome background as the nav (darkest in
 * dark mode / lightest in light mode) so they bookend the page as a matched
 * pair. Extracted from layout.tsx once it grew past a single disclaimer
 * line (brand + tagline + link sections + the existing prescriber/crisis
 * disclaimer + a copyright line).
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-chrome text-chrome-foreground">
      {/* No `mx-auto` — matches the left-justified content column above it. */}
      <div className="max-w-5xl space-y-8 px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-2">
            <span className="text-sm font-semibold tracking-tight">Therapist</span>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A structured, CBT-based accountability layer for ADHD and OCD — built to work
              alongside your existing treatment, not replace it.
            </p>
          </div>

          {LINK_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h2>
              <ul className="space-y-1.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="underline-offset-2 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Not a substitute for your prescriber. In a crisis, use{" "}
            <Link href="/safety" className="underline underline-offset-2 hover:text-chrome-foreground">
              Safety
            </Link>
            , not this workflow. See the{" "}
            <Link href="/policy" className="underline underline-offset-2 hover:text-chrome-foreground">
              Privacy Policy
            </Link>{" "}
            for what&apos;s collected and how it&apos;s stored.
          </p>
          <p>&copy; {year} Therapist. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
