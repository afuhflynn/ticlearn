import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

/**
 * The dashboard's continue read, from spec 0014. Three pieces of evidence of
 * where the student left off, and no numbers. The page prefetches this on the
 * server so the first paint already shows the real thing.
 */
export function useDashboardContinue() {
  const query = useQuery({
    queryKey: queryKeys.dashboardContinue,
    queryFn: api.queries.dashboard.continue,
    ...family("dashboard"),
  });

  return {
    recentNotes: query.data?.recentNotes ?? [],
    lastAttempt: query.data?.lastAttempt ?? null,
    lastConversation: query.data?.lastConversation ?? null,
    ...readState(query),
    refetch: query.refetch,
  };
}
