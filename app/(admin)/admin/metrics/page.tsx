"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  MessageSquare,
  Star,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MetricEntry {
  id: string;
  date: string;
  metric: string;
  autoValue: number | null;
  manualValue: number | null;
}

const METRIC_LABELS: Record<
  string,
  { label: string; icon: any; unit: string }
> = {
  active_users: { label: "Active Users", icon: Users, unit: " users" },
  paid_users: { label: "Paid Users", icon: CreditCard, unit: " users" },
  conversion_rate: { label: "Conversion Rate", icon: TrendingUp, unit: "%" },
  feedbacks: { label: "Feedbacks", icon: MessageSquare, unit: "" },
  retention_rate: { label: "Retention Rate", icon: Star, unit: "%" },
  users_reached: { label: "Users Reached", icon: TrendingUp, unit: "" },
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    date: string;
    metric: string;
    value: string;
  } | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const fetchMetrics = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/metrics?from=${fromDate}&to=${toDate}`);
    const data = await res.json();
    setMetrics(data.metrics || []);
    setTotals(data.totals || {});
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRecalculate = async () => {
    await fetch("/api/admin/metrics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: toDate }),
    });
    toast.success("Metrics recalculated");
    fetchMetrics();
  };

  const handleManualOverride = async () => {
    if (!editing) return;
    await fetch("/api/admin/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editing.date,
        metric: editing.metric,
        manualValue: parseFloat(editing.value) || 0,
      }),
    });
    toast.success("Metric updated");
    setEditing(null);
    fetchMetrics();
  };

  const getValue = (entry: MetricEntry) => {
    if (entry.manualValue !== null)
      return { value: entry.manualValue, source: "manual" as const };
    if (entry.autoValue !== null)
      return { value: entry.autoValue, source: "auto" as const };
    return { value: 0, source: "none" as const };
  };

  const groupedByDate = metrics.reduce<Record<string, MetricEntry[]>>(
    (acc, m) => {
      const day = m.date.split("T")[0];
      if (!acc[day]) acc[day] = [];
      acc[day].push(m);
      return acc;
    },
    {},
  );

  const latestMetrics =
    Object.entries(groupedByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 1)?.[0]?.[1] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPIs & Metrics</h1>
          <p className="text-muted-foreground">
            Track platform growth and user engagement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRecalculate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recalculate
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totals.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {totals.activeSubscriptions || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active Subs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {totals.totalRevenue?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Revenue (FCFA)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totals.totalEvents || 0}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {totals.totalUsers
                ? (
                    ((totals.activeSubscriptions || 0) / totals.totalUsers) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchMetrics}>
          <RefreshCw className="mr-2 h-4 w-4" /> Apply
        </Button>
      </div>

      {/* Latest day overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)
        ) : latestMetrics.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No metrics for the selected period. Click "Recalculate" to compute.
          </p>
        ) : (
          latestMetrics.map((entry) => {
            const { value, source } = getValue(entry);
            const config = METRIC_LABELS[entry.metric] || {
              label: entry.metric,
              icon: TrendingUp,
              unit: "",
            };
            const Icon = config.icon;
            return (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {source === "manual" && (
                        <Badge variant="secondary" className="h-5 text-[10px]">
                          Manual
                        </Badge>
                      )}
                      {source === "auto" && (
                        <Badge variant="outline" className="h-5 text-[10px]">
                          Auto
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {value}
                    {config.unit}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 text-xs"
                    onClick={() =>
                      setEditing({
                        date: entry.date.split("T")[0],
                        metric: entry.metric,
                        value: String(value),
                      })
                    }
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Override
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Historic table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily History</CardTitle>
          <CardDescription>All metrics by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Metric</th>
                  <th className="text-right py-2 pr-4">Auto</th>
                  <th className="text-right py-2 pr-4">Manual</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-2 pr-4">{entry.date.split("T")[0]}</td>
                    <td className="py-2 pr-4">
                      {METRIC_LABELS[entry.metric]?.label || entry.metric}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {entry.autoValue ?? "-"}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {entry.manualValue ?? "-"}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          setEditing({
                            date: entry.date.split("T")[0],
                            metric: entry.metric,
                            value: String(
                              entry.manualValue ?? entry.autoValue ?? 0,
                            ),
                          })
                        }
                      >
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual override dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Metric</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {METRIC_LABELS[editing.metric]?.label || editing.metric} -{" "}
                {editing.date}
              </p>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Setting a manual value overrides the auto-computed value. Leave
                empty to revert to auto.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleManualOverride}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded-lg bg-muted animate-pulse ${className}`} />;
}
