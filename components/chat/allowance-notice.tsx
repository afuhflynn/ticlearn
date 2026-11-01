"use client";

import Link from "next/link";
import { CHAT_ALLOWANCE_SPENT_LABEL } from "@/components/chat/constants";
import { formatDoualaTime } from "@/lib/utils";

/**
 * The composer's replacement when the daily allowance is spent. The thread
 * above stays readable, so this only closes the writing surface.
 */
export function AllowanceNotice({
  resetsAt,
  used,
  cap,
  className,
}: {
  resetsAt?: string | null;
  used?: number;
  cap?: number;
  className?: string;
}) {
  const reset = resetsAt ? formatDoualaTime(resetsAt) : null;

  return (
    <div
      className={`rounded-[var(--radius)] border bg-muted/30 p-4 text-sm ${className ?? ""}`}
    >
      <p className="font-medium text-foreground">
        {CHAT_ALLOWANCE_SPENT_LABEL}
      </p>
      <p className="mt-1 text-muted-foreground">
        {reset
          ? `Your next messages unlock at ${reset}.`
          : "Your next messages unlock when the allowance resets."}{" "}
        You can still read this conversation.
        {used !== undefined && cap !== undefined
          ? ` You used ${used} of ${cap} free Tip messages today.`
          : ""}
      </p>
      <Link
        className="mt-2 inline-flex min-h-11 items-center gap-1 underline underline-offset-4 hover:text-foreground"
        href="/subscription"
      >
        See the Semester Pass
      </Link>
    </div>
  );
}
