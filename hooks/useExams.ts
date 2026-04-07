import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useExams() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.exams,
    queryFn: async () => {
      const res = await fetch("/api/exams");
      if (!res.ok) throw new Error("Failed to fetch exams");
      return res.json();
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
      const res = await fetch(`/api/exams/${id}`);
      if (!res.ok) throw new Error("Failed to fetch exam");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useGenerateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      subject: "CS" | "ICT";
      topic: string;
      mode?: "MOCK" | "SIMULATION";
      questionCount?: number;
    }) => {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate exam");
      return res.json();
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
      answers: unknown[];
      timeTaken: number;
    }) => {
      const res = await fetch(`/api/exams/${data.examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: data.answers,
          timeTaken: data.timeTaken,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit exam");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    },
  });
}
