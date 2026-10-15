import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/community/posts/[id]/like/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    postLike: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    post: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const db = prisma as unknown as {
  postLike: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  post: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function request(id: string) {
  return new Request(`http://localhost:3000/api/community/posts/${id}/like`, {
    method: "POST",
  });
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.postLike.findUnique.mockResolvedValue(null);
  db.postLike.create.mockResolvedValue({});
  db.postLike.delete.mockResolvedValue({});
  db.post.update.mockResolvedValue({});
  db.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
});

describe("POST /api/community/posts/[id]/like (covers: AC-5)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await POST(request("p1"), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(res.status).toBe(401);
  });

  it("increments the stored like total when liking", async () => {
    const res = await POST(request("p1"), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ liked: true, success: true });
    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { likeCount: { increment: 1 } },
    });
  });

  it("decrements the stored like total when unliking", async () => {
    db.postLike.findUnique.mockResolvedValue({ id: "l1" });

    const res = await POST(request("p1"), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ liked: false, success: true });
    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { likeCount: { decrement: 1 } },
    });
  });
});
