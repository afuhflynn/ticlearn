import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/app/(dashboard)/dashboard/dashboard-client";

/**
 * The dashboard client (spec 0014, AC-3).
 *
 * Two continue cards and one upload action, no stat cards or scores. The
 * routing is the contract: a note card opens that note, the last quiz card
 * opens the attempt review page, and every empty card offers the one path
 * that fills it. The conversation card was removed on purpose: the dashboard
 * is notes and the last quiz, and nothing else.
 */
const continueState = vi.hoisted(() => vi.fn());

vi.mock("@/hooks", () => ({
  useDashboardContinue: continueState,
}));

vi.mock("@/components/ui/pending-region", () => ({
  PendingRegion: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/(dashboard)/dashboard/dashboard-skeletons", () => ({
  DashboardContinueSkeleton: () => <div>skeleton</div>,
}));

const full = {
  recentNotes: [
    {
      id: "note-1",
      title: "Operating Systems: Process Scheduling",
      fileName: "process-scheduling.pdf",
      status: "READY",
      createdAt: "2026-10-23T10:00:00.000Z",
    },
  ],
  lastAttempt: {
    attemptId: "attempt-9",
    quizId: "quiz-1",
    title: "Process scheduling check",
    answeredAt: "2026-10-23T11:00:00.000Z",
  },
  isPending: false,
  isRefreshing: false,
  isError: false,
  isOffline: false,
  refetch: vi.fn(),
};

const empty = {
  ...full,
  recentNotes: [],
  lastAttempt: null,
};

describe("DashboardClient with data (spec 0014 AC-3)", () => {
  it("opens each card at the address that continues the work", () => {
    continueState.mockReturnValue(full);
    render(<DashboardClient userName="Ada Lovelace" />);

    expect(
      screen.getByRole("link", { name: /Operating Systems/ }),
    ).toHaveAttribute("href", "/notes/note-1");
    expect(
      screen.getByRole("link", { name: /Process scheduling check/ }),
    ).toHaveAttribute("href", "/attempts/attempt-9");
  });

  it("labels each note with the file the student uploaded, a field the read really sends", () => {
    // Regression: the sub line once read a `subject` field that no table and
    // no payload carries, so every note card rendered an empty line.
    continueState.mockReturnValue(full);
    const { container } = render(<DashboardClient userName="Ada" />);

    expect(container.textContent).toContain("process-scheduling.pdf");
  });

  it("greets the student with the first word of their name", () => {
    continueState.mockReturnValue(full);
    render(<DashboardClient userName="Ada Lovelace" />);

    expect(
      screen.getByRole("heading", { name: "Welcome back, Ada!" }),
    ).toBeInTheDocument();
  });

  it("keeps the upload action at the top, not buried in a card", () => {
    continueState.mockReturnValue(full);
    render(<DashboardClient userName="Ada" />);

    expect(screen.getByRole("link", { name: /Upload/ })).toHaveAttribute(
      "href",
      "/upload",
    );
  });

  it("renders the Douala calendar day for a timestamp inside the hour the server and the browser zones disagree on", () => {
    // Regression: a hydration boundary hands server data to this client
    // component, so the same row is formatted once in the server timezone and
    // once in the browser one. 23:30 UTC is Oct 23 in UTC and Oct 24 in
    // Douala, which is how the mismatch showed. The day must come from the
    // app's one zone, Africa/Douala, not from the host clock.
    continueState.mockReturnValue({
      ...full,
      lastAttempt: {
        ...full.lastAttempt,
        answeredAt: "2026-10-23T23:30:00.000Z",
      },
    });
    render(<DashboardClient userName="Ada" />);

    const quizCard = screen.getByRole("link", {
      name: /Process scheduling check/,
    });
    expect(quizCard).toHaveTextContent(/Answered Sat, Oct 24/);
    expect(quizCard).not.toHaveTextContent(/Oct 23/);
  });
});

describe("DashboardClient with nothing yet (spec 0014 AC-3)", () => {
  it("offers the one path that fills each card", () => {
    continueState.mockReturnValue(empty);
    render(<DashboardClient userName="Ada" />);

    expect(screen.getByRole("link", { name: "Upload a note" })).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(
      screen.getByRole("link", { name: "Go to my quizzes" }),
    ).toHaveAttribute("href", "/quizzes");
  });

  it("shows no scores, no stat cards and no readiness numbers", () => {
    continueState.mockReturnValue(empty);
    const { container } = render(<DashboardClient userName="Ada" />);

    expect(container.textContent).not.toMatch(/readiness/i);
    expect(container.textContent).not.toMatch(/streak/i);
    expect(container.textContent).not.toMatch(/\d+\s*%/);
  });
});
