import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/quizzes/attempts/route";
import { explainMCQAnswer, gradeOpenAnswer } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quiz: { findUnique: vi.fn() },
    quizAttempt: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ai", () => ({
  explainMCQAnswer: vi.fn(() => Promise.resolve("Explanation")),
  gradeOpenAnswer: vi.fn(() => Promise.resolve("Score: 90")),
}));

vi.mock("@/lib/kpi", () => ({
  trackEvent: vi.fn(() => Promise.resolve()),
}));

const db = prisma as unknown as {
  quiz: { findUnique: ReturnType<typeof vi.fn> };
  quizAttempt: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/quizzes/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.quiz.findUnique.mockResolvedValue(null);
  db.quizAttempt.findFirst.mockResolvedValue(null);
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const tx = {
      quizAttempt: {
        create: vi.fn(async () => ({ id: "attempt-1" })),
      },
      userStats: {
        findFirst: vi.fn(async () => ({
          userId: "student-1",
          totalPoints: 10,
          quizzesTaken: 2,
          avgScore: 50,
          currentStreak: 1,
          longestStreak: 3,
          lastActivityDate: null,
        })),
        updateMany: vi.fn(async () => ({})),
        create: vi.fn(async () => ({})),
      },
    };
    return fn(tx);
  });
});

describe("POST /api/quizzes/attempts (covers: AC-7, AC-8, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await POST(request({ quizId: "q1", answers: [] }));

    expect(res.status).toBe(401);
  });

  it("returns 422 when answers are empty", async () => {
    const res = await POST(request({ quizId: "q1", answers: [] }));

    expect(res.status).toBe(422);
  });

  it("returns 422 when there are too many answers", async () => {
    const answers = Array.from({ length: 201 }, (_, i) => ({
      questionId: `q${i}`,
      answer: "A",
    }));

    const res = await POST(request({ quizId: "q1", answers }));

    expect(res.status).toBe(422);
  });

  it("returns 404 when the quiz is missing", async () => {
    const res = await POST(
      request({
        quizId: "missing",
        answers: [{ questionId: "q1", answer: "A" }],
      }),
    );

    expect(res.status).toBe(404);
  });

  it("increments totals with one atomic update in the attempt transaction", async () => {
    db.quiz.findUnique.mockResolvedValue({
      id: "q1",
      userId: "student-1",
      title: "Bio quiz",
      noteTitle: "Bio notes",
      questions: [
        {
          id: "question-1",
          type: "MCQ",
          question: "2 + 2?",
          correctAnswer: "4",
          explanation: "Addition",
          options: ["3", "4"],
        },
      ],
    });

    const res = await POST(
      request({
        quizId: "q1",
        answers: [{ questionId: "question-1", answer: "4" }],
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pointsEarned).toBe(20);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("grades an open answer through the AI grader", async () => {
    db.quiz.findUnique.mockResolvedValue({
      id: "q2",
      userId: "student-1",
      title: "Open quiz",
      noteTitle: "Notes",
      questions: [
        {
          id: "question-2",
          type: "OPEN",
          question: "Explain gravity",
          correctAnswer: "Force",
          explanation: null,
        },
      ],
    });
    vi.mocked(gradeOpenAnswer).mockResolvedValue("Score: 90");

    const res = await POST(
      request({
        quizId: "q2",
        answers: [{ questionId: "question-2", answer: "A force" }],
      }),
    );

    expect(res.status).toBe(200);
    expect(gradeOpenAnswer).toHaveBeenCalled();
    const body = await res.json();
    expect(body.pointsEarned).toBe(20);
  });

  it("explains a wrong MCQ answer", async () => {
    db.quiz.findUnique.mockResolvedValue({
      id: "q3",
      userId: "student-1",
      title: "MCQ quiz",
      noteTitle: "Notes",
      questions: [
        {
          id: "question-3",
          type: "MCQ",
          question: "Capital of France?",
          correctAnswer: "Paris",
          explanation: "City",
          options: ["London", "Paris"],
        },
      ],
    });

    const res = await POST(
      request({
        quizId: "q3",
        answers: [{ questionId: "question-3", answer: "London" }],
      }),
    );

    expect(res.status).toBe(200);
    expect(explainMCQAnswer).toHaveBeenCalled();
    const body = await res.json();
    expect(body.pointsEarned).toBe(5);
  });

  it("returns 404 when the quiz belongs to another student (covers: AC-7)", async () => {
    db.quiz.findUnique.mockResolvedValue({
      id: "foreign",
      userId: "someone-else",
      title: "Foreign quiz",
      noteTitle: "Notes",
      questions: [
        {
          id: "question-9",
          type: "MCQ",
          question: "2 + 2?",
          correctAnswer: "4",
          explanation: null,
          options: ["3", "4"],
        },
      ],
    });

    const res = await POST(
      request({
        quizId: "foreign",
        answers: [{ questionId: "question-9", answer: "4" }],
      }),
    );

    expect(res.status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("writes an unknown source hint as null and keeps chat or page (covers: AC-3)", async () => {
    db.quiz.findUnique.mockResolvedValue({
      id: "q1",
      userId: "student-1",
      title: "MCQ quiz",
      noteTitle: "Notes",
      questions: [
        {
          id: "question-1",
          type: "MCQ",
          question: "2 + 2?",
          correctAnswer: "4",
          explanation: "Addition",
          options: ["3", "4"],
        },
      ],
    });
    const created: Array<{ source: unknown; conversationId: unknown }> = [];
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        quizAttempt: {
          create: vi.fn(
            async (args: {
              data: { source: unknown; conversationId: unknown };
            }) => {
              created.push(args.data);
              return { id: `attempt-${created.length}` };
            },
          ),
        },
        userStats: {
          findFirst: vi.fn(async () => null),
          updateMany: vi.fn(async () => ({})),
          create: vi.fn(async () => ({})),
        },
      };
      return fn(tx);
    });

    const evil = await POST(
      request({
        quizId: "q1",
        answers: [{ questionId: "question-1", answer: "4" }],
        source: "evil",
        conversationId: "conv-1",
        clientRunId: "run-evil",
      }),
    );
    const chat = await POST(
      request({
        quizId: "q1",
        answers: [{ questionId: "question-1", answer: "4" }],
        source: "chat",
        conversationId: "conv-1",
        clientRunId: "run-chat",
      }),
    );

    expect(evil.status).toBe(200);
    expect(chat.status).toBe(200);
    expect(created).toHaveLength(2);
    expect(created[0]?.source).toBeNull();
    expect(created[0]?.conversationId).toBe("conv-1");
    expect(created[1]?.source).toBe("chat");
  });

  it("returns the existing attempt when the client run id repeats (covers: AC-3)", async () => {
    db.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-9",
      quizId: "q1",
      score: 80,
      correctAnswers: 4,
      totalQuestions: 5,
      source: "chat",
      answers: [],
    });

    const res = await POST(
      request({
        quizId: "q1",
        answers: [{ questionId: "question-1", answer: "4" }],
        source: "chat",
        conversationId: "conv-1",
        clientRunId: "run-1",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.attempt.id).toBe("attempt-9");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when the quiz id is missing (covers: AC-7)", async () => {
    const res = await POST(
      request({ answers: [{ questionId: "q1", answer: "A" }] }),
    );

    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 422 when answers is not a list (covers: AC-3)", async () => {
    const res = await POST(request({ quizId: "q1", answers: "nope" }));

    expect(res.status).toBe(422);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
