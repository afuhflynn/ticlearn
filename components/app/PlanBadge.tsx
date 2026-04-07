import { Badge } from "@/components/ui/badge";

type Plan = "FREE" | "STARTER" | "STANDARD" | "PREMIUM";

interface PlanBadgeProps {
  plan: Plan;
  className?: string;
}

const planConfig = {
  FREE: {
    label: "Free",
    variant: "secondary" as const,
    className: "bg-muted text-muted-foreground",
  },
  STARTER: {
    label: "Starter",
    variant: "outline" as const,
    className: "border-blue-500 text-blue-500",
  },
  STANDARD: {
    label: "Standard",
    variant: "default" as const,
    className: "bg-violet-500 hover:bg-violet-600",
  },
  PREMIUM: {
    label: "Premium",
    variant: "default" as const,
    className: "bg-amber-500 hover:bg-amber-600",
  },
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = planConfig[plan];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
