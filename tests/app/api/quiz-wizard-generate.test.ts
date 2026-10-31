import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/quizzes/wizard-generate/route";
import { generateQuizFromNote } from "@/lib/ai/index";
import { auth } from "@/lib/auth";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { quizCreditsRequired } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findFirst: vi.fn() },
    subscription: { findFirst: vi.fn() },
    quiz: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ai/index", () => ({
  generateQuizFromNote: vi.fn(),
}));

const db = prisma as unknown as {
  note: { findFirst: ReturnType<typeof vi.fn> };
  subscription: { findFirst: ReturnType<typeof vi.fn> };
  quiz: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/quizzes/wizard-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

const valid = {
  topicText: "Photosynthesis",
  noteId: null,
  levelChoice: "GCE",
  formatChoice: "MCQ plus structured",
  count: 5,
  difficulty: "STANDARD",
};

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.subscription.findFirst.mockResolvedValue(null);
  db.quiz.count.mockResolvedValue(0);
});

describe("POST /api/quizzes/wizard-generate (spec 0033, covers: AC-8)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);
    const res = await POST(request(valid));
    expect(res.status).toBe(401);
  });

  it("returns 400 on bad input", async () => {
    const res = await POST(request({ ...valid, count: 99 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a foreign note", async () => {
    db.note.findFirst.mockResolvedValue(null);
    const res = await POST(request({ ...valid, noteId: "foreign" }));
    expect(res.status).toBe(404);
  });

  it("refuses over the quiz cap with the page error string", async () => {
    db.quiz.count.mockResolvedValue(9999);
    const res = await POST(request(valid));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Quiz generation limit reached (4)");
    expect(body.error).toContain("Upgrade");
  });

  it("builds a text only quiz from the topic when no note is linked", async () => {
    vi.mocked(generateQuizFromNote).mockResolvedValue({
      questions: [
        {
          type: "MCQ",
          question: "What is photosynthesis?",
          options: ["A", "B"],
          correctAnswer: "A",
          explanation: null,
        },
      ],
      fromCache: false,
    } as never);
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        quiz: {
          create: vi.fn(async () => ({
            id: "quiz-text-1",
            title: "Photosynthesis (GCE, 5)",
          })),
        },
        quizQuestion: { createMany: vi.fn(async () => ({})) },
      };
      return fn(tx);
    });

    const res = await POST(request(valid));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      status: string;
      quiz: { id: string };
    };
    expect(body.success).toBe(true);
    expect(body.status).toBe("READY");
    expect(body.quiz.id).toBe("quiz-text-1");
  });

  it("reuses the page pipeline for a linked ready note", async () => {
    db.note.findFirst.mockResolvedValue({
      id: "note-1",
      title: "Photosynthesis",
      status: "READY",
      extractedText: "chlorophyll ".repeat(50),
    });
    db.quiz.create.mockResolvedValue({ id: "quiz-note-1" });

    const res = await POST(request({ ...valid, noteId: "note-1" }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      status: string;
      quiz: { id: string };
    };
    expect(body.status).toBe("GENERATING");
    expect(body.quiz.id).toBe("quiz-note-1");
  });

  it("returns 402 when the debit is wanted and the balance is low", async () => {
    vi.mocked(quizCreditsRequired).mockReturnValue(true);
    vi.mocked(getUserCreditBalance).mockResolvedValue(0);

    const res = await POST(request(valid));

    expect(res.status).toBe(402);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Insufficient credits");
  });

  it("debits once with the quiz id as the reference on text only success", async () => {
    vi.mocked(quizCreditsRequired).mockReturnValue(true);
    vi.mocked(getUserCreditBalance).mockResolvedValue(1000);
    vi.mocked(generateQuizFromNote).mockResolvedValue({
      questions: [
        {
          type: "MCQ",
          question: "What is photosynthesis?",
          options: ["A", "B"],
          correctAnswer: "A",
          explanation: null,
        },
      ],
      fromCache: false,
    } as never);
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        quiz: {
          create: vi.fn(async () => ({ id: "quiz-debit-1" })),
        },
        quizQuestion: { createMany: vi.fn(async () => ({})) },
      };
      return fn(tx);
    });

    const res = await POST(request(valid));

    expect(res.status).toBe(200);
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: "QUIZ_GENERATION",
        referenceId: "quiz-debit-1",
      }),
    );
  });

  it("returns 400 when the note is not ready", async () => {
    db.note.findFirst.mockResolvedValue({
      id: "note-1",
      title: "Photosynthesis",
      status: "PROCESSING",
      extractedText: null,
    });

    const res = await POST(request({ ...valid, noteId: "note-1" }));

    expect(res.status).toBe(400);
  });
});
