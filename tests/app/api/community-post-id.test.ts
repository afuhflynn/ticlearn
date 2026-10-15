import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/community/posts/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const db = prisma.post as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function req(id: string, init?: RequestInit) {
  return new Request(`http://localhost:3000/api/community/posts/${id}`, init);
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
  db.findUnique.mockResolvedValue(null);
  db.findFirst.mockResolvedValue(null);
  db.update.mockResolvedValue({});
  db.delete.mockResolvedValue({});
});

describe("/api/community/posts/[id] (covers: AC-5)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(req("p1"), params("p1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when the post is missing", async () => {
    const res = await GET(req("p1"), params("p1"));

    expect(res.status).toBe(404);
  });

  it("returns the post with the current user like flag", async () => {
    db.findUnique.mockResolvedValue({
      id: "p1",
      content: "Body",
      userId: "u1",
      likeCount: 1,
      comments: [],
      likes: [{ id: "l1", userId: "student-1" }],
    });

    const body = await (await GET(req("p1"), params("p1"))).json();

    expect(body.post.isLiked).toBe(true);
    expect(body.post.likeCount).toBe(1);
  });

  it("only lets the owner update the post", async () => {
    db.findFirst.mockResolvedValue({ id: "p1", userId: "student-1" });
    db.update.mockResolvedValue({ id: "p1", content: "Updated" });

    const res = await PUT(
      req("p1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated" }),
      }),
      params("p1"),
    );

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { content: "Updated" },
    });
  });

  it("returns 404 when another student tries to update the post", async () => {
    const res = await PUT(
      req("p1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Nope" }),
      }),
      params("p1"),
    );

    expect(res.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("lets an admin delete any post", async () => {
    signIn({ id: "admin-1", role: "ADMIN" });
    db.findFirst.mockResolvedValue({ id: "p1", userId: "someone-else" });

    const res = await DELETE(req("p1"), params("p1"));

    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("only lets the owner delete their own post", async () => {
    db.findFirst.mockResolvedValue({ id: "p1", userId: "student-1" });

    const res = await DELETE(req("p1"), params("p1"));

    expect(res.status).toBe(200);
    expect(db.findFirst).toHaveBeenCalledWith({
      where: { id: "p1", userId: "student-1" },
    });
  });
});
