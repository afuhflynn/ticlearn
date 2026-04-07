"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface ProtectedFeatureProps {
  feature: string;
  description?: string;
  children: React.ReactNode;
  isLocked: boolean;
}

export function ProtectedFeature({
  feature,
  description,
  children,
  isLocked,
}: ProtectedFeatureProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  if (isLocked) {
    return (
      <>
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-muted p-3">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Upgrade to access {feature}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpgradeDialog(true)}
            >
              View Plans
            </Button>
          </div>
        </div>

        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade to Premium</DialogTitle>
              <DialogDescription>
                {description ||
                  `Unlock ${feature} and many more features with a paid plan.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Maybe Later
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/pricing";
                }}
              >
                View Pricing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <>{children}</>;
}
