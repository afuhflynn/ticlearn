"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminRow = {
  id: string;
  referrerId: string;
  codeUsed: string;
  status: string;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  expiresAt: string;
  createdAt: string;
  referrer: {
    id: string;
    name: string;
    email: string;
    referralCode: string | null;
  } | null;
};

export default function AdminAmbassadorsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("page", String(p));
        if (search.trim()) sp.set("search", search.trim());
        if (status !== "ALL") sp.set("status", status);
        const res = await fetch(`/api/admin/ambassadors?${sp.toString()}`);
        if (!res.ok) throw new Error("Could not load ambassadors.");
        const json = (await res.json()) as {
          rows: AdminRow[];
          totalPages: number;
        };
        setRows(json.rows);
        setTotalPages(json.totalPages || 1);
        setPage(p);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load.");
      } finally {
        setLoading(false);
      }
    },
    [page, search, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const flag = async (id: string) => {
    const res = await fetch("/api/admin/ambassadors/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.error("Could not flag.");
      return;
    }
    toast.success("Referral flagged.");
    void load();
  };

  const revoke = async (referrerId: string) => {
    if (!window.confirm("Revoke the ambassador pass and block re grant?"))
      return;
    const res = await fetch("/api/admin/ambassadors/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId }),
    });
    if (!res.ok) {
      toast.error("Could not revoke.");
      return;
    }
    toast.success("Ambassador pass revoked and blocked.");
    void load();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Campus ambassadors
        </h1>
        <p className="text-muted-foreground">
          Referrers, counts, granted passes, plus fraud flag and revoke. Revoke
          ends the granted pass now and blocks re grant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>
            Campus ambassadors earn a Semester Pass for referrals. No money is
            paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Search code or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(1);
              }}
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "ALL",
                  "PENDING",
                  "QUALIFIED",
                  "REWARDED",
                  "EXPIRED",
                  "FLAGGED",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => load(1)} disabled={loading}>
              {loading ? "Loading" : "Search"}
            </Button>
          </div>

          {rows.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">No referrals match.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.referrer?.name ?? "Unknown"} ·{" "}
                      {r.referrer?.email ?? "no email"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Code {r.codeUsed} · {r.status} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        r.status === "FLAGGED" ? "destructive" : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => flag(r.id)}
                    >
                      Flag
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revoke(r.referrerId)}
                    >
                      Revoke pass
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
