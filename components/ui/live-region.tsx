import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A polite live region. A screen reader announces its text when that text
 * changes and never before, which is what an activity line needs: one sentence
 * per step, not one per second.
 */
function LiveRegion({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-atomic="true"
      aria-live="polite"
      className={cn("sr-only", className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Content drawn for sighted readers only, such as a clock that ticks while a
 * step runs. It is hidden from assistive technology so the same sentence is
 * never read out again on every tick.
 */
function Decorative({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span aria-hidden="true" className={className} {...props}>
      {children}
    </span>
  );
}

export { Decorative, LiveRegion };
