import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useCredits() {
  return useQuery({
    queryKey: queryKeys.credits,
    queryFn: async () => {
      const result = await api.queries.credits();
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}