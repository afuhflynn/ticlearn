"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  feature: string; // e.g., "mock", "ai-solve", "readiness"
}

const featureDescriptions: Record<string, { title: string; desc: string }> = {
  mock: {
    title: "Free Mock Limit Reached",
    desc: "You've used your free mock exam for this week. Upgrade to Pro for unlimited full-length mock exams with adaptive targeting.",
  },
  "ai-solve": {
    title: "AI Question Limit Reached",
    desc: "You've used your daily AI solves. Upgrade to Pro for unlimited AI-powered question solving and explanations.",
  },
  readiness: {
    title: "Advanced Readiness Analytics",
    desc: "Unlock advanced readiness breakdown, weakness trends, and adaptive recommendations with Pro.",
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  title,
  description,
  feature,
}: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaults = featureDescriptions[feature] || {
    title: "Upgrade to Pro",
    desc: "Unlock unlimited access to all premium features.",
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO", redirectUrl: "/dashboard" }),
      });
      const data = await res.json();
      if (data.link) {
        window.location.href = data.link;
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {title || defaults.title}
          </DialogTitle>
          <DialogDescription>{description || defaults.desc}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
          <p className="font-medium">Pro includes:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✦ Unlimited mock exams</li>
            <li>✦ Unlimited AI question solving</li>
            <li>✦ Adaptive targeting for weak areas</li>
            <li>✦ Advanced readiness analytics</li>
            <li>✦ Unlimited TiC messages</li>
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade to Pro - 3,500 FCFA/month
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
