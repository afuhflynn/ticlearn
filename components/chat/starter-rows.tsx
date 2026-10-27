"use client";

import {
  BookOpen,
  CalendarRange,
  ClipboardList,
  FileSearch,
} from "lucide-react";
import { CHAT_STARTERS } from "@/components/chat/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The icon that stands beside each starter row. Keyed by title so the
 * constants file stays plain data.
 */
const starterIcons: Record<string, typeof FileSearch> = {
  "Solve a past paper": FileSearch,
  "Explain my notes": BookOpen,
  "Quiz me": ClipboardList,
  "Plan my revision": CalendarRange,
};

/**
 * Four things a student can start with, shown as quiet rows under the
 * composer the way the reference interface does it. A tap fills the composer
 * and focuses it without sending, because a starter is a thought, not a
 * message. The rows are shown only on an empty conversation and are gone once
 * there is a message.
 */
export function StarterRows({
  onStart,
  className,
}: {
  onStart: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      {CHAT_STARTERS.map((starter) => {
        const Icon = starterIcons[starter.title] ?? FileSearch;
        return (
          <Button
            className="h-auto min-h-11 w-full justify-start gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-normal"
            key={starter.title}
            onClick={() => onStart(starter.prompt)}
            variant="ghost"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{starter.title}</span>
          </Button>
        );
      })}
    </div>
  );
}
