"use client";

import { useEffect, useState } from "react";
import type { GceCountdownSnapshot } from "@/lib/gce-countdown";
import { countdownFromExamDate } from "@/lib/gce-countdown";
import { cn } from "@/lib/utils";

type Props = {
  initial: GceCountdownSnapshot;
  className?: string;
  /** Larger type and weight—e.g. landing hero */
  emphasis?: boolean;
};

export function GceCountdownInline({ initial, className, emphasis }: Props) {
  const [parts, setParts] = useState({
    days: initial.days,
    hours: initial.hours,
    minutes: initial.minutes,
    seconds: initial.seconds,
  });

  useEffect(() => {
    const tick = () => setParts(countdownFromExamDate(initial.examDateIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [initial.examDateIso]);

  return (
    <p
      className={cn(
        "flex flex-col items-center text-center tabular-nums sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2",
        emphasis
          ? "gap-2 text-base text-foreground sm:text-lg"
          : "gap-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "tabular-nums text-foreground",
          emphasis
            ? "text-xl font-semibold tracking-tight sm:text-2xl"
            : "font-medium",
        )}
      >
        {parts.days}d · {String(parts.hours).padStart(2, "0")}:
        {String(parts.minutes).padStart(2, "0")}:
        {String(parts.seconds).padStart(2, "0")}
      </span>
      <span
        aria-hidden
        className={cn(
          "hidden sm:inline",
          emphasis ? "text-foreground/50" : "text-muted-foreground",
        )}
      >
        ·
      </span>
      <span
        className={cn(
          "max-w-[20rem] text-balance leading-snug sm:max-w-none",
          emphasis
            ? "text-foreground/85 text-[15px] font-medium sm:text-base"
            : "text-muted-foreground",
        )}
      >
        until main GCE sitting · {initial.examLabel}
      </span>
    </p>
  );
}
