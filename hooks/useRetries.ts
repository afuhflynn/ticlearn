import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

export function useRetry(answerId: string) {
  const query = useQuery({
    queryKey: queryKeys.retry(answerId),
    queryFn: async () => {
      const result = await api.queries.retries.getByAnswer(answerId);
      return result as {
        retry: {
          id: string;
          status: string;
          concept: string;
          sourcePages: number[];
          sourceExcerpt: string | null;
          feedbackMd: string | null;
          retryQuestion: string;
          retryOptions: string[];
          retryCorrectAnswer?: string;
          isCorrect?: boolean | null;
          userAnswer?: string | null;
        } | null;
      };
    },
    enabled: !!answerId,
    refetchInterval: (query) =>
      query.state.data?.retry?.status === "pending" ? 3000 : false,
  });
  return { ...query, ...readState(query, false) };
}

export function useCreateRetry(answerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => api.mutations.retries.create(answerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.retry(answerId),
      });
    },
  });
}

export function useSubmitRetry(answerId: string, retryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userAnswer: string) =>
      api.mutations.retries.submit(retryId, userAnswer),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.retry(answerId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
    },
  });
}
