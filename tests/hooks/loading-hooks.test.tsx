import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCommunityPosts } from "@/hooks/useCommunity";
import { useNotes } from "@/hooks/useNotes";
import { useQuizzes } from "@/hooks/useQuizzes";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    queries: {
      notes: { getAll: vi.fn() },
      quizzes: { getAll: vi.fn() },
      community: { getPosts: vi.fn() },
    },
  },
}));

const getNotes = vi.mocked(api.queries.notes.getAll);
const getQuizzes = vi.mocked(api.queries.quizzes.getAll);
const getPosts = vi.mocked(api.queries.community.getPosts);

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  getNotes.mockReset();
  getQuizzes.mockReset();
  getPosts.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loading query hooks", () => {
  it("does not dim notes while the app polls a note that is still processing", async () => {
    getNotes.mockResolvedValue({
      notes: [
        {
          id: "note-1",
          status: "PROCESSING",
          latestQuiz: null,
        },
      ],
    } as never);

    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it("does not dim quizzes while a generating quiz is polled", async () => {
    getQuizzes.mockResolvedValue({
      quizzes: [{ id: "quiz-1", status: "GENERATING" }],
    } as never);

    const { result } = renderHook(() => useQuizzes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.quizzes).toHaveLength(1));

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it("keeps community posts visible while a subject filter refreshes", async () => {
    let resolveFiltered: ((value: unknown) => void) | undefined;
    getPosts
      .mockResolvedValueOnce({
        posts: [{ id: "post-1", content: "Visible post" }],
        total: 1,
      } as never)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFiltered = resolve;
          }) as never,
      );

    const { result, rerender } = renderHook(
      ({ subject }: { subject?: string }) => useCommunityPosts(subject),
      {
        initialProps: { subject: undefined as string | undefined },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    rerender({ subject: "mathematics" });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.posts[0]).toMatchObject({
      id: "post-1",
      content: "Visible post",
    });
    expect(result.current.isPending).toBe(false);

    resolveFiltered?.({ posts: [], total: 0 });
    await waitFor(() => expect(result.current.posts).toEqual([]));
  });
});
