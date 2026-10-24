import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotes } from "@/hooks/useNotes";
import { useQuizzes } from "@/hooks/useQuizzes";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    queries: {
      notes: { getAll: vi.fn() },
      quizzes: { getAll: vi.fn() },
    },
  },
}));

const getNotes = vi.mocked(api.queries.notes.getAll);
const getQuizzes = vi.mocked(api.queries.quizzes.getAll);

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
});
