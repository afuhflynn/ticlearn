import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useUserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const result = await api.queries.stats.userStats();
      return result;
    },
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
    queryFn: async () => {
      const result = await api.queries.stats.leaderboard(page, limit);
      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 0,
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
