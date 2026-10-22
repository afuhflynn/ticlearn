"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressLine } from "@/components/ui/process-progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSession } from "@/lib/auth-client";

export function ReferralProcessor() {
  const { data: session, isPending } = useSession();
  const [processed, setProcessed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isPending && session?.user && !processed) {
      const pendingRef = localStorage.getItem("pendingReferralCode");
      if (pendingRef) {
        fetch("/api/referral/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: pendingRef }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              console.log("Referral code applied successfully");
            }
          })
          .catch((err) => console.error("Failed to apply referral:", err))
          .finally(() => {
            localStorage.removeItem("pendingReferralCode");
            setProcessed(true);
          });
      } else {
        setProcessed(true);
      }
    } else if (!isPending && !session?.user) {
      setProcessed(true);
    }
  }, [session, isPending, processed]);

  if (isPending || !processed) {
    const content = (
      <div className="flex items-center justify-center py-4">
        <ProgressLine
          message="Setting up your account."
          estimate="This only takes a moment."
        />
      </div>
    );
    if (isMobile) {
      return (
        <Sheet open>
          <SheetContent side="bottom">{content}</SheetContent>
        </Sheet>
      );
    }
    return (
      <Dialog open>
        <DialogContent>{content}</DialogContent>
      </Dialog>
    );
  }

  return null;
}
