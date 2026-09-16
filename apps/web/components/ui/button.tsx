"use client";

import React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

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
