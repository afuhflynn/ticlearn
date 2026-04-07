import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useNotes() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notes,
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  return {
    notes: data?.notes || [],
    isLoading,
    error,
  };
}

export function useNote(id: string) {
  return useQuery({
    queryKey: queryKeys.note(id),
    queryFn: async () => {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) throw new Error("Failed to fetch note");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUploadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      subject: string;
      fileUrl: string;
      fileName: string;
      fileType: "PDF" | "IMAGE";
    }) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to upload note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      toast.success("Note uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      toast.success("Note deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useProcessNote() {
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/notes/${noteId}/process`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to process note");
      return res.json();
    },
  });
}
