import { cva } from "class-variance-authority";

// Pure styling logic, no React/browser dependency — deliberately kept out
// of button.tsx's "use client" boundary so Server Components can import
// just the class-string function (e.g. app/page.tsx's CTAs, which render a
// plain `<Link className={buttonVariants(...)}>` instead of the client
// `<Button>` component to avoid a Server-Component-children hydration
// mismatch — see that file's comment). "use client" makes every export of
// a file client-only, even a dependency-free function like this one, so it
// has to live in its own file to be importable from a Server Component.
export const buttonVariants = cva(
  // Single global button style, per explicit instruction: every text
  // button (regardless of `size`) shares the exact same padding —
  // py-2.5 px-4 with min-h-12 (double the former compact height) — defined once here on the base class rather
  // than per-size. `size` still varies text size for hierarchy (a hero CTA
  // still reads as more prominent than a compact nav button), just not box
  // height/padding. No forced `whitespace-nowrap`: a button's height grows
  // if its own text+icon content needs to wrap instead of
  // clipping/overflowing the box. `min-w-0` lets the text node itself
  // shrink/wrap inside a flex/grid parent narrower than the button's
  // natural content width.
  "inline-flex min-h-12 w-auto max-w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-sm border bg-clip-padding px-4 py-2.5 text-center text-sm leading-tight font-medium text-foreground transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80",
        outline:
          "border-border bg-background text-foreground hover:bg-muted hover:text-foreground",
        ghost:
          "border-transparent text-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90",
        link: "border-transparent text-link underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "text-sm",
        xs: "text-xs",
        sm: "text-xs",
        lg: "text-base",
        xl: "text-base",
        icon: "size-12 p-0",
        "icon-sm": "size-12 p-0",
        "icon-lg": "size-14 min-h-14 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
