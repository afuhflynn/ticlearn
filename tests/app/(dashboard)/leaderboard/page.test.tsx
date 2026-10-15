// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeaderboardPage from "@/app/(dashboard)/leaderboard/page";

const searchState = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchState.current,
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: { user: { id: "admin-1", name: "Admin" } },
    isPending: false,
  }),
}));

type Row = {
  userId: string;
  userName: string;
  totalPoints: number;
  quizzesTaken: number;
  currentStreak: number;
  rank: number;
};

const row = (rank: number): Row => ({
  userId: `user-${rank}`,
  userName: `Student ${rank}`,
  totalPoints: 1000 - rank,
  quizzesTaken: rank,
  currentStreak: 1,
  rank,
});

const useLeaderboardMock = vi.hoisted(() =>
  vi.fn((page: number, _limit: number) => ({
    leaderboard:
      page === 1
        ? Array.from({ length: 20 }, (_, i) => row(i + 1))
        : Array.from({ length: 5 }, (_, i) => row(20 + i + 1)),
    currentUserRank: 3,
    total: 25,
    totalPages: 2,
    page,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

vi.mock("@/hooks", () => ({
  useLeaderboard: useLeaderboardMock,
}));

function renderPage(initial: string) {
  searchState.current = new URLSearchParams(
    initial.startsWith("?") ? initial.slice(1) : initial,
  );
  const seen: string[] = [];
  const user = userEvent.setup();
  const utils = render(<LeaderboardPage />, {
    wrapper: withNuqsTestingAdapter({
      searchParams: initial,
      hasMemory: true,
      // The testing adapter aborts in flight updates on every render
      // by default, which swallows mount time corrections. The
      // production adapter has no such render body reset.
      resetUrlUpdateQueueOnMount: false,
      onUrlUpdate: (event) => {
        searchState.current = event.searchParams;
        seen.push(event.queryString);
      },
    }),
  });
  return { user, seen, ...utils };
}

beforeEach(() => {
  useLeaderboardMock.mockClear();
});

describe("LeaderboardPage URL state (spec 0007 thin thread)", () => {
  it("renders the first page with no query key", async () => {
    const { seen } = renderPage("");
    expect(await screen.findByText("Student 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(useLeaderboardMock).toHaveBeenLastCalledWith(1, 20);
    expect(seen).toEqual([]);
  });

  it("pushes page=2 when moving to the next page", async () => {
    const { user, seen } = renderPage("");
    await screen.findByText("Student 1");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Student 21")).toBeInTheDocument();
    expect(useLeaderboardMock).toHaveBeenLastCalledWith(2, 20);
    expect(seen.some((query) => query.includes("page=2"))).toBe(true);
  });

  it("cleans an unparsable page back to the default", async () => {
    const { seen } = renderPage("?page=abc");
    expect(await screen.findByText("Student 1")).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(seen.some((query) => !query.includes("page="))).toBe(true);
    });
    expect(useLeaderboardMock).toHaveBeenLastCalledWith(1, 20);
  });
});
