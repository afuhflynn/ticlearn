import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { QuizRunner } from "@/components/chat/quiz-runner";
import { api } from "@/lib/api-client";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;
});

const generateMock = vi.hoisted(() => vi.fn());
const submitMock = vi.hoisted(() => vi.fn());
const useQuizMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() => vi.fn());
const backupReadMock = vi.hoisted(() => vi.fn());
const backupSaveMock = vi.hoisted(() => vi.fn());
const backupClearMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  api: {
    mutations: {
      quizzes: {
        generate: generateMock,
        grade: vi.fn(),
      },
      chat: {
        saveRunBackup: backupSaveMock,
        readRunBackup: backupReadMock,
        clearRunBackup: backupClearMock,
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
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("no art in tests")),
  );
  useSessionMock.mockReturnValue({ data: { user: { id: "student-1" } } });
  generateMock.mockResolvedValue({ quiz: { id: "quiz-1" }, success: true });
  submitMock.mockResolvedValue(attemptResult());
  useQuizMock.mockImplementation((id: string) => {
    if (!id) return EMPTY_QUIZ_PAYLOAD;
    return READY_QUIZ_PAYLOAD;
  });
  backupReadMock.mockResolvedValue({ snapshot: null });
  backupSaveMock.mockResolvedValue({ ok: true });
  backupClearMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("stays on the results when a refetch delivers a fresh quiz payload after submit (covers: AC-12)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    await user.click(screen.getByRole("button", { name: /four/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /paris/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /mars/i }));
    await user.click(screen.getByRole("button", { name: "Finish Quiz" }));
    expect(await screen.findByText("Quiz Results")).toBeInTheDocument();

    // A post submit refetch hands the runner a new payload object with the
    // same content, exactly what the invalidated quiz query delivers.
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return {
        data: { quiz: { ...readyQuiz } },
        isPending: false,
        isError: false,
      };
    });
    rerender(<QuizRunner {...props()} />);

    expect(await screen.findByText("Quiz Results")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Finish Quiz" }),
    ).not.toBeInTheDocument();
  });

  it("shows a calm card with two live exits when submit fails (covers: AC-12)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: /four/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /paris/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /mars/i }));

    submitMock.mockRejectedValueOnce(new Error("Service is busy"));
    await user.click(screen.getByRole("button", { name: "Finish Quiz" }));

    expect(await screen.findByText("Practice paused")).toBeInTheDocument();
    expect(
      screen.getByText("Could not mark that. Two ways to continue."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz" }),
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
        "That set came out too long, so it stopped short.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Try smaller quiz" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz" }),
    ).toBeInTheDocument();
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

  it("shows a calm card with two live exits when generation fails", async () => {
    const user = userEvent.setup();
    generateMock.mockRejectedValueOnce(new Error("No credits left"));
    render(<QuizRunner {...props()} />);

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(await screen.findByText("Practice paused")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Try smaller quiz|Open full quiz/i })
        .length,
    ).toBeGreaterThan(0);
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

describe("Generative card family (spec 0044, covers: AC-7, AC-8, AC-9)", () => {
  it("hides options on the flashcard front and reveals the back after the mark (covers: AC-8)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: "Flashcards" }));
    expect(screen.queryByText("Four")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Answer with option B/ }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Answer with option B/ }),
    );
    expect(await screen.findByText("Back of card")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: Four")).toBeInTheDocument();
  });

  it("reads the hint from the question when the metadata map is empty (covers: AC-7)", async () => {
    const user = userEvent.setup();
    const hintOnQuestion = {
      ...readyQuiz,
      metadata: null,
      questions: questions.map((question, index) =>
        index === 0
          ? { ...question, hint: "Nudge from the question." }
          : question,
      ),
    };
    useQuizMock.mockImplementation((id: string) => {
      if (!id) return EMPTY_QUIZ_PAYLOAD;
      return {
        data: { quiz: hintOnQuestion },
        isPending: false,
        isError: false,
      };
    });
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 3.*0 correct/);

    await user.click(screen.getByRole("button", { name: "Show hint" }));
    expect(
      await screen.findByText("Nudge from the question."),
    ).toBeInTheDocument();
  });

  it("adds an unscored diagram dot from note art with retry (covers: AC-9)", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        drawn: [
          {
            id: "a1",
            payload: "graph TD;A-->B",
            altText: "A flows to B",
            format: "mermaid",
            sourcePage: 2,
          },
        ],
        scans: [],
        total: 1,
      }),
    } as Response);
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 4.*0 correct/);

    const diagramDot = await screen.findByRole("button", {
      name: /diagram, unscored/,
    });
    await user.click(diagramDot);
    expect(
      await screen.findByText("Diagram 1", { exact: true }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Study figure, unscored/),
    ).toBeInTheDocument();
    expect(screen.getByText(/A flows to B/)).toBeInTheDocument();
  });

  it("writes one chat attempt on duplicate run id with no new row (covers: AC-12)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(screen.getByRole("button", { name: /four/i }));
    await screen.findByText("That's correct.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /paris/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: /mars/i }));

    submitMock.mockResolvedValueOnce({ ...attemptResult(), duplicate: true });
    await user.click(screen.getByRole("button", { name: "Finish Quiz" }));

    expect(await screen.findByText("Quiz Results")).toBeInTheDocument();
    expect(screen.queryByText(/failed to submit/i)).not.toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "chat",
        conversationId: "conv-1",
        clientRunId: expect.stringMatching(/^ticlearn-chat-/),
      }),
    );
  });

  it("moves focus to the question heading on dot jump (covers: AC-11)", async () => {
    const user = userEvent.setup();
    await startQuiz(user);

    await user.click(
      screen.getByRole("button", { name: /Question 3 of 3, unanswered/ }),
    );
    await screen.findByText(/Question 3 of 3.*0 correct/);

    expect(document.activeElement?.id).toBe("quiz-runner-heading");
  });

  it("submits quiz plus flashcard answers in one shape with diagrams unscored (covers: AC-12)", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        drawn: [
          {
            id: "a1",
            payload: "graph TD;A-->B",
            altText: "A flows to B",
            format: "mermaid",
            sourcePage: 2,
          },
        ],
        scans: [],
        total: 1,
      }),
    } as Response);
    render(<QuizRunner {...props()} />);
    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    await screen.findByText(/Question 1 of 4.*0 correct/);

    await user.click(screen.getByRole("button", { name: "Flashcards" }));
    await user.click(
      screen.getByRole("button", { name: /Answer with option B/ }),
    );
    await screen.findByText("Back of card");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(
      screen.getByRole("button", { name: /Answer with option B/ }),
    );
    await screen.findByText(/Question 2 of 4.*2 correct/);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(
      screen.getByRole("button", { name: /Answer with option B/ }),
    );
    await screen.findByText(/Question 3 of 4.*3 correct/);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("Diagram 1", { exact: true }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finish Quiz" }));
    expect(await screen.findByText("Quiz Results")).toBeInTheDocument();

    const payload = submitMock.mock.calls.at(-1)?.[0] as {
      answers: Array<{ questionId: string; answer: string }>;
      source: string;
    };
    expect(payload.answers).toHaveLength(3);
    expect(payload.answers[0]).toEqual({ questionId: "q1", answer: "Four" });
    expect(payload.source).toBe("chat");
  });

  it("restores the run from the server backup on a fresh browser (covers: AC-5)", async () => {
    const user = userEvent.setup();
    const stored = {
      version: 6,
      quizId: "quiz-1",
      answers: { q1: "Four" },
      marks: {},
      currentIndex: 1,
      count: 3,
      clientRunId: "run-restored",
      updatedAt: Date.now(),
      mode: "quiz",
      hintOpen: {},
      minimized: false,
      items: [
        { kind: "quiz", ref: "q1" },
        { kind: "quiz", ref: "q2" },
        { kind: "quiz", ref: "q3" },
      ],
    };
    backupReadMock.mockResolvedValueOnce({
      snapshot: JSON.stringify(stored),
      clientRunId: "run-restored",
    });
    render(
      <QuizRunner
        conversationId="conv-restore"
        noteId="note-1"
        noteTitle="Bio notes"
      />,
    );

    expect(
      await screen.findByText(/Question 2 of 3.*0 correct/),
    ).toBeInTheDocument();
    expect(backupReadMock).toHaveBeenCalledWith("conv-restore", undefined);
    expect(
      window.sessionStorage.getItem("ticlearn:quiz:active:conv-restore"),
    ).toBe("run-restored");
    await user.click(screen.getByRole("button", { name: /paris/i }));
    expect(await screen.findByText("That's correct.")).toBeInTheDocument();
  });

  it("cuts to the results with no glide when reduced motion is set (covers: AC-11)", async () => {
    const user = userEvent.setup();
    const coarse = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    try {
      await startQuiz(user);

      await user.click(screen.getByRole("button", { name: /four/i }));
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(screen.getByRole("button", { name: /paris/i }));
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(screen.getByRole("button", { name: /mars/i }));
      await user.click(screen.getByRole("button", { name: "Finish Quiz" }));

      expect(await screen.findByText("Quiz Results")).toBeInTheDocument();
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    } finally {
      if (coarse) window.matchMedia = coarse;
      else delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });

  it("keeps a diagram readable with retry when art fails on reload (covers: AC-9)", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      "ticlearn:quiz:run:conv-art:run-art",
      JSON.stringify({
        version: 6,
        quizId: "quiz-1",
        answers: {},
        marks: {},
        currentIndex: 3,
        count: 3,
        clientRunId: "run-art",
        updatedAt: Date.now(),
        mode: "quiz",
        hintOpen: {},
        minimized: false,
        items: [
          { kind: "quiz", ref: "q1" },
          { kind: "quiz", ref: "q2" },
          { kind: "quiz", ref: "q3" },
          { kind: "diagram", ref: "a9", caption: "Diagram 1" },
        ],
      }),
    );
    window.sessionStorage.setItem("ticlearn:quiz:active:conv-art", "run-art");
    render(
      <QuizRunner
        conversationId="conv-art"
        noteId="note-1"
        noteTitle="Bio notes"
      />,
    );

    expect(
      await screen.findAllByText("Diagram 1", { exact: true }),
    ).toHaveLength(2);
    expect(await screen.findByText(/could not load/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try loading the figure again" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Question 1 of 4, unanswered/ }),
    );
    expect(
      await screen.findByText(/Question 1 of 4.*0 correct/),
    ).toBeInTheDocument();
  });
});

describe("QuizRunner live build card (spec 0042, covers: AC-1)", () => {
  const generatingPayload = {
    data: {
      quiz: {
        id: "quiz-9",
        title: "Quiz - Bio notes",
        noteTitle: "Bio notes",
        status: "GENERATING",
        buildStage: "GENERATING",
        builtCount: 2,
        buildTotal: 10,
        buildError: null,
        buildStartedAt: new Date(Date.now() - 2000).toISOString(),
        questions: [],
      },
    },
    isPending: false,
    isError: false,
  };

  it("shows live counts while the build runs", async () => {
    useQuizMock.mockImplementation(() => generatingPayload);
    render(
      <QuizRunner
        conversationId="conv-1"
        noteId="note-1"
        noteTitle="Bio notes"
        initialQuizId="quiz-9"
      />,
    );

    expect(await screen.findByText("Building your quiz")).toBeInTheDocument();
    expect(screen.getByText("2 of 10 · 20%")).toBeInTheDocument();
  });

  it("waits quietly before the first progress write lands", async () => {
    useQuizMock.mockImplementation(() => EMPTY_QUIZ_PAYLOAD);
    render(
      <QuizRunner
        conversationId="conv-1"
        noteId="note-1"
        noteTitle="Bio notes"
        initialQuizId="quiz-9"
      />,
    );

    expect(
      await screen.findByText("This thread refreshes until the quiz is ready."),
    ).toBeInTheDocument();
  });
});
