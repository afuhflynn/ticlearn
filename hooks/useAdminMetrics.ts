import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface MetricsParams {
  from?: string;
  to?: string;
  tab?: string;
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
  });

  const result = data as Record<string, unknown> | undefined;

  return {
    summary: (result?.summary ?? {}) as {
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
    mastery: (result?.mastery ?? {}) as {
      avgMastery: number;
      previousAvgMastery: number;
      improvementRate: number;
      recoveryDrillsCompleted: number;
    },
    retention: (result?.retention ?? []) as Array<{
      cohort: string;
      cohortSize: number;
      week0: number;
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    }>,
    activationFunnel: (result?.activationFunnel ?? {}) as {
      signedUp: number;
      onboardingStarted: number;
      onboardingCompleted: number;
      firstQuizTaken: number;
      returnedAfterOnboarding: number;
    },
    newUsersLast30Days: (result?.newUsersLast30Days ?? 0) as number,
    mrrByPlan: (result?.mrrByPlan ?? {}) as Record<string, number>,
    conversionRate: (result?.conversionRate ?? 0) as number,
    isLoading,
    error,
    refetch,
  };
}

export function useRetentionData(granularity = "weekly") {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "metrics", "retention", granularity],
    queryFn: () => api.mutations.admin.metrics.retention(granularity),
  });

  const result = data as
    | { retention: unknown[]; granularity: string }
    | undefined;

  return {
    retention: (result?.retention ?? []) as Array<{
      cohort: string;
      cohortSize: number;
      week0: number;
      week1: number;
      week2: number;
      week4: number;
      week8: number;
    }>,
    isLoading,
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
