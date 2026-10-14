"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export function ReferralProcessor() {
  const { data: session, isPending } = useSession();
  const [processed, setProcessed] = useState(false);

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
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}
