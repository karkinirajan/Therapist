"use client";

import React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border bg-clip-padding px-4 py-2 text-center text-sm leading-tight font-medium text-foreground whitespace-normal wrap-break-word transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        xs: "min-h-7 px-2.5 py-1 text-xs rounded-md",
        sm: "min-h-8 px-3 py-1.5 text-xs rounded-md",
        lg: "min-h-11 px-6 py-2.5 text-base",
        xl: "min-h-12 px-8 py-3 text-base rounded-xl",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
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

  // asChild: forward to Base UI's render prop pattern with the original child element.
  if (asChild && React.isValidElement(children)) {
    return (
      <ButtonPrimitive
        data-slot="button"
        render={children}
        nativeButton={false}
        className={cls}
        {...props}
      />
    );
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
