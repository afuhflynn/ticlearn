import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/community/posts/[id]/comments/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { findUnique: vi.fn(), update: vi.fn() },
    comment: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const db = prisma as unknown as {
  post: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  comment: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function req(id: string, init?: RequestInit) {
  return new Request(
    `http://localhost:3000/api/community/posts/${id}/comments`,
    init,
  );
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.post.findUnique.mockResolvedValue({ id: "p1" });
  db.post.update.mockResolvedValue({});
  db.comment.findMany.mockResolvedValue([]);
  db.comment.create.mockResolvedValue({});
  db.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
});

describe("/api/community/posts/[id]/comments (covers: AC-5, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(req("p1"), params("p1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when the post is missing", async () => {
    db.post.findUnique.mockResolvedValue(null);

    const res = await POST(
      req("p1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Nice" }),
      }),
      params("p1"),
    );

    expect(res.status).toBe(404);
  });

  it("rejects an empty comment with 400", async () => {
    const res = await POST(
      req("p1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "  " }),
      }),
      params("p1"),
    );

    expect(res.status).toBe(400);
  });

  it("creates a comment and increments the stored comment total", async () => {
    db.comment.findMany.mockResolvedValue([
      {
        id: "c1",
        content: "Nice",
        postId: "p1",
        userId: "student-1",
        user: { id: "student-1", name: "Ada", image: null },
        replies: [],
      },
    ]);

    const res = await POST(
      req("p1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Nice" }),
      }),
      params("p1"),
    );

    expect(res.status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown[];
    expect(ops).toHaveLength(2);
  });

  it("returns comments with bounded replies", async () => {
    const res = await GET(req("p1"), params("p1"));

    expect(res.status).toBe(200);
    expect(db.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
