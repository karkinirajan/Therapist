"use client";

import React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // `min-h-*` (not `h-*`) + no forced `whitespace-nowrap` on the root: a
  // button's height grows if its own text+icon content needs to wrap
  // instead of clipping/overflowing the fixed box — the actual
  // responsiveness fix (buttons with a long label + icon, e.g. inside a
  // narrow mobile w-full card, now wrap onto a second line and grow taller
  // rather than bleeding past their rounded border). `gap-2` plus the
  // icon's own `shrink-0` keeps the icon from being squeezed when that
  // happens. `min-w-0` lets the text node itself shrink/wrap inside a
  // flex/grid parent narrower than the button's natural content width.
  "inline-flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-sm border bg-clip-padding text-center text-sm leading-tight font-medium text-foreground transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        default: "min-h-9 px-4 py-2",
        xs: "min-h-7 px-2.5 py-1 text-xs",
        sm: "min-h-8 px-3 py-1.5 text-xs",
        lg: "min-h-11 px-6 py-2.5 text-base",
        xl: "min-h-12 px-8 py-3 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends
    Omit<ButtonPrimitive.Props, "render">,
    VariantProps<typeof buttonVariants> {
  /** Merge props onto the immediate child element instead of a <button>. */
  asChild?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const cls = cn(buttonVariants({ variant, size, className }));

  // asChild: merge button styling/props directly onto the child element
  // (e.g. a next/link <Link>) instead of routing through Base UI's
  // ButtonPrimitive `render` prop. The child (an <a>) already has real
  // anchor semantics, so Base UI's synthetic button behavior isn't needed
  // here — and its `render`+`nativeButton={false}` combination produced a
  // genuine SSR/hydration mismatch (server emitted a <button>, client
  // hydrated to an <a>), which this sidesteps entirely.
  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      ...props,
      "data-slot": "button",
      className: cn(cls, children.props.className),
    } as React.ComponentProps<"a">);
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cls}
      nativeButton={true}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
