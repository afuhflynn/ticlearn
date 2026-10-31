"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type ArtItem =
  | {
      kind: "scan";
      pageNumber: number;
      imageUrl: string;
      altText: string;
      total: number;
    }
  | {
      kind: "drawn";
      id: string;
      format: "mermaid" | "svg";
      payload: string;
      altText: string;
      sourcePage: number | null;
      createdAt: string;
    };

export type ScanArt = Extract<ArtItem, { kind: "scan" }>;
export type DrawnArt = Extract<ArtItem, { kind: "drawn" }>;

export function useNoteArt(noteId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.note(noteId ?? "none"), "art"],
    queryFn: async () => {
      const res = await fetch(
        `/api/artifacts?noteId=${encodeURIComponent(noteId as string)}`,
        { credentials: "include" },
      );
      if (res.status === 404) throw new Error("Not found");
      if (!res.ok) throw new Error("Failed to load art");
      return (await res.json()) as {
        scans: ScanArt[];
        drawn: DrawnArt[];
        total: number;
      };
    },
    enabled: !!noteId,
  });
  return query;
}

export function useAnswerArt(answerId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.retry(answerId ?? "none"), "art"],
    queryFn: async () => {
      const res = await fetch(
        `/api/artifacts?answerId=${encodeURIComponent(answerId as string)}`,
        { credentials: "include" },
      );
      if (res.status === 404) throw new Error("Not found");
      if (!res.ok) throw new Error("Failed to load art");
      return (await res.json()) as { drawn: DrawnArt[] };
    },
    enabled: !!answerId,
  });
  return query;
}

export function useGenerateArt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      answerId?: string;
      noteId?: string;
      concept: string;
      context?: string;
    }) => {
      const res = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => null)) as {
        ok: boolean;
        reason?: string;
        message?: string;
        id?: string;
        format?: "mermaid" | "svg";
        payload?: string;
        altText?: string;
      } | null;
      if (!data?.ok) {
        const err = new Error(data?.message ?? "Draw failed");
        (err as { code?: string }).code = data?.reason;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["notes"] });
      void client.invalidateQueries({ queryKey: ["retries"] });
    },
  });
}
