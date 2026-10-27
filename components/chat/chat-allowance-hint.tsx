"use client";

import Link from "next/link";
import { cn, formatDoualaTime } from "@/lib/utils";

/**
 * The quiet line a student reads while messages are nearly gone. The sidebar
 * usage card is gone, so this is the only place the count surfaces before the
 * hard block replaces the composer.
 */
export function ChatAllowanceHint({
  remaining,
  resetsAt,
  className,
}: {
  remaining: number;
  resetsAt?: string | null;
  className?: string;
}) {
  const reset = resetsAt ? formatDoualaTime(resetsAt) : null;

  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      {remaining} {remaining === 1 ? "message" : "messages"} left today
      {reset ? ` · resets at ${reset}` : ""}.{" "}
      <Link
        className="underline underline-offset-2 hover:text-foreground"
        href="/pricing"
      >
        Need more?
      </Link>
    </p>
  );
}
