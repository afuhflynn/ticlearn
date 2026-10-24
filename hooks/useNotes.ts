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
import type { NoteSummary, NoteWithRelations } from "@/types";

type NoteMutationPayload = {
  title: string;
  fileUrl: string;
  uploadthingKey?: string;
  fileName: string;
  fileType: "PDF" | "IMAGE" | "WORD";
};

/** True while a note is still being worked on, so the list is being polled. */
function hasWorkInFlight(notes: NoteSummary[]) {
  return notes.some(
    (note) =>
      note.status === "UPLOADING" ||
      note.status === "PROCESSING" ||
      note.latestQuiz?.status === "GENERATING",
  );
}

export function useNotes() {
  const query = useQuery({
    queryKey: queryKeys.notes,
    queryFn: api.queries.notes.getAll,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const notes = query.state.data?.notes ?? [];
      return hasWorkInFlight(notes) ? 3000 : false;
    },
    ...family("notes"),
  });

  const notes = query.data?.notes ?? [];

  return {
    notes,
    ...readState(query, hasWorkInFlight(notes)),
    refetch: query.refetch,
  };
}

export function useNote(id: string) {
  const query = useQuery({
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
    ...family("notes"),
  });

  const note = query.data?.note as
    | (NoteWithRelations & { latestQuiz?: { status: string } | null })
    | undefined;

  return {
    ...query,
    note,
    ...readState(
      query,
      note?.status === "UPLOADING" ||
        note?.status === "PROCESSING" ||
        note?.latestQuiz?.status === "GENERATING",
    ),
    refetch: query.refetch,
  };
}

export function useUploadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NoteMutationPayload) => {
      const result = await api.mutations.notes.create(data);
      return result;
    },
    onSuccess: () => {
      void invalidateGroups(queryClient, "notes", "usage", "dashboard");
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
      void invalidateGroups(queryClient, "notes");
      queryClient.invalidateQueries({
        queryKey: queryKeys.note(variables.id),
      });
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
      void invalidateGroups(queryClient, "notes", "usage", "dashboard");
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
      void invalidateGroups(queryClient, "notes");
      queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
