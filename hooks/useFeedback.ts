import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useFeedbacks() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.feedbacks,
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      return res.json();
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
    mutationFn: async (data: {
      type: "BUG" | "FEATURE" | "GENERAL";
      subject: string;
      message: string;
      isFlagged?: boolean;
    }) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return res.json();
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
