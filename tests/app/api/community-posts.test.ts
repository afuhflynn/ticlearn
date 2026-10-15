import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/community/posts/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const db = prisma.post as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/community/posts${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.findMany.mockResolvedValue([]);
  db.count.mockResolvedValue(0);
});

describe("GET /api/community/posts (covers: AC-5, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("returns stored like and comment totals", async () => {
    db.findMany.mockResolvedValue([
      {
        id: "p1",
        content: "Hello",
        subject: "Math",
        isPinned: false,
        isAnnouncement: false,
        likeCount: 4,
        commentCount: 2,
        createdAt: new Date("2026-10-01T00:00:00Z"),
        updatedAt: new Date("2026-10-01T00:00:00Z"),
        userId: "u1",
        user: { id: "u1", name: "Ada", image: null },
        likes: [{ id: "l1" }],
      },
    ]);
    db.count.mockResolvedValue(1);

    const body = await (await GET(request())).json();

    expect(body.posts[0].likeCount).toBe(4);
    expect(body.posts[0].commentCount).toBe(2);
    expect(body.posts[0].isLiked).toBe(true);
  });

  it("reads the current user like through the session", async () => {
    await GET(request());

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it("caps the page size at 100", async () => {
    await GET(request("?limit=500"));

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
