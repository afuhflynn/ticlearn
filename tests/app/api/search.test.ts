import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    note: { findMany: vi.fn() },
    quiz: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
  },
}));

const db = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
  note: { findMany: ReturnType<typeof vi.fn> };
  quiz: { findMany: ReturnType<typeof vi.fn> };
  post: { findMany: ReturnType<typeof vi.fn> };
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/search${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.$queryRaw.mockResolvedValue([]);
  db.note.findMany.mockResolvedValue([]);
  db.quiz.findMany.mockResolvedValue([]);
  db.post.findMany.mockResolvedValue([]);
});

describe("GET /api/search (covers: AC-6, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("returns 422 for an empty query before touching the database", async () => {
    const res = await GET(request("?q="));

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: "Search query is required",
    });
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.note.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty result for a one character query", async () => {
    const res = await GET(request("?q=a"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ results: [] });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("uses the indexed notes vector, quiz title trigram and post content trigram", async () => {
    db.$queryRaw
      .mockResolvedValueOnce([
        { id: "n1", title: "Biology notes", summary: "Cells" },
      ])
      .mockResolvedValueOnce([
        { id: "q1", title: "Biology quiz", noteTitle: "Bio" },
      ])
      .mockResolvedValueOnce([
        { id: "p1", content: "Biology post", subject: "Science" },
      ]);

    const body = await (await GET(request("?q=biology"))).json();

    expect(db.$queryRaw).toHaveBeenCalledTimes(3);
    expect(body.results).toHaveLength(3);
    expect(body.results[0]).toMatchObject({
      type: "note",
      id: "n1",
      title: "Biology notes",
    });
    expect(body.results[1].type).toBe("quiz");
    expect(body.results[2].type).toBe("post");
  });

  it("falls back to plain matching when the indexed path is unavailable", async () => {
    db.$queryRaw.mockRejectedValue(new Error("pg_trgm missing"));
    db.note.findMany.mockResolvedValue([
      { id: "n2", title: "Physics notes", summary: "Motion" },
    ]);
    db.quiz.findMany.mockResolvedValue([
      { id: "q2", title: "Physics quiz", noteTitle: "Physics" },
    ]);
    db.post.findMany.mockResolvedValue([
      { id: "p2", content: "Physics post", subject: "Science" },
    ]);

    const body = await (await GET(request("?q=physics"))).json();

    expect(body.results).toHaveLength(3);
    expect(body.results[0].type).toBe("note");
  });
});
