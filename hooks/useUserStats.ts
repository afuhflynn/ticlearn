import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

export function useUserStats() {
  const query = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const result = await api.queries.stats.userStats();
      return result;
    },
    ...family("stats"),
  });

  return {
    stats: query.data?.stats,
    ...readState(query),
  };
}

export function useLeaderboard(page: number = 1, limit: number = 20) {
  const query = useQuery({
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
    leaderboard: query.data?.leaderboard || [],
    currentUserRank: query.data?.currentUserRank || null,
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 1,
    page: query.data?.page || 1,
    ...readState(query),
    refetch: query.refetch,
  };
}
