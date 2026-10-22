"use client";

import {
  ArrowUpDown,
  CreditCard,
  Download,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQueryState, useQueryStates } from "nuqs";
import { useCallback, useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlSearchInput } from "@/components/url-search-input";
import { useAdminMetrics, useExportMetrics } from "@/hooks/useAdminMetrics";
import { clampLimit, clampPage, correctionsForKeys } from "@/nuqs";
import {
  adminMetricsViewDefaults,
  adminMetricsViewParsers,
} from "@/nuqs/admin-metrics";
import {
  DataTableSkeleton,
  EngagementPanelSkeleton,
  GrowthPanelSkeleton,
  LearningPanelSkeleton,
  MonetizationPanelSkeleton,
  OverviewPanelSkeleton,
  RetentionPanelSkeleton,
} from "./metrics-skeleton";

const METRIC_LABELS: Record<string, string> = {
  active_users: "Active Users",
  paid_users: "Paid Users",
  new_users: "New Users",
  new_paid_users: "New Paid Users",
  conversion_rate: "Conversion Rate",
  feedbacks: "Feedbacks",
  revenue: "Revenue (FCFA)",
  chat_messages: "Chat Messages",
  quizzes_taken: "Quizzes Taken",
  exams_completed: "Exams Completed",
  practice_answered: "Practice Answered",
  silent_churn_7d: "Silent Churn (7d)",
  silent_churn_30d: "Silent Churn (30d)",
};

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

const METRIC_CATEGORIES = [
  { value: "all", label: "All Metrics" },
  ...Object.entries(METRIC_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

function formatValue(val: number | null | undefined, metric?: string): string {
  if (val === null || val === undefined) return "-";
  if (metric === "revenue") return val.toLocaleString();
  if (metric === "conversion_rate") return `${val}%`;
  return val.toLocaleString();
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="rounded-full bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {trend !== undefined && (
              <Badge
                variant={trend >= 0 ? "default" : "destructive"}
                className="text-[10px]"
              >
                {trend >= 0 ? "+" : ""}
                {trend}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricChart({
  data,
  dataKey,
  name,
  color = "#3b82f6",
  chartType = "line",
}: {
  data: unknown[];
  dataKey: string;
  name: string;
  color?: string;
  chartType?: "line" | "bar" | "area";
}) {
  const chartData = data as Array<Record<string, unknown>>;
  const ChartComponent =
    chartType === "bar"
      ? BarChart
      : chartType === "area"
        ? AreaChart
        : LineChart;

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v?.split("T")[0]?.slice(5) ?? v}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelFormatter={(v) => {
              const s = String(v ?? "");
              return s.split("T")[0] || s;
            }}
          />
          <Legend />
          {ChartComponent === LineChart && (
            <Line
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          )}
          {ChartComponent === BarChart && (
            <Bar
              dataKey={dataKey}
              name={name}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          )}
          {ChartComponent === AreaChart && (
            <Area
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsPage() {
  // View state lives in the URL, so refresh, back, forward, and shared
  // links reproduce the same view. Tab, filter, page, and sort changes
  // push history; typing and date edits use replace history.
  const [q, setQ] = useQueryState(
    "q",
    adminMetricsViewParsers.q.withOptions({ history: "replace" }),
  );
  const [view, setView] = useQueryStates(
    {
      tab: adminMetricsViewParsers.tab,
      from: adminMetricsViewParsers.from,
      to: adminMetricsViewParsers.to,
      granularity: adminMetricsViewParsers.granularity,
      metric: adminMetricsViewParsers.metric,
      page: adminMetricsViewParsers.page,
      limit: adminMetricsViewParsers.limit,
      sort: adminMetricsViewParsers.sort,
      order: adminMetricsViewParsers.order,
    },
    { history: "push" },
  );
  const safePage = clampPage(view.page);
  const safeLimit = clampLimit(view.limit);
  const rawParams = useSearchParams();

  // Raw keys that disagree with canonical values correct themselves
  // with replace history.
  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      {
        tab: view.tab,
        from: view.from,
        to: view.to,
        granularity: view.granularity,
        metric: view.metric,
        q,
        page: safePage,
        limit: safeLimit,
        sort: view.sort,
        order: view.order,
      },
      adminMetricsViewDefaults,
    );
    if (patch.q !== undefined && patch.q !== q) setQ(patch.q);
    const { q: _q, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      setView(rest, { history: "replace" });
    }
  }, [
    rawParams,
    q,
    setQ,
    view.tab,
    view.from,
    view.to,
    view.granularity,
    view.metric,
    view.sort,
    view.order,
    safePage,
    safeLimit,
    setView,
  ]);

  const {
    summary,
    metrics,
    total,
    totalPages,
    subjectDistribution,
    mastery,
    retention,
    activationFunnel,
    newUsersLast30Days,
    mrrByPlan,
    isLoading,
    refetch,
  } = useAdminMetrics({
    from: view.from,
    to: view.to,
    tab: view.tab,
    granularity: view.granularity,
    metric: view.tab === "data" ? view.metric : undefined,
    page: safePage,
    limit: safeLimit,
    sort: view.sort,
    order: view.order,
    search: q || undefined,
  });

  const exportMetrics = useExportMetrics();

  const handleExport = useCallback(async () => {
    await exportMetrics({ from: view.from, to: view.to });
    toast.success("CSV exported");
  }, [view.from, view.to, exportMetrics]);

  const handleRecalculate = async () => {
    toast.promise(
      fetch("/api/admin/metrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: view.to }),
      }).then(() => refetch()),
      {
        loading: "Recalculating metrics...",
        success: "Metrics recalculated",
        error: "Failed to recalculate",
      },
    );
  };

  const handleSort = (col: "date" | "metric" | "value") => {
    if (view.sort === col) {
      setView({
        order: view.order === "asc" ? "desc" : "asc",
        page: 1,
      });
    } else {
      setView({ sort: col, order: "desc", page: 1 });
    }
  };

  const handleSearchCommit = (next: string) => {
    setQ(next);
    if (view.page !== 1) setView({ page: 1 }, { history: "replace" });
  };

  const chartData = metrics
    .filter((m) => view.metric === "all" || m.metric === view.metric)
    .reduce<Array<Record<string, unknown>>>((acc, m) => {
      const day = m.date?.split("T")[0] ?? "";
      const existing = acc.find((r) => r.date === day);
      if (existing) {
        existing[m.metric] = m.autoValue;
      } else {
        acc.push({ date: day, [m.metric]: m.autoValue });
      }
      return acc;
    }, [])
    .sort(
      (a, b) =>
        new Date(a.date as string).getTime() -
        new Date(b.date as string).getTime(),
    );

  return (
    <div className="space-y-6 overflow-x-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track platform growth, engagement, and learning outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRecalculate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recalculate
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Total Users"
          value={summary.totalUsers.toLocaleString()}
          icon={Users}
        />
        <SummaryCard
          title="Daily Active Users"
          value={summary.daus.toLocaleString()}
          subtitle={`MAU: ${summary.mau.toLocaleString()}`}
          icon={TrendingUp}
          trend={
            summary.mau > 0 ? Math.round((summary.daus / summary.mau) * 100) : 0
          }
        />
        <SummaryCard
          title="Paid Users"
          value={summary.paidUsers.toLocaleString()}
          subtitle={`${summary.conversionRate}% of total`}
          icon={CreditCard}
        />
        <SummaryCard
          title="MRR"
          value={`${summary.mrr.toLocaleString()} FCFA`}
          icon={TrendingUp}
        />
        <SummaryCard
          title="Active Subs"
          value={summary.totalSubscribers.toLocaleString()}
          icon={Users}
        />
        <SummaryCard
          title="Today's Events"
          value={summary.todayEvents.toLocaleString()}
          icon={MessageSquare}
        />
      </div>

      {/* Date Range & Granularity */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={view.from}
            onChange={(e) => {
              if (e.target.value) {
                setView(
                  { from: e.target.value, page: 1 },
                  { history: "replace" },
                );
              }
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={view.to}
            onChange={(e) => {
              if (e.target.value) {
                setView(
                  { to: e.target.value, page: 1 },
                  { history: "replace" },
                );
              }
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label>Granularity</Label>
          <Select
            value={view.granularity}
            onValueChange={(v) => {
              if (v === "daily" || v === "monthly" || v === "yearly") {
                setView({ granularity: v, page: 1 });
              }
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="default"
          onClick={() => {
            setView({ page: 1 });
            refetch();
          }}
        >
          Apply
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={view.tab}
        onValueChange={(v) => {
          if (
            v === "overview" ||
            v === "engagement" ||
            v === "learning" ||
            v === "growth" ||
            v === "monetization" ||
            v === "retention" ||
            v === "data"
          ) {
            setView({ tab: v, page: 1 });
          }
        }}
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="monetization">Monetization</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {view.tab === "overview" &&
            (isLoading ? (
              <OverviewPanelSkeleton />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics Over Time</CardTitle>
                    <CardDescription>
                      Select metrics from the chart below
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex gap-2 flex-wrap">
                      {[
                        "active_users",
                        "paid_users",
                        "revenue",
                        "chat_messages",
                      ].map((m) => (
                        <Badge
                          key={m}
                          variant={view.metric === m ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (view.metric === m) {
                              setView({ metric: "all", page: 1 });
                            } else if (
                              m === "active_users" ||
                              m === "paid_users" ||
                              m === "revenue" ||
                              m === "chat_messages"
                            ) {
                              setView({ metric: m, page: 1 });
                            }
                          }}
                        >
                          {METRIC_LABELS[m] || m}
                        </Badge>
                      ))}
                    </div>
                    <MetricChart
                      data={chartData}
                      dataKey={
                        view.metric !== "all" ? view.metric : "active_users"
                      }
                      name={
                        view.metric !== "all"
                          ? METRIC_LABELS[view.metric] || view.metric
                          : "Active Users"
                      }
                      chartType="area"
                    />
                  </CardContent>
                </Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>DAU Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="active_users"
                        name="DAU"
                        color="#10b981"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="revenue"
                        name="Revenue"
                        color="#f59e0b"
                        chartType="bar"
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            ))}
        </TabsContent>

        {/* Tab: Engagement */}
        <TabsContent value="engagement" className="space-y-6">
          {view.tab === "engagement" &&
            (isLoading ? (
              <EngagementPanelSkeleton />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Active / Monthly Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="active_users"
                        name="DAU"
                        color="#3b82f6"
                      />
                      <p className="mt-2 text-sm text-muted-foreground text-center">
                        Stickiness:{" "}
                        <strong>
                          {summary.mau > 0
                            ? `${Math.round((summary.daus / summary.mau) * 100)}%`
                            : "N/A"}
                        </strong>
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Actions Per Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="chat_messages"
                        name="Chat Messages"
                        color="#8b5cf6"
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quiz & Exam Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="quizzes_taken"
                        name="Quizzes"
                        color="#10b981"
                      />
                      <MetricChart
                        data={chartData}
                        dataKey="exams_completed"
                        name="Exams"
                        color="#ef4444"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Subject Distribution</CardTitle>
                      <CardDescription>
                        Active users by subject (today)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {subjectDistribution.length > 0 ? (
                        <div className="h-[250px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={subjectDistribution}
                                dataKey="activeUsers"
                                nameKey="subject"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ payload, percent }) =>
                                  `${(payload as { subject: string }).subject} ${((percent ?? 0) * 100).toFixed(0)}%`
                                }
                              >
                                {subjectDistribution.map((subject, idx) => (
                                  <Cell
                                    key={subject.subject}
                                    fill={COLORS[idx % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No subject data for today
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ))}
        </TabsContent>

        {/* Tab: Learning */}
        <TabsContent value="learning" className="space-y-6">
          {view.tab === "learning" &&
            (isLoading ? (
              <LearningPanelSkeleton />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Avg Mastery
                      </p>
                      <p className="text-2xl font-bold">
                        {mastery.avgMastery.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Previous Avg
                      </p>
                      <p className="text-2xl font-bold">
                        {mastery.previousAvgMastery.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Improvement Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {mastery.improvementRate > 0 ? "+" : ""}
                        {mastery.improvementRate.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Recovery Drills
                      </p>
                      <p className="text-2xl font-bold">
                        {mastery.recoveryDrillsCompleted}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Practice Questions Answered</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="practice_answered"
                        name="Practice"
                        color="#14b8a6"
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            ))}
        </TabsContent>

        {/* Tab: Growth */}
        <TabsContent value="growth" className="space-y-6">
          {view.tab === "growth" &&
            (isLoading ? (
              <GrowthPanelSkeleton />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        New Users (30d)
                      </p>
                      <p className="text-2xl font-bold">{newUsersLast30Days}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Total Users
                      </p>
                      <p className="text-2xl font-bold">
                        {summary.totalUsers.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Paid Users
                      </p>
                      <p className="text-2xl font-bold">
                        {summary.paidUsers.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>New Users Per Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MetricChart
                      data={chartData}
                      dataKey="new_users"
                      name="New Users"
                      color="#10b981"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Activation Funnel</CardTitle>
                    <CardDescription>
                      User progression from signup to returning user
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              stage: "Signed Up",
                              users: activationFunnel.signedUp,
                            },
                            {
                              stage: "Onboarded",
                              users: activationFunnel.onboardingCompleted,
                            },
                            {
                              stage: "First Quiz",
                              users: activationFunnel.firstQuizTaken,
                            },
                            {
                              stage: "Returned",
                              users: activationFunnel.returnedAfterOnboarding,
                            },
                          ]}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="stage" width={100} />
                          <Tooltip />
                          <Bar
                            dataKey="users"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ))}
        </TabsContent>

        {/* Tab: Monetization */}
        <TabsContent value="monetization" className="space-y-6">
          {view.tab === "monetization" &&
            (isLoading ? (
              <MonetizationPanelSkeleton />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">MRR</p>
                      <p className="text-2xl font-bold">
                        {summary.mrr.toLocaleString()} FCFA
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Paid Users
                      </p>
                      <p className="text-2xl font-bold">
                        {summary.paidUsers.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Conversion Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {summary.conversionRate}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">ARPU</p>
                      <p className="text-2xl font-bold">
                        {summary.paidUsers > 0
                          ? `${Math.round(summary.mrr / summary.paidUsers).toLocaleString()} FCFA`
                          : "0 FCFA"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricChart
                        data={chartData}
                        dataKey="revenue"
                        name="Revenue"
                        color="#f59e0b"
                        chartType="area"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>MRR by Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(mrrByPlan).length > 0 ? (
                        <div className="h-[250px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.entries(mrrByPlan).map(
                                  ([plan, amount]) => ({
                                    plan,
                                    amount,
                                  }),
                                )}
                                dataKey="amount"
                                nameKey="plan"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ payload, percent }) =>
                                  `${(payload as { plan: string }).plan} ${((percent ?? 0) * 100).toFixed(0)}%`
                                }
                              >
                                {Object.keys(mrrByPlan).map((plan, idx) => (
                                  <Cell
                                    key={plan}
                                    fill={COLORS[idx % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No MRR data available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion & Retention Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Silent Churn (7d)
                        </p>
                        <p className="text-2xl font-bold text-destructive">
                          {(() => {
                            const last = [...metrics]
                              .reverse()
                              .find((m) => m.metric === "silent_churn_7d");
                            return last?.autoValue?.toLocaleString() ?? "0";
                          })()}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Silent Churn (30d)
                        </p>
                        <p className="text-2xl font-bold text-destructive">
                          {(() => {
                            const last = [...metrics]
                              .reverse()
                              .find((m) => m.metric === "silent_churn_30d");
                            return last?.autoValue?.toLocaleString() ?? "0";
                          })()}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          New Paid Users (today)
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {(() => {
                            const last = [...metrics]
                              .reverse()
                              .find((m) => m.metric === "new_paid_users");
                            return last?.autoValue?.toLocaleString() ?? "0";
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ))}
        </TabsContent>

        {/* Tab: Retention */}
        <TabsContent value="retention" className="space-y-6">
          {view.tab === "retention" &&
            (isLoading ? (
              <RetentionPanelSkeleton />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Cohort Retention</CardTitle>
                    <CardDescription>
                      Weekly cohorts: % of users returning in subsequent weeks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {retention.length > 0 ? (
                      <>
                        <div className="h-[300px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={retention.map((r) => ({
                                cohort: r.cohort,
                                "Week 0":
                                  r.week0 > 0
                                    ? Math.round((r.week0 / r.cohortSize) * 100)
                                    : 0,
                                "Week 1":
                                  r.week1 >= 0
                                    ? Math.round((r.week1 / r.cohortSize) * 100)
                                    : null,
                                "Week 2":
                                  r.week2 >= 0
                                    ? Math.round((r.week2 / r.cohortSize) * 100)
                                    : null,
                                "Week 4":
                                  r.week4 >= 0
                                    ? Math.round((r.week4 / r.cohortSize) * 100)
                                    : null,
                                "Week 8":
                                  r.week8 >= 0
                                    ? Math.round((r.week8 / r.cohortSize) * 100)
                                    : null,
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="cohort"
                                tickFormatter={(v: string) => v.slice(5)}
                              />
                              <YAxis domain={[0, 100]} unit="%" />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="Week 0"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="Week 1"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="Week 2"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="Week 4"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="Week 8"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-6 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-2 pr-4">Cohort</th>
                                <th className="text-right py-2 pr-4">Size</th>
                                <th className="text-right py-2 pr-4">Week 0</th>
                                <th className="text-right py-2 pr-4">Week 1</th>
                                <th className="text-right py-2 pr-4">Week 2</th>
                                <th className="text-right py-2 pr-4">Week 4</th>
                                <th className="text-right py-2">Week 8</th>
                              </tr>
                            </thead>
                            <tbody>
                              {retention.map((r) => (
                                <tr
                                  key={r.cohort}
                                  className="border-b last:border-0 hover:bg-muted/30"
                                >
                                  <td className="py-2 pr-4 font-mono text-xs">
                                    {r.cohort}
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    {r.cohortSize}
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    {Math.round((r.week0 / r.cohortSize) * 100)}
                                    %
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    {r.week1 >= 0
                                      ? `${Math.round((r.week1 / r.cohortSize) * 100)}%`
                                      : "-"}
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    {r.week2 >= 0
                                      ? `${Math.round((r.week2 / r.cohortSize) * 100)}%`
                                      : "-"}
                                  </td>
                                  <td className="py-2 pr-4 text-right">
                                    {r.week4 >= 0
                                      ? `${Math.round((r.week4 / r.cohortSize) * 100)}%`
                                      : "-"}
                                  </td>
                                  <td className="py-2 text-right">
                                    {r.week8 >= 0
                                      ? `${Math.round((r.week8 / r.cohortSize) * 100)}%`
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Not enough data for cohort analysis. More users needed.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Silent Churn</CardTitle>
                    <CardDescription>
                      Users with past activity who stopped engaging
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            7-Day Silent Churn
                          </p>
                          <p className="text-3xl font-bold text-destructive">
                            {(() => {
                              const last = [...metrics]
                                .reverse()
                                .find((m) => m.metric === "silent_churn_7d");
                              return last?.autoValue?.toLocaleString() ?? "0";
                            })()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            30-Day Silent Churn
                          </p>
                          <p className="text-3xl font-bold text-destructive">
                            {(() => {
                              const last = [...metrics]
                                .reverse()
                                .find((m) => m.metric === "silent_churn_30d");
                              return last?.autoValue?.toLocaleString() ?? "0";
                            })()}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <MetricChart
                      data={chartData}
                      dataKey="silent_churn_7d"
                      name="Silent Churn 7d"
                      color="#ef4444"
                    />
                  </CardContent>
                </Card>
              </>
            ))}
        </TabsContent>

        {/* Tab: Data */}
        <TabsContent value="data" className="space-y-6">
          {view.tab === "data" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>Daily Metrics</CardTitle>
                    <CardDescription>
                      Raw metric data — search, sort, and filter
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrlSearchInput
                      value={q}
                      onCommit={handleSearchCommit}
                      placeholder="Search metrics..."
                      ariaLabel="Search metrics"
                      className="relative w-48"
                    />
                    <Select
                      value={view.metric}
                      onValueChange={(v) => {
                        // The options come from METRIC_CATEGORIES, so
                        // membership is guaranteed at runtime; the
                        // assertion only bridges what TS cannot narrow.
                        if (v === "all" || v in METRIC_LABELS) {
                          setView({
                            metric: v as typeof view.metric,
                            page: 1,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Metrics" />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <DataTableSkeleton />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1">
                              Date
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer"
                            onClick={() => handleSort("metric")}
                          >
                            <div className="flex items-center gap-1">
                              Metric
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-right cursor-pointer"
                            onClick={() => handleSort("value")}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Value
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics
                          .filter(
                            (m) =>
                              view.metric === "all" || m.metric === view.metric,
                          )
                          .map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-mono text-xs">
                                {entry.date?.split("T")[0]}
                              </TableCell>
                              <TableCell>
                                {METRIC_LABELS[entry.metric] || entry.metric}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatValue(entry.autoValue, entry.metric)}
                              </TableCell>
                            </TableRow>
                          ))}
                        {metrics.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-8"
                            >
                              No metrics found for selected period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing{" "}
                        {
                          metrics.filter(
                            (m) =>
                              view.metric === "all" || m.metric === view.metric,
                          ).length
                        }{" "}
                        of {total} entries
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage === 1}
                          onClick={() => setView({ page: safePage - 1 })}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {safePage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage === totalPages}
                          onClick={() => setView({ page: safePage + 1 })}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
