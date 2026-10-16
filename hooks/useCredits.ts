import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export function useCredits() {
  return useQuery({
    queryKey: queryKeys.credits,
    queryFn: async () => {
      const result = await api.queries.credits();
      return result;
    },
    ...family("credits"),
  });
}
