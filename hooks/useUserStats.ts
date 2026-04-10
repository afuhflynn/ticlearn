import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api-client";

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

export function useLeaderboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: async () => {
      const result = await api.queries.stats.leaderboard();
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 0,
  });

  return {
    leaderboard: data?.leaderboard || [],
    currentUserRank: data?.currentUserRank || null,
    isLoading,
    error,
    refetch,
  };
}
