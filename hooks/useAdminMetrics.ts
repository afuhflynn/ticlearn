import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

interface MetricsParams {
  from?: string;
  to?: string;
  tab?: string;
  granularity?: string;
  metric?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  search?: string;
}

export function useAdminMetrics(params: MetricsParams = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.adminMetrics(params as Record<string, unknown>),
    queryFn: () => api.mutations.admin.metrics.getAll(params),
    ...family("admin"),
  });

  const result = data as Record<string, unknown> | undefined;

  return {
    summary: (result?.summary ?? {
      totalUsers: 0,
      paidUsers: 0,
      daus: 0,
      mau: 0,
      conversionRate: 0,
      mrr: 0,
      totalSubscribers: 0,
      todayEvents: 0,
    }) as {
      totalUsers: number;
      paidUsers: number;
      daus: number;
      mau: number;
      conversionRate: number;
      mrr: number;
      totalSubscribers: number;
      todayEvents: number;
    },
    metrics: (result?.metrics ?? []) as Array<{
      id: string;
      date: string;
      metric: string;
      autoValue: number | null;
    }>,
    total: (result?.total ?? 0) as number,
    page: (result?.page ?? 1) as number,
    totalPages: (result?.totalPages ?? 1) as number,
    subjectDistribution: (result?.subjectDistribution ?? []) as Array<{
      subject: string;
      activeUsers: number;
    }>,
    retention: (result?.retention ?? []) as Array<{
      cohort: string;
      cohortSize: number;
      week0: number;
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    }>,
    activationFunnel: (result?.activationFunnel ?? {
      signedUp: 0,
      onboardingStarted: 0,
      onboardingCompleted: 0,
      firstQuizTaken: 0,
      returnedAfterOnboarding: 0,
    }) as {
      signedUp: number;
      onboardingStarted: number;
      onboardingCompleted: number;
      firstQuizTaken: number;
      returnedAfterOnboarding: number;
    },
    newUsersLast30Days: (result?.newUsersLast30Days ?? 0) as number,
    mrrByPlan: (result?.mrrByPlan ?? {}) as Record<string, number>,
    conversionRate: (result?.conversionRate ?? 0) as number,
    moneyTrail: (result?.moneyTrail ?? null) as {
      limitHits: number;
      upgradeStarts: number;
      paidSuccess: number;
      weeklyTake: number;
      proTake: number;
      pendingToPaidRate: number;
      aiCostXaf: number;
    } | null,
    funnel: (result?.funnel ?? null) as {
      signup: number;
      firstNote: number;
      firstTipAnswer: number;
      firstQuiz: number;
      firstLimitHit: number;
      firstUpgradeStart: number;
      completedPurchases: number;
      paidSuccessCheck: number;
    } | null,
    takeRates: (result?.takeRates ?? null) as {
      base: number;
      weeklyFirst: number;
      semesterFirst: number;
      weeklyTakeRate: number;
      semesterTakeRate: number;
    } | null,
    pendingToPaid: (result?.pendingToPaid ?? null) as {
      upgradeUsers: number;
      paidUsers: number;
      convertedUsers: number;
      rate: number;
    } | null,
    fallback: (result?.fallback ?? null) as {
      total: number;
      fallback: number;
      rate: number;
      note: string | null;
    } | null,
    aiCost: (result?.aiCost ?? null) as {
      totalXaf: number;
      paidUsers: number;
      costPerPaidUserXaf: number;
      note: string | null;
    } | null,
    window: (result?.window ?? null) as {
      from: string;
      to: string;
      capped: boolean;
      maxDays: number;
    } | null,
    isLoading,
    error,
    refetch,
  };
}

export function useExportMetrics() {
  return async (params?: { from?: string; to?: string; metrics?: string }) => {
    const blob = (await api.mutations.admin.metrics.export(params)) as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metrics-${params?.from || "all"}-to-${params?.to || "now"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
}
