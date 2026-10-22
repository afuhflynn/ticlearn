import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

export interface ReadinessTopic {
  topic: string;
  score: number;
  notes: number;
}

export interface ReadinessData {
  readiness: number;
  weakestTopic: { name: string; score: number } | null;
  strongestTopic: { name: string; score: number } | null;
  topicReadiness: ReadinessTopic[];
  needsAssessment: boolean;
  recommendations: string[];
}

/**
 * The student's readiness. The dashboard page prefetches this on the server and
 * hydrates it, so a first paint shows real content with no waiting round trip.
 */
export function useReadiness() {
  const query = useQuery({
    queryKey: queryKeys.readiness,
    queryFn: async () => {
      const result = await api.queries.readiness();
      return result as ReadinessData;
    },
    // Derived from practice, which a submission writes, so it sits with the
    // reads a mutation invalidates.
    ...family("stats"),
  });

  return {
    readiness: query.data ?? null,
    ...readState(query),
  };
}
