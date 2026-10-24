import { useQuery } from "@tanstack/react-query";
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
