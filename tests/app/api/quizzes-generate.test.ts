import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/quizzes/generate/route";
import { auth } from "@/lib/auth";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { quizCreditsRequired } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findFirst: vi.fn() },
    subscription: { findFirst: vi.fn() },
    quiz: { count: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

const db = prisma as unknown as {
  note: { findFirst: ReturnType<typeof vi.fn> };
  subscription: { findFirst: ReturnType<typeof vi.fn> };
  quiz: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

function generate(body: unknown) {
  return POST(
    new Request("http://localhost/api/quizzes/generate", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
}

const readyNote = {
  id: "note-1",
  userId: "student-1",
  title: "Biology",
  status: "READY",
  extractedText: "Cells are the basic unit of life.",
};

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  vi.mocked(inngest.send).mockResolvedValue(undefined as never);
  vi.mocked(quizCreditsRequired).mockReturnValue(false);
  vi.mocked(getUserCreditBalance).mockResolvedValue(1000);
  vi.mocked(spendCredits).mockResolvedValue({ balance: 950 } as never);
  db.note.findFirst.mockResolvedValue(readyNote);
  db.subscription.findFirst.mockResolvedValue(null);
  db.quiz.count.mockResolvedValue(0);
  db.quiz.create.mockResolvedValue({
    id: "quiz-1",
    status: "GENERATING",
    questionCount: 0,
  });
});

describe("POST /api/quizzes/generate (covers: AC-2)", () => {
  it("returns 401 without a session", async () => {
    signIn(null);

    expect((await generate({ noteId: "note-1" })).status).toBe(401);
  });

  it("returns 404 when the note is not the caller's own", async () => {
    db.note.findFirst.mockResolvedValue(null);

    expect((await generate({ noteId: "note-1" })).status).toBe(404);
  });

  it("returns 400 when the note is not ready yet", async () => {
    db.note.findFirst.mockResolvedValue({ ...readyNote, status: "PROCESSING" });

    expect((await generate({ noteId: "note-1" })).status).toBe(400);
  });

  it("creates a GENERATING placeholder and queues the job without blocking (covers: AC-2)", async () => {
    const res = await generate({ noteId: "note-1", questionCount: 5 });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("GENERATING");
    expect(body.quiz.id).toBe("quiz-1");
    expect(db.quiz.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "GENERATING",
          userId: "student-1",
          noteId: "note-1",
        }),
      }),
    );
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "quiz/generate",
        data: expect.objectContaining({
          noteId: "note-1",
          quizId: "quiz-1",
          userId: "student-1",
        }),
      }),
    );
  });

  it("still returns 200 GENERATING when queuing the job fails (covers: AC-6)", async () => {
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("queue down"));

    const res = await generate({ noteId: "note-1" });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("GENERATING");
  });

  it("refuses a chat sourced quiz over the limit exactly like a page quiz (spec 0031 AC-8)", async () => {
    db.quiz.count.mockResolvedValue(9999);

    const page = await generate({ noteId: "note-1", questionCount: 5 });
    const chat = await generate({
      noteId: "note-1",
      questionCount: 5,
      source: "chat",
      conversationId: "conv-1",
    });

    expect(page.status).toBe(403);
    expect(chat.status).toBe(403);
    expect(db.quiz.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown source hint (covers: AC-8)", async () => {
    const res = await generate({ noteId: "note-1", source: "evil" });

    expect(res.status).toBe(400);
    expect(db.quiz.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a count above the page cap (covers: AC-8)", async () => {
    // Spec 0042 caps the page entry at 40 and the chat entry at 10. A count
    // of 41 fails here while small counts build fine.
    const res = await generate({ noteId: "note-1", questionCount: 41 });

    expect(res.status).toBe(400);
    expect(db.quiz.create).not.toHaveBeenCalled();
  });

  it("opens the build as QUEUED with the total set (spec 0042, covers: AC-1)", async () => {
    const res = await generate({ noteId: "note-1", questionCount: 5 });

    expect(res.status).toBe(200);
    expect(db.quiz.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "student-1",
        noteId: "note-1",
        status: "GENERATING",
        buildStage: "QUEUED",
        builtCount: 0,
        buildTotal: 5,
        buildError: null,
        buildStartedAt: expect.any(Date),
      }),
    });
  });

  it("reserves credits keyed by the quiz id at create (spec 0042, covers: AC-6)", async () => {
    vi.mocked(quizCreditsRequired).mockReturnValue(true);

    const res = await generate({ noteId: "note-1", questionCount: 5 });

    expect(res.status).toBe(200);
    expect(spendCredits).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledWith({
      userId: "student-1",
      amount: expect.any(Number),
      type: "QUIZ_GENERATION",
      description: expect.stringContaining("Biology"),
      referenceId: "quiz-1",
    });
  });

  it("fails the row instead of stranding it when the reserve fails (spec 0042, covers: AC-6)", async () => {
    vi.mocked(quizCreditsRequired).mockReturnValue(true);
    vi.mocked(spendCredits).mockRejectedValueOnce(
      new Error("Insufficient credits"),
    );

    const res = await generate({ noteId: "note-1", questionCount: 5 });

    expect(res.status).toBe(402);
    expect(db.quiz.update).toHaveBeenCalledWith({
      where: { id: "quiz-1" },
      data: expect.objectContaining({ status: "ERROR" }),
    });
  });
});
