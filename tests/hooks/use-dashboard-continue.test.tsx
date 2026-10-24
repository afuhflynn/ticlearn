import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `useDashboardContinue`, the dashboard's one client read (spec 0014, AC-3).
 *
 * The page prefetches this on the server, so the hook's job is to hand over
 * the same three pieces the server rendered, with honest empties while the
 * read has not landed. The hook must read through `lib/api-client.ts`, so this
 * file spies on the real client rather than replacing it.
 */
vi.mock(import("@/lib/api-client"), { spy: true });

import { useDashboardContinue } from "@/hooks";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const continueSpy = vi.mocked(api.queries.dashboard.continue);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const read = {
  recentNotes: [
    {
      id: "note-1",
      title: "Process scheduling",
      fileName: "process-scheduling.pdf",
      status: "READY",
      createdAt: "2026-10-23T10:00:00.000Z",
    },
  ],
  lastAttempt: {
    attemptId: "attempt-1",
    quizId: "quiz-1",
    title: "Process scheduling check",
    answeredAt: "2026-10-23T11:00:00.000Z",
  },
  lastConversation: {
    id: "conversation-1",
    title: "Round robin time slice",
    updatedAt: "2026-10-23T12:00:00.000Z",
  },
};

beforeEach(() => {
  continueSpy.mockReset();
});

type QueryContext = { queryKey: readonly string[] };

describe("useDashboardContinue (spec 0014 AC-3)", () => {
  it("hands over empty pieces, not undefined, while the read is on its way", async () => {
    continueSpy.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDashboardContinue(), { wrapper });

    expect(result.current.recentNotes).toEqual([]);
    expect(result.current.lastAttempt).toBeNull();
    expect(result.current.lastConversation).toBeNull();
    expect(result.current.isPending).toBe(true);
  });

  it("reads through the one api client under the dashboard continue key", async () => {
    continueSpy.mockResolvedValue(read);

    const { result } = renderHook(() => useDashboardContinue(), { wrapper });

    await waitFor(() => {
      expect(result.current.recentNotes).toHaveLength(1);
    });
    expect(continueSpy).toHaveBeenCalledTimes(1);
    const calls = continueSpy.mock.calls as unknown as Array<[QueryContext]>;
    const [context] = calls[0];
    expect(context.queryKey).toEqual(queryKeys.dashboardContinue);
    expect(result.current.lastAttempt).toEqual(read.lastAttempt);
    expect(result.current.lastConversation).toEqual(read.lastConversation);
  });
});
