"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AffiliateSkeleton } from "@/app/(dashboard)/student-skeletons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClaimPartnerInvite } from "@/hooks/useAffiliate";

function ClaimInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const claim = useClaimPartnerInvite();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token && !done && !claim.isPending && !claim.isSuccess) {
      claim.mutate(token, {
        onSuccess: () => setDone(true),
        onError: () => setDone(true),
      });
    }
  }, [token, done, claim]);

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>This invite link is not valid</CardTitle>
            <CardDescription>
              Ask the team for a fresh invite link. Links expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Claim your partner link</CardTitle>
          <CardDescription>
            {claim.isPending
              ? "Checking your invite..."
              : claim.isSuccess
                ? "Invite claimed. Your partner account is pending approval. You will see your stats here once an admin approves you."
                : "This invite could not be claimed. It may be expired, already used, or sent to a different email address."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/affiliates">View partner stats</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<AffiliateSkeleton />}>
      <ClaimInner />
    </Suspense>
  );
}
