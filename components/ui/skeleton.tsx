import { cn } from "@/lib/utils";

/**
 * A block that stands in for content that is still arriving.
 *
 * The block is decorative, so it is hidden from assistive technology. A
 * screen reader should read the content when it lands, not a row of empty
 * grey boxes.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
