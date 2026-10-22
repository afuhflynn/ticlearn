import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LONG_WAIT_MS,
  PendingRegion,
  useLongWait,
} from "@/components/ui/pending-region";

vi.mock("motion/react", async () => {
  const actual =
    await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

const FALLBACK = <div data-testid="fallback">shape</div>;

describe("PendingRegion", () => {
  it("shows the shape while the region has no data", () => {
    render(
      <PendingRegion
        fallback={FALLBACK}
        isPending
        label="Your notes"
        longWaitMessage="Still loading."
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("marks the waiting region busy and hides the decorative shape", () => {
    render(
      <PendingRegion
        fallback={FALLBACK}
        isPending
        label="Your notes"
        longWaitMessage="Still loading."
      >
        <p>content</p>
      </PendingRegion>,
    );

    const region = screen.getByLabelText("Your notes");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("fallback").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps the content on screen while it refreshes", () => {
    render(
      <PendingRegion
        fallback={FALLBACK}
        isPending={false}
        isRefreshing
        label="Your notes"
        longWaitMessage="Still loading."
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your notes")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("dims the content and shows the refresh bar while it refreshes", () => {
    const { container } = render(
      <PendingRegion
        fallback={FALLBACK}
        isPending={false}
        isRefreshing
        label="Your notes"
        longWaitMessage="Still loading."
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(container.querySelector("[data-slot='refresh-bar']")).not.toBeNull();
    expect(
      container.querySelector("[data-slot='pending-region-dim']"),
    ).toHaveClass("opacity-content-dim");
  });

  it("shows no refresh bar when nothing is refreshing", () => {
    const { container } = render(
      <PendingRegion
        fallback={FALLBACK}
        isPending={false}
        isRefreshing={false}
        label="Your notes"
        longWaitMessage="Still loading."
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(container.querySelector("[data-slot='refresh-bar']")).toBeNull();
    expect(
      container.querySelector("[data-slot='pending-region-dim']"),
    ).not.toHaveClass("opacity-content-dim");
  });

  it("shows the plain line, not the shape, once the wait passes ten seconds", () => {
    vi.useFakeTimers();
    try {
      render(
        <PendingRegion
          fallback={FALLBACK}
          isPending
          label="Your notes"
          longWaitMessage="Still loading your notes."
        >
          <p>content</p>
        </PendingRegion>,
      );

      expect(screen.getByTestId("fallback")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(screen.getByText("Still loading your notes.")).toBeInTheDocument();
      expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a plain notice and a retry when the read failed", () => {
    const onRetry = vi.fn();
    render(
      <PendingRegion
        fallback={FALLBACK}
        isError
        isOffline
        isPending={false}
        label="Your notes"
        longWaitMessage="Still loading."
        onRetry={onRetry}
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(screen.getByText("The connection dropped")).toBeInTheDocument();
    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();

    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the server failure notice when the connection is still available", () => {
    render(
      <PendingRegion
        fallback={FALLBACK}
        isError
        isOffline={false}
        isPending={false}
        label="Your notes"
        longWaitMessage="Still loading."
        onRetry={vi.fn()}
      >
        <p>content</p>
      </PendingRegion>,
    );

    expect(screen.getByText("This could not be loaded")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("The connection dropped"),
    ).not.toBeInTheDocument();
  });

  it("cancels the long wait message when the pending state ends", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <PendingRegion
          fallback={FALLBACK}
          isPending
          label="Your notes"
          longWaitMessage="Still loading your notes."
        >
          <p>content</p>
        </PendingRegion>,
      );

      rerender(
        <PendingRegion
          fallback={FALLBACK}
          isPending={false}
          label="Your notes"
          longWaitMessage="Still loading your notes."
        >
          <p>content</p>
        </PendingRegion>,
      );
      act(() => vi.advanceTimersByTime(LONG_WAIT_MS));

      expect(
        screen.queryByText("Still loading your notes."),
      ).not.toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts and resets the standalone long wait clock from the waiting state", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ isWaiting }: { isWaiting: boolean }) => useLongWait(isWaiting),
        { initialProps: { isWaiting: true } },
      );

      act(() => vi.advanceTimersByTime(LONG_WAIT_MS - 1));
      expect(result.current).toBe(false);

      act(() => vi.advanceTimersByTime(1));
      expect(result.current).toBe(true);

      rerender({ isWaiting: false });
      expect(result.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
