"use client";

import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/hooks/usePlan";
import { Sparkles } from "lucide-react";

export function PlanBadge() {
  const { plan, isPaid, isLoading } = usePlan();

  if (isLoading) return null;

  if (plan === "PRO" && isPaid) {
    return (
      <Badge variant="default" className="gap-1">
        <Sparkles className="h-3 w-3" />
        Pro
      </Badge>
    );
  }

  return <Badge variant="outline">Free</Badge>;
}
