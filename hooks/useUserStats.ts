import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useUserStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
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
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    leaderboard: data?.leaderboard || [],
    currentUserRank: data?.currentUserRank,
    isLoading,
    error,
    refetch,
  };
}
