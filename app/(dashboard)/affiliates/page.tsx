"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AffiliateSkeleton } from "@/app/(dashboard)/student-skeletons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReadFailureNotice } from "@/components/ui/read-notice";
import { usePartnerStats, useRequestPartnerPayout } from "@/hooks/useAffiliate";

function PartnerInner() {
  const { stats, isLoading, error, refetch } = usePartnerStats(true);
  const payout = useRequestPartnerPayout();
  const [copied, setCopied] = useState(false);

  if (isLoading) return <AffiliateSkeleton />;

  if (error || !stats) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-xl font-bold">No partner access</h1>
        <p className="text-sm text-muted-foreground">
          This surface is only for invited partners. If you were invited, claim
          your link from the email first.
        </p>
        <ReadFailureNotice onRetry={() => refetch()} />
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stats.link);
      setCopied(true);
      toast.success("Partner link copied. Share it over WhatsApp.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Long press the link to copy it.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Partner dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Share your link. You earn a fixed percent of each settled pass or
          credit order after the student verifies email. Counts only, no student
          emails appear here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your link</CardTitle>
          <CardDescription>Code {stats.code}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
            {stats.link}
          </code>
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.clicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.conversions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.pending.toLocaleString()} XAF
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifetime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.lifetime.toLocaleString()} XAF
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request payout</CardTitle>
          <CardDescription>
            Payouts move the full pending total at once. One request stays open
            until an admin pays it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => payout.mutate()}
            disabled={payout.isPending || stats.pending <= 0}
          >
            {payout.isPending ? "Requesting..." : "Request payout"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AffiliatesPage() {
  return <PartnerInner />;
}
