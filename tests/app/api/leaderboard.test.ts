import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/leaderboard/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as unknown as {
  userStats: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/leaderboard${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.userStats.findMany = vi.fn().mockResolvedValue([]);
  db.userStats.count = vi.fn().mockResolvedValue(0);
});

describe("GET /api/leaderboard (covers: AC-1, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns ordered rows and the current user rank", async () => {
    db.userStats.findMany.mockResolvedValue([
      {
        user: { id: "u2", name: "Ada", image: null, role: "USER" },
        totalPoints: 120,
        quizzesTaken: 4,
        currentStreak: 2,
      },
    ]);
    db.userStats.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const body = await (await GET(request("?page=1&limit=20"))).json();

    expect(body.leaderboard).toHaveLength(1);
    expect(body.leaderboard[0]).toMatchObject({
      rank: 1,
      userId: "u2",
      userName: "Ada",
      totalPoints: 120,
    });
    expect(body.currentUserRank).toBe(1);
    expect(body.total).toBe(1);
  });

  it("excludes admin rows through the user role filter", async () => {
    await GET(request());

    expect(db.userStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { role: { not: "ADMIN" } } },
      }),
    );
  });

  it("counts rank as rows strictly above the signed in user", async () => {
    db.userStats.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const body = await (await GET(request())).json();

    expect(db.userStats.count).toHaveBeenLastCalledWith({
      where: { user: { role: { not: "ADMIN" } }, totalPoints: { gt: 0 } },
    });
    expect(body.currentUserRank).toBe(4);
  });

  it("caps the page size at 100", async () => {
    await GET(request("?limit=500"));

    expect(db.userStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it("offsets by page", async () => {
    await GET(request("?page=3&limit=20"));

    expect(db.userStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });
});
