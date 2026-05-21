"use client";

import { useEffect, useState } from "react";
import type { GceCountdownSnapshot } from "@/lib/gce-countdown";
import { countdownFromExamDate } from "@/lib/gce-countdown";
import { cn } from "@/lib/utils";

type Props = {
  initial: GceCountdownSnapshot;
  className?: string;
};

export function GceCountdownInline({ initial, className }: Props) {
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
        "flex flex-col items-center gap-1 text-center text-sm tabular-nums text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2",
        className,
      )}
    >
      <span className="font-medium tabular-nums text-foreground">
        {parts.days}d · {String(parts.hours).padStart(2, "0")}
        :
        {String(parts.minutes).padStart(2, "0")}:
        {String(parts.seconds).padStart(2, "0")}
      </span>
      <span aria-hidden className="hidden text-muted-foreground sm:inline">
        ·
      </span>
      <span className="max-w-[19rem] text-balance leading-snug sm:max-w-none">
        until main GCE sitting · {initial.examLabel}
      </span>
    </p>
  );
}
