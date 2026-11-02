import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuizBuildProgress } from "@/components/chat/quiz-build-progress";

function generating(overrides = {}) {
  return {
    id: "quiz-1",
    status: "GENERATING",
    buildStage: "GENERATING",
    builtCount: 3,
    buildTotal: 10,
    buildError: null,
    buildStartedAt: new Date(Date.now() - 2000).toISOString(),
    ...overrides,
  } as const;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T02:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("QuizBuildProgress live counts (spec 0042, covers: AC-1)", () => {
  it("names the queued stage before the first batch lands", () => {
    render(
      <QuizBuildProgress
        quiz={generating({ buildStage: "QUEUED", builtCount: 0, buildTotal: 5 })}
      />,
    );

    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("0 of 5 · 0%")).toBeInTheDocument();
  });

  it("shows done of total plus percent while batches land", () => {
    render(<QuizBuildProgress quiz={generating()} />);

    expect(screen.getByText("Building your quiz")).toBeInTheDocument();
    expect(screen.getByText("3 of 10 · 30%")).toBeInTheDocument();
    expect(
      screen.getByText("This view refreshes on its own until the quiz is ready."),
    ).toBeInTheDocument();
  });

  it("names saving once rows stop landing", () => {
    render(
      <QuizBuildProgress
        quiz={generating({
          buildStage: "SAVING",
          builtCount: 10,
          buildTotal: 10,
        })}
      />,
    );

    expect(screen.getByText("Saving your quiz")).toBeInTheDocument();
    expect(screen.getByText("10 of 10 · 100%")).toBeInTheDocument();
  });

  it("reads a zero total as zero percent with no divide", () => {
    render(
      <QuizBuildProgress
        quiz={generating({ builtCount: 0, buildTotal: 0 })}
      />,
    );

    expect(screen.getByText("0 of 0 · 0%")).toBeInTheDocument();
  });

  it("holds the count at the total when the writer overshoots", () => {
    render(
      <QuizBuildProgress
        quiz={generating({ builtCount: 12, buildTotal: 10 })}
      />,
    );

    expect(screen.getByText("10 of 10 · 100%")).toBeInTheDocument();
  });

  it("stays quiet about elapsed time under ten seconds", () => {
    render(<QuizBuildProgress quiz={generating()} />);

    expect(screen.queryByText(/Building for/)).not.toBeInTheDocument();
  });

  it("reads the elapsed note aloud after ten seconds", () => {
    render(
      <QuizBuildProgress
        quiz={generating({
          buildStartedAt: new Date(Date.now() - 30_000).toISOString(),
        })}
      />,
    );

    expect(screen.getByText("Building for 30 seconds.")).toBeInTheDocument();
  });
});

describe("QuizBuildProgress failure exits (spec 0042, covers: AC-2, AC-5)", () => {
  it("offers a smaller retry plus the full page link", () => {
    render(
      <QuizBuildProgress
        quiz={{
          id: "quiz-9",
          status: "ERROR",
          buildError: "That set came out too long so it stopped short.",
          buildTotal: 40,
        }}
      />,
    );

    const retry = screen.getByRole("link", { name: "Try 20 questions now" });
    expect(retry).toHaveAttribute(
      "href",
      "/quizzes/new?retryQuizId=quiz-9&count=20",
    );
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toHaveAttribute("href", "/quizzes/quiz-9");
  });

  it("drops the retry when the ask is too small and keeps the page link", () => {
    render(
      <QuizBuildProgress
        quiz={{
          id: "quiz-5",
          status: "ERROR",
          buildError: "Quiz build failed.",
          buildTotal: 5,
        }}
      />,
    );

    expect(screen.getByText("Quiz build failed.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Try .* questions now/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toBeInTheDocument();
  });
});

describe("QuizBuildProgress empty states (spec 0042, covers: AC-7)", () => {
  it("renders nothing with no quiz and nothing once ready", () => {
    const { container, rerender } = render(
      <QuizBuildProgress quiz={null} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <QuizBuildProgress
        quiz={generating({ status: "READY", builtCount: 10 })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("announces progress to assistive tech with no spinner markup", () => {
    const { container } = render(<QuizBuildProgress quiz={generating()} />);

    expect(
      screen.getByText("Building your quiz, 30 percent complete"),
    ).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
