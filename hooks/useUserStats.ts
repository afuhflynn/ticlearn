import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export function useUserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const result = await api.queries.stats.userStats();
      return result;
    },
    ...family("stats"),
  });

  return {
    stats: data?.stats,
    isLoading,
    error,
  };
}

export function useLeaderboard(page: number = 1, limit: number = 20) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.leaderboard, page, limit],
    // Keep the page a reader is looking at while the next one loads.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await api.queries.stats.leaderboard(page, limit);
      return result;
    },
    ...family("leaderboard"),
  });

  return {
    leaderboard: data?.leaderboard || [],
    currentUserRank: data?.currentUserRank || null,
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    page: data?.page || 1,
    isLoading,
    error,
    refetch,
  };
}
