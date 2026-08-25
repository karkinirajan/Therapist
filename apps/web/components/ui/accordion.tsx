"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion(props: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex w-full items-center justify-between py-4 text-left text-sm font-medium",
          "transition-all hover:text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          "[&[data-panel-open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionPanel({
  className,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "overflow-hidden text-sm text-muted-foreground",
        "data-[open]:animate-in data-[closed]:animate-out",
        "data-[closed]:fade-out-0 data-[open]:fade-in-0",
        "data-[closed]:slide-up-4 data-[open]:slide-down-4",
        className
      )}
      {...props}
    />
  );
}

function AccordionContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="accordion-content"
      className={cn("pb-4 leading-relaxed", className)}
      {...props}
    />
  );
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
  AccordionContent,
};
