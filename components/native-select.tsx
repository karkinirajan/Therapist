import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Plain native <select>, styled to match the Input/Textarea primitives — avoids
 * wiring up the unused Base UI Select composition for a handful of simple pickers. */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-field px-3 pr-8 text-sm text-foreground shadow-sm transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
