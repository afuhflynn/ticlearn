import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { family, invalidateGroups } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

type QuizScope = "all" | "my" | "public";

export function useQuizzes(scope: QuizScope = "all", noteId?: string) {
  const query = useQuery({
    queryKey: [...queryKeys.quizzes, scope, noteId ?? null],
    queryFn: async () => {
      const result = await api.queries.quizzes.getAll({ scope, noteId });
      return result;
    },
    // A scope change keeps the quizzes that are on screen while the new ones
    // load, so the reader never sees an empty page.
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const quizzes = query.state.data?.quizzes ?? [];
      return quizzes.some(
        (quiz: { status: string }) => quiz.status === "GENERATING",
      )
        ? 3000
        : false;
    },
    ...family("quizzes"),
  });

  const quizzes = query.data?.quizzes || [];
  const isGenerating = quizzes.some(
    (quiz: { status: string }) => quiz.status === "GENERATING",
  );

  return {
    quizzes,
    ...readState(query, isGenerating),
    refetch: query.refetch,
  };
}

export function useQuiz(id: string) {
  const query = useQuery({
    queryKey: queryKeys.quiz(id),
    queryFn: async () => {
      const result = await api.queries.quizzes.getById(id);
      return result;
    },
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.quiz?.status === "GENERATING" ? 3000 : false,
    ...family("quizzes"),
  });

  return {
    ...query,
    ...readState(query, query.data?.quiz?.status === "GENERATING"),
  };
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
      void invalidateGroups(queryClient, "quizzes", "notes", "credits");
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
      void invalidateGroups(queryClient, "quizzes", "notes");
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
      // A submission writes the last attempt the dashboard's Last quiz card
      // shows, so that card must not survive on the stale sixty second list.
      void invalidateGroups(queryClient, "stats", "quizzes", "dashboard");
      queryClient.invalidateQueries({
        queryKey: queryKeys.quiz(variables.quizId),
      });
    },
  });
}

export function useQuizAttempt(attemptId: string) {
  const query = useQuery({
    queryKey: ["quizzes", "attempts", attemptId],
    queryFn: async () => {
      const result = await api.mutations.quizzes.getAttemptById(attemptId);
      return result;
    },
    enabled: !!attemptId,
  });

  return { ...query, ...readState(query) };
}
