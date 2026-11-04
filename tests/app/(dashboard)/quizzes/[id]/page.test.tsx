import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuizPlayerPage from "@/app/(dashboard)/quizzes/[id]/page";

const quizState = vi.hoisted(() => ({
  quiz: null as Record<string, unknown> | null,
  isLoading: false,
  error: null as unknown,
}));

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "quiz-1" }),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: { user: { id: "student-1" } },
    isPending: false,
  }),
}));

vi.mock("@/hooks", () => ({
  useQuiz: () => ({
    data: quizState.quiz ? { quiz: quizState.quiz } : undefined,
    isLoading: quizState.isLoading,
    error: quizState.error,
  }),
  useQuizAttempts: () => ({ data: undefined }),
  useSubmitQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function generatingQuiz(overrides = {}) {
  return {
    id: "quiz-1",
    title: "Quiz - Bio notes",
    noteTitle: "Bio notes",
    status: "GENERATING",
    timed: false,
    timeLimit: null,
    isPublic: false,
    questions: [],
    buildStage: "GENERATING",
    builtCount: 12,
    buildTotal: 40,
    buildError: null,
    buildStartedAt: new Date(Date.now() - 2000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  quizState.quiz = null;
  quizState.isLoading = false;
  quizState.error = null;
});

describe("Quiz page live build (spec 0042, covers: AC-1)", () => {
  it("shows live counts while the build runs", () => {
    quizState.quiz = generatingQuiz();

    render(<QuizPlayerPage />);

    expect(screen.getByText("Building your quiz")).toBeInTheDocument();
    expect(screen.getByText("12 of 40 · 30%")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This view refreshes on its own until the quiz is ready.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the skeleton while the first read loads", () => {
    quizState.isLoading = true;

    const { container } = render(<QuizPlayerPage />);

    expect(
      container.querySelector("[data-slot='quiz-runner-skeleton']"),
    ).not.toBeNull();
    expect(screen.queryByText("Building your quiz")).not.toBeInTheDocument();
  });
});

describe("Quiz page failed build (spec 0045, covers: AC-1, AC-3)", () => {
  it("offers a smaller plus the full page link", () => {
    quizState.quiz = generatingQuiz({
      status: "ERROR",
      buildStage: null,
      buildError: "That set came out too long so it stopped short.",
    });

    render(<QuizPlayerPage />);

    expect(
      screen.getByRole("link", { name: "Try smaller quiz" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz" }),
    ).toBeInTheDocument();
  });

  it("drops the retry when the ask is too small and keeps the page link", () => {
    quizState.quiz = generatingQuiz({
      status: "ERROR",
      buildStage: null,
      buildTotal: 3,
      buildError: "Quiz build failed.",
    });

    render(<QuizPlayerPage />);

    expect(screen.getByText("Practice paused")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Try smaller quiz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz" }),
    ).toBeInTheDocument();
  });
});
