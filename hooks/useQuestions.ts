import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

async function getPracticeQuestions(params?: {
  componentId?: string;
  type?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.componentId) searchParams.set("componentId", params.componentId);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetch(`/api/questions/practice?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch practice questions");
  return res.json();
}

export function usePracticeQuestions(params?: {
  componentId?: string;
  type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.practiceQuestions, params],
    queryFn: () => getPracticeQuestions(params),
  });
}
