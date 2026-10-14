import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { NoteSummary, NoteWithRelations } from "@/types";

type NoteMutationPayload = {
  title: string;
  fileUrl: string;
  uploadthingKey?: string;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "WORD";
};

export function useNotes() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notes,
    queryFn: api.queries.notes.getAll,
    refetchInterval: (query) => {
      const notes = query.state.data?.notes ?? [];
      const shouldPoll = notes.some(
        (note: { status: string; latestQuiz?: { status: string } | null }) =>
          note.status === "UPLOADING" ||
          note.status === "PROCESSING" ||
          note.latestQuiz?.status === "GENERATING",
      );

      return shouldPoll ? 3000 : false;
    },
  });

  return {
    notes: data?.notes ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useNote(id: string) {
  return useQuery({
    queryKey: queryKeys.note(id),
    queryFn: async () => api.queries.notes.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const note = query.state.data?.note as
        | (NoteWithRelations & {
            latestQuiz?: { status: string } | null;
          })
        | undefined;

      if (!note) {
        return false;
      }

      return note.status === "UPLOADING" ||
        note.status === "PROCESSING" ||
        note.latestQuiz?.status === "GENERATING"
        ? 3000
        : false;
    },
  });
}

export function useUploadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NoteMutationPayload) => {
      const result = await api.mutations.notes.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      toast.success("Note uploaded successfully! It's being processed.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; title?: string }) => {
      const result = await api.mutations.notes.update(data.id, {
        title: data.title,
      });
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      queryClient.invalidateQueries({ queryKey: queryKeys.note(variables.id) });
      toast.success("Note updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => api.mutations.notes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      toast.success("Note deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useProcessNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => api.mutations.notes.process(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
