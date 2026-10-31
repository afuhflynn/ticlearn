import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/quizzes/generate/route";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findFirst: vi.fn() },
    subscription: { findFirst: vi.fn() },
    quiz: { count: vi.fn(), create: vi.fn() },
  },
}));

const db = prisma as unknown as {
  note: { findFirst: ReturnType<typeof vi.fn> };
  subscription: { findFirst: ReturnType<typeof vi.fn> };
  quiz: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
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
    db.quiz.count.mockResolvedValue(5);

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

  it("returns 400 for a count below the server floor (covers: AC-8)", async () => {
    // The chat runner clamps counts to 1 to 10 client side while the server
    // floor stays at 5, so a Custom count of 3 fails here. Pinned as is;
    // whether the floor should drop to 1 is a product call.
    const res = await generate({ noteId: "note-1", questionCount: 3 });

    expect(res.status).toBe(400);
    expect(db.quiz.create).not.toHaveBeenCalled();
  });
});
