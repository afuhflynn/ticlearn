"use client";

import { Clock3, MessageSquareText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useUsage } from "@/hooks";
import { cn } from "@/lib/utils";

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function ChatUsageCard({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { chatDailyUsage, isLoading, canUseAIChat } = useUsage();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!chatDailyUsage || chatDailyUsage.limit === -1) {
      return null;
    }

    const resetAt = new Date(chatDailyUsage.resetsAt).getTime();
    const seconds = Math.max(0, Math.floor((resetAt - now) / 1000));
    return formatCountdown(seconds);
  }, [chatDailyUsage, now]);

  if (isLoading || !chatDailyUsage) {
    return null;
  }

  const limitLabel =
    chatDailyUsage.limit === -1
      ? "Unlimited"
      : `${chatDailyUsage.used} / ${chatDailyUsage.limit}`;

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] bg-accent/50 p-3 text-sm",
        compact && "p-2 text-xs",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <MessageSquareText className="h-4 w-4" />
          <span>Daily chat usage</span>
        </div>
        <Badge variant={canUseAIChat ? "secondary" : "destructive"}>
          {limitLabel}
        </Badge>
      </div>
      {chatDailyUsage.limit !== -1 && (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Resets in {countdown}</span>
          </div>
        </div>
      )}
      {chatDailyUsage.limit === -1 && (
        <p className="mt-2 text-muted-foreground">
          Your current plan does not cap daily chat messages.
        </p>
      )}
    </div>
  );
}
