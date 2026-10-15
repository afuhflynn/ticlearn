import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/quizzes/[id]/status/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { quiz: { findFirst: vi.fn() } },
}));

const db = prisma as unknown as {
  quiz: { findFirst: ReturnType<typeof vi.fn> };
};

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

function get(id: string) {
  return GET(new Request("http://localhost/api/quizzes/x/status"), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.quiz.findFirst.mockResolvedValue({
    id: "q1",
    status: "READY",
    questionCount: 7,
  });
});

describe("GET /api/quizzes/[id]/status (covers: AC-2)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await get("q1");

    expect(res.status).toBe(401);
  });

  it("returns 404 when the quiz is not found for this caller", async () => {
    db.quiz.findFirst.mockResolvedValue(null);

    const res = await get("q1");

    expect(res.status).toBe(404);
  });

  it("scopes the lookup to the signed in user", async () => {
    await get("q1");

    expect(db.quiz.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "q1", userId: "student-1" },
      }),
    );
  });

  it("returns only the polling fields a client needs, with no questions leaked", async () => {
    const res = await get("q1");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      id: "q1",
      status: "READY",
      questionCount: 7,
    });
  });
});
