import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/usage/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/chat-usage", () => ({
  getChatResetWindow: vi.fn(() => ({
    nextResetAt: new Date("2026-10-16T00:00:00Z"),
    windowStart: new Date("2026-10-15T00:00:00Z"),
    resetsInSeconds: 100,
  })),
  getRemainingAllowance: vi.fn((limit: number, used: number) =>
    Math.max(0, limit - used),
  ),
}));

const db = prisma as unknown as {
  subscription: { findFirst: ReturnType<typeof vi.fn> };
  note: { count: ReturnType<typeof vi.fn> };
  quiz: { count: ReturnType<typeof vi.fn> };
  chatMessage: { count: ReturnType<typeof vi.fn> };
};

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.subscription.findFirst.mockResolvedValue(null);
  db.note.count.mockResolvedValue(0);
  db.quiz.count.mockResolvedValue(0);
  db.chatMessage.count = vi.fn().mockResolvedValue(0);
});

describe("GET /api/usage (covers: AC-2, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("resolves a free plan when there is no subscription", async () => {
    const body = await (await GET()).json();

    expect(body.plan).toBe("FREE");
    expect(body.status).toBe("NONE");
    expect(body.limits.pdfUploads).toBe(5);
    expect(body.limits.quizGenerations).toBe(10);
    expect(body.limits.aiTutorMessages).toBe(15);
  });

  it("reads the active subscription plan", async () => {
    db.subscription.findFirst.mockResolvedValue({
      id: "sub-1",
      userId: "student-1",
      plan: "STANDARD",
      status: "ACTIVE",
      user: { id: "student-1" },
    });

    const body = await (await GET()).json();

    expect(body.plan).toBe("STANDARD");
    expect(body.status).toBe("ACTIVE");
  });

  it("scopes every count to the signed in user", async () => {
    await GET();

    expect(db.note.count).toHaveBeenCalledWith({
      where: { userId: "student-1" },
    });
    expect(db.quiz.count).toHaveBeenCalledWith({
      where: { userId: "student-1" },
    });
    expect(db.chatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: "student-1" }),
    });
  });

  it("returns stored note and quiz totals as usage", async () => {
    db.note.count.mockResolvedValue(3);
    db.quiz.count.mockResolvedValue(7);

    const body = await (await GET()).json();

    expect(body.usage).toEqual({
      pdfUploads: 3,
      quizGenerations: 7,
      aiTutorMessages: 0,
    });
  });
});
