import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizRunner } from "@/components/chat/quiz-runner";
import { api } from "@/lib/api-client";

const generateMock = vi.hoisted(() => vi.fn());
const submitMock = vi.hoisted(() => vi.fn());
const useQuizMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  api: {
    mutations: {
      quizzes: {
        generate: generateMock,
        grade: vi.fn(),
      },
    },
  },
}));

vi.mock("@/hooks", () => ({
  useQuiz: useQuizMock,
  useSubmitQuizAttempt: () => ({ mutateAsync: submitMock }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
}));

const questions = [
  {
    id: "q1",
    type: "MCQ",
    question: "2 + 2?",
    options: ["Three", "Four"],
    correctAnswer: "Four",
    explanation: "Addition",
    order: 0,
    sourcePages: [3],
  },
  {
    id: "q2",
    type: "MCQ",
    question: "Capital of France?",
    options: ["London", "Paris"],
    correctAnswer: "Paris",
    explanation: "City",
    order: 1,
    sourcePages: [5],
  },
  {
    id: "q3",
    type: "MCQ",
    question: "Red planet?",
    options: ["Venus", "Mars"],
    correctAnswer: "Mars",
    explanation: "Iron oxide",
    order: 2,
    sourcePages: [],
  },
];

const readyQuiz = {
  id: "quiz-1",
  title: "Quiz",
  noteTitle: "Bio notes",
  status: "READY",
  questions,
};

// Stable payloads: the runner replays its quiz effect whenever the quiz
// payload identity changes, exactly like a live query cache would, so a
// fresh object per render would drag a completed run back to answering.
const READY_QUIZ_PAYLOAD = {
  data: { quiz: readyQuiz },
  isPending: false,
  isError: false,
};
const EMPTY_QUIZ_PAYLOAD = {
  data: undefined,
  isPending: false,
  isError: false,
};

function attemptResult() {
  return {
    attempt: {
      id: "attempt-1",
      score: 67,
      totalQuestions: 3,
      correctAnswers: 2,
      answers: [
        {
          questionId: "q1",
          question: "2 + 2?",
          userAnswer: "Four",
          correctAnswer: "Four",
          isCorrect: true,
          explanation: "Addition",
        },
        {
          questionId: "q2",
          question: "Capital of France?",
          userAnswer: "London",
          correctAnswer: "Paris",
          isCorrect: false,
          explanation: "City",
        },
        {
          questionId: "q3",
          question: "Red planet?",
          userAnswer: "Mars",
          correctAnswer: "Mars",
          isCorrect: true,
          explanation: "Iron oxide",
        },
      ],
    },
    pointsEarned: 10,
    currentStreak: 1,
  };
}

function props() {
  return {
    conversationId: "conv-1",
    noteId: "note-1",
    noteTitle: "Bio notes",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.scrollTo = vi.fn() as never;
  useSessionMock.mockReturnValue({ data: { user: { id: "student-1" } } });
  generateMock.mockResolvedValue({ quiz: { id: "quiz-1" }, success: true });
  submitMock.mockResolvedValue(attemptResult());
  useQuizMock.mockImplementation((id: string) => {
    if (!id) return EMPTY_QUIZ_PAYLOAD;
    return READY_QUIZ_PAYLOAD;
  });
});

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  render(<QuizRunner {...props()} />);
  await user.click(screen.getByRole("button", { name: "Start quiz" }));
  await screen.findByText(/Question 1 of 3.*0 correct/);
}

describe("QuizRunner happy path (spec 0031, covers: AC-1, AC-2, AC-3, AC-7)", () => {
  it("sets up from the note, marks each answer at once, and writes one chat attempt", async () => {
    const user = userEvent.setup();
    render(<QuizRunner {...props()} />);

    expect(screen.getByText("Set up your quiz")).toBeInTheDocument();
    expect(screen.getAllByText("Bio notes")).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "Open full quiz page" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toHaveAttribute("href", "/quizzes/quiz-1");

    await user.click(screen.getByRole("button", { name: /four/i }));
    expect(await screen.findByText("That's correct.")).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 3.*1 correct/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*1 correct/);
    await user.click(screen.getByRole("button", { name: /london/i }));
    expect(await screen.findByText(/not quite/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 3 of 3.*1 correct/);
    await user.click(screen.getByRole("button", { name: /mars/i }));

    await user.click(screen.getByRole("button", { name: "Finish Quiz" }));
    expect(await screen.findByText("Quiz Results")).toBeInTheDocument();

    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith({
      quizId: "quiz-1",
      answers: [
        { questionId: "q1", answer: "Four" },
        { questionId: "q2", answer: "London" },
        { questionId: "q3", answer: "Mars" },
      ],
      source: "chat",
      conversationId: "conv-1",
      clientRunId: expect.stringMatching(/^ticlearn-chat-/),
    });

    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getAllByText("Your answer")).toHaveLength(3);
    expect(screen.getAllByText("Correct answer")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(
      await screen.findByText(/Question 1 of 3.*0 correct/),
    ).toBeInTheDocument();
  });

  it("asks once on unclear input, then marks nothing and skips nothing (covers: AC-6)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.type(screen.getByPlaceholderText(/type a letter/i), "zzz");
    await user.click(screen.getByRole("button", { name: "Answer" }));

    expect(
      await screen.findByText(
        "Tap an option or type its letter, for example B.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 3.*0 correct/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("needs a note before it can start (covers: AC-1)", async () => {
    render(
      <QuizRunner conversationId="conv-1" noteId={null} noteTitle={null} />,
    );

    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("retries once with a smaller set on a length cutoff, then hands off with a link (covers: AC-10)", async () => {
    const user = userEvent.setup();
    generateMock.mockRejectedValueOnce(
      new Error("Output truncated at length cutoff"),
    );
    render(
      <QuizRunner
        conversationId="conv-retry"
        noteId="note-1"
        noteTitle="Bio notes"
      />,
    );

    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(generateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ questionCount: 10 }),
    );
    expect(generateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ questionCount: 5 }),
    );
  });

  it("links the full quiz page when the smaller retry also fails (covers: AC-10)", async () => {
    const user = userEvent.setup();
    generateMock.mockRejectedValueOnce(
      new Error("Output truncated at length cutoff"),
    );
    generateMock.mockRejectedValueOnce(new Error("Output truncated again"));
    render(
      <QuizRunner
        conversationId="conv-handoff"
        noteId="note-1"
        noteTitle="Bio notes"
      />,
    );

    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(
      await screen.findByText(
        "Full paper lives on the quiz page. Open it to continue.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toHaveAttribute("href", "/quizzes");
  });
});

describe("QuizRunner reload replay (spec 0031, covers: AC-5)", () => {
  it("restores the saved run on a fresh mount with the same conversation", async () => {
    const user = userEvent.setup();
    const first = render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);
    await user.click(screen.getByRole("button", { name: /four/i }));
    await screen.findByText(/Question 1 of 3.*1 correct/);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*1 correct/);
    first.unmount();

    render(<QuizRunner {...props()} />);

    expect(
      await screen.findByText(/Question 2 of 3.*1 correct/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });
});

describe("QuizRunner typed and open answers (spec 0031, covers: AC-2, AC-4, AC-6, AC-7)", () => {
  const openQuiz = {
    id: "quiz-1",
    title: "Quiz",
    noteTitle: "Bio notes",
    status: "READY",
    questions: [
      {
        id: "o1",
        type: "OPEN",
        question: "Why is the sky blue?",
        options: [],
        correctAnswer: "Rayleigh scattering",
        explanation: "Light scatters.",
        order: 0,
        sourcePages: [],
      },
    ],
  };
  const OPEN_QUIZ_PAYLOAD = {
    data: { quiz: openQuiz },
    isPending: false,
    isError: false,
  };
  const plainQuiz = {
    id: "quiz-1",
    title: "Quiz",
    noteTitle: "Bio notes",
    status: "READY",
    questions: questions.map((question) => ({ ...question, sourcePages: [] })),
  };
  const PLAIN_QUIZ_PAYLOAD = {
    data: { quiz: plainQuiz },
    isPending: false,
    isError: false,
  };

  it("maps a typed digit or option words to the matching card and says the guess", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.type(screen.getByPlaceholderText(/type a letter/i), "2");
    await user.click(screen.getByRole("button", { name: "Answer" }));

    expect(await screen.findByText(/Reading that as B/)).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 3.*1 correct/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*1 correct/);
    await user.clear(screen.getByPlaceholderText(/type a letter/i));
    await user.type(screen.getByPlaceholderText(/type a letter/i), "option b");
    await user.click(screen.getByRole("button", { name: "Answer" }));

    expect(await screen.findByText(/Reading that as B/)).toBeInTheDocument();
    expect(screen.getByText(/Question 2 of 3.*2 correct/)).toBeInTheDocument();
  });

  it("asks for more on a one character open answer, then grades the retry", async () => {
    const user = userEvent.setup();
    const gradeMock = vi.mocked(api.mutations.quizzes.grade);
    gradeMock.mockResolvedValue({
      questionId: "o1",
      isCorrect: true,
      why: "That is right. Good detail.",
    });
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return OPEN_QUIZ_PAYLOAD;
    });
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 1.*0 correct/);

    await user.type(screen.getByPlaceholderText(/type your answer/i), "x");
    await user.click(screen.getByRole("button", { name: "Mark answer" }));

    expect(await screen.findByText(/Say a little more/)).toBeInTheDocument();
    expect(gradeMock).not.toHaveBeenCalled();

    await user.clear(screen.getByPlaceholderText(/type your answer/i));
    await user.type(
      screen.getByPlaceholderText(/type your answer/i),
      "Blue light scatters more in air",
    );
    await user.click(screen.getByRole("button", { name: "Mark answer" }));

    expect(await screen.findByText(/That is right/)).toBeInTheDocument();
    expect(gradeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "o1",
        type: "OPEN",
        userAnswer: "Blue light scatters more in air",
      }),
    );
  });

  it("shows a plain message plus retry when generation fails", async () => {
    const user = userEvent.setup();
    generateMock.mockRejectedValueOnce(new Error("No credits left"));
    render(<QuizRunner {...props()} />);

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(await screen.findByText("No credits left")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start quiz" }),
    ).toBeInTheDocument();
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("hides the full page handoff when fewer than two visuals are cited", async () => {
    const user = userEvent.setup();
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return PLAIN_QUIZ_PAYLOAD;
    });
    render(<QuizRunner {...props()} />);

    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    expect(
      screen.queryByRole("link", { name: "Open full quiz page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/clock|timer|countdown/i),
    ).not.toBeInTheDocument();
  });
});

describe("QuizRunner wizard handoff (spec 0033, covers: AC-8)", () => {
  it("opens straight into answering when the wizard hands a quiz id", async () => {
    render(<QuizRunner {...props()} initialQuizId="quiz-1" />);

    expect(
      await screen.findByText(/Question 1 of 3.*0 correct/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start quiz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toHaveAttribute("href", "/quizzes/quiz-1");
  });
});

describe("QuizRunner low docked card (spec 0034)", () => {
  const hintedQuiz = {
    ...readyQuiz,
    metadata: { hints: { 0: "Think about what adding means." } },
  };
  const HINTED_QUIZ_PAYLOAD = {
    data: { quiz: hintedQuiz },
    isPending: false,
    isError: false,
  };

  async function startHintedQuiz(user: ReturnType<typeof userEvent.setup>) {
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return HINTED_QUIZ_PAYLOAD;
    });
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);
  }

  it("moves freely with Back plus Next and jumps on dots with answers kept (covers: AC-3)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*0 correct/);

    expect(screen.getByRole("button", { name: "Back" })).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    await user.click(
      screen.getByRole("button", { name: /Question 3 of 3, unanswered/ }),
    );
    await screen.findByText(/Question 3 of 3.*0 correct/);

    await user.click(screen.getByRole("button", { name: /mars/i }));
    expect(await screen.findByText("That's correct.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Question 1 of 3, unanswered/ }),
    );
    await screen.findByText(/Question 1 of 3.*1 correct/);
    expect(
      screen.getByRole("button", { name: /Question 3 of 3, correct/ }),
    ).toBeInTheDocument();
  });

  it("stays quiz only with no flashcards toggle and no clock (covers: AC-12)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: /four/i }));
    expect(await screen.findByText("That's correct.")).toBeInTheDocument();

    expect(
      screen.queryByRole("tab", { name: "Flashcards" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Quiz" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/clock|timer|countdown/i),
    ).not.toBeInTheDocument();
  });

  it("reveals the hint from generate and hides the control when empty (covers: AC-7)", async () => {
    const user = userEvent.setup();
    await startHintedQuiz(user);

    await user.click(screen.getByRole("button", { name: "Show hint" }));
    expect(
      await screen.findByText("Think about what adding means."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*0 correct/);
    expect(
      screen.queryByRole("button", { name: "Show hint" }),
    ).not.toBeInTheDocument();
  });

  it("docks the answering card into the slot above the composer (covers: AC-1)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div id="quiz-dock-slot" />
        <QuizRunner {...props()} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    const slot = document.getElementById("quiz-dock-slot");
    expect(slot).not.toBeNull();
    expect(slot?.contains(screen.getByText(/Question 1 of 3.*0 correct/))).toBe(
      true,
    );
  });

  it("minimizes to a slim bar and restores the same spot (covers: AC-8)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText(/Question 2 of 3.*0 correct/);

    await user.click(screen.getByRole("button", { name: "Minimize" }));
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore" }));
    await screen.findByText(/Question 2 of 3.*0 correct/);
  });

  it("keeps the failed grade tap with a retry line (covers: AC-6)", async () => {
    const user = userEvent.setup();
    const gradeMock = vi.mocked(api.mutations.quizzes.grade);
    gradeMock.mockRejectedValueOnce(new Error("Model timed out"));
    const openQuiz = {
      id: "quiz-1",
      title: "Quiz",
      noteTitle: "Bio notes",
      status: "READY",
      questions: [
        {
          id: "o1",
          type: "OPEN",
          question: "Why is the sky blue?",
          options: [],
          correctAnswer: "Rayleigh scattering",
          explanation: "Light scatters.",
          order: 0,
          sourcePages: [],
        },
      ],
    };
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return { data: { quiz: openQuiz }, isPending: false, isError: false };
    });
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 1.*0 correct/);

    await user.type(screen.getByPlaceholderText(/type your answer/i), "blue");
    await user.click(screen.getByRole("button", { name: "Mark answer" }));

    expect(
      await screen.findByText(/Could not mark that answer/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try marking again" }),
    ).toBeInTheDocument();
  });
});
