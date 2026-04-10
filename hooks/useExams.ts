import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export function useExams() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.exams,
    queryFn: async () => {
      const result = await api.queries.exams.getAll();
      return result;
    },
  });

  return {
    exams: data?.exams || [],
    isLoading,
    error,
  };
}

export function useExam(id: string) {
  return useQuery({
    queryKey: queryKeys.exam(id),
    queryFn: async () => {
      const result = await api.queries.exams.getById(id);
      return result;
    },
    enabled: !!id,
  });
}

export function useGenerateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      subject: string;
      topic: string;
      questionCount: number;
    }) => {
      const result = await api.mutations.exams.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams });
      toast.success("Exam generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSubmitExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      examId: string;
      answers: Record<string, string>;
    }) => {
      const result = await api.mutations.exams.submit(data.examId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    },
  });
}
