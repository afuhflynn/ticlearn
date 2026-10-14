import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type QuizScope = "all" | "my" | "public";

export function useQuizzes(scope: QuizScope = "all", noteId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.quizzes, scope, noteId ?? null],
    queryFn: async () => {
      const result = await api.queries.quizzes.getAll({ scope, noteId });
      return result;
    },
    refetchInterval: (query) => {
      const quizzes = query.state.data?.quizzes ?? [];
      return quizzes.some(
        (quiz: { status: string }) => quiz.status === "GENERATING",
      )
        ? 3000
        : false;
    },
    gcTime: 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
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
      const result = await api.queries.quizzes.getById(id);
      return result;
    },
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.quiz?.status === "GENERATING" ? 3000 : false,
    gcTime: 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
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
      const result = await api.mutations.quizzes.generate(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      queryClient.invalidateQueries({ queryKey: queryKeys.credits });
      toast.success("Quiz generation started");
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
      const result = await api.mutations.quizzes.delete(id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
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
      const result = await api.mutations.quizzes.getAttempts(quizId);
      return result;
    },
    enabled: !!quizId,
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      quizId: string;
      answers: { questionId: string; answer: string }[];
    }) => {
      const result = await api.mutations.quizzes.submitAttempt(data);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      queryClient.invalidateQueries({
        queryKey: queryKeys.quiz(variables.quizId),
      });
    },
  });
}

export function useQuizAttempt(attemptId: string) {
  return useQuery({
    queryKey: ["quizzes", "attempts", attemptId],
    queryFn: async () => {
      const result = await api.mutations.quizzes.getAttemptById(attemptId);
      return result;
    },
    enabled: !!attemptId,
  });
}

export function useRecentAttempts(limit: number = 5) {
  return useQuery({
    queryKey: ["quizzes", "attempts", "recent", limit],
    queryFn: async () => {
      const result = await api.mutations.quizzes.getRecentAttempts(limit);
      return result;
    },
  });
}
