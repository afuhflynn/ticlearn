import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export function useFeedbacks() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.feedbacks,
    queryFn: async () => {
      const result = await api.queries.feedback();
      return result;
    },
  });

  return {
    feedbacks: data?.feedbacks || [],
    isLoading,
    error,
  };
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { type: string; subject: string; message: string }) => {
      const result = await api.mutations.feedback.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbacks });
      toast.success("Feedback submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
