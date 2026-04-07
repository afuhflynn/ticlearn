import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useQuizzes() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.quizzes,
    queryFn: async () => {
      const res = await fetch("/api/quizzes");
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return res.json();
    },
  });

  return {
    quizzes: data?.quizzes || [],
    isLoading,
    error,
  };
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: queryKeys.quiz(id),
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${id}`);
      if (!res.ok) throw new Error("Failed to fetch quiz");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      noteId: string;
      questionCount: number;
      questionTypes: "MCQ" | "OPEN" | "MIXED";
      timed: boolean;
      timeLimit?: number;
      isPublic: boolean;
    }) => {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate quiz");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      toast.success("Quiz generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete quiz");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      toast.success("Quiz deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizAttempts(quizId),
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${quizId}/attempts`);
      if (!res.ok) throw new Error("Failed to fetch attempts");
      return res.json();
    },
    enabled: !!quizId,
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { quizId: string; answers: unknown[] }) => {
      const res = await fetch("/api/quizzes/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit attempt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard });
    },
  });
}
