"use client";

import { Button } from "@/components/ui/button";
import { CHAT_STARTERS } from "@/components/chat/constants";
import { cn } from "@/lib/utils";

/**
 * Four things a student can start with. A tap fills the composer and focuses
 * it without sending, because a starter is a thought, not a message. The cards
 * are shown only on an empty conversation and are gone once there is a message.
 */
export function StarterCards({
  onStart,
  className,
}: {
  onStart: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-3 sm:grid-cols-2", className)}
    >
      {CHAT_STARTERS.map((starter) => (
        <button
          className="flex min-h-24 flex-col items-start gap-1.5 rounded-[var(--radius)] border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={starter.title}
          onClick={() => onStart(starter.prompt)}
          type="button"
        >
          <span className="text-sm font-semibold">{starter.title}</span>
          <span className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {starter.prompt}
          </span>
        </button>
      ))}
    </div>
  );
}
