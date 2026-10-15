import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/users/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn(), count: vi.fn() },
    affiliate: { findMany: vi.fn() },
  },
}));

const db = prisma as unknown as {
  user: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  affiliate: { findMany: ReturnType<typeof vi.fn> };
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/admin/users${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "admin-1", role: "ADMIN" });
  db.user.findMany.mockResolvedValue([]);
  db.user.count.mockResolvedValue(0);
  db.affiliate.findMany.mockResolvedValue([]);
});

describe("GET /api/admin/users (covers: AC-4, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non admin caller", async () => {
    signIn({ id: "student-1", role: "USER" });

    const res = await GET(request());

    expect(res.status).toBe(403);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid sort column with 422", async () => {
    const res = await GET(request("?sortBy=password&sortOrder=desc"));

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: "Invalid sort column or direction",
    });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid sort direction with 422", async () => {
    const res = await GET(request("?sortBy=name&sortOrder=sideways"));

    expect(res.status).toBe(422);
  });

  it("returns users with affiliate names in one affiliate read", async () => {
    db.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Ada",
        email: "ada@example.com",
        image: null,
        role: "USER",
        createdAt: new Date("2026-10-01T00:00:00Z"),
        referredBy: "CODE1",
        refApplied: true,
        levelOfStudy: "University",
        onboardingCompleted: true,
        onboardingSkipped: false,
        _count: { notes: 2, quizzes: 3, quizAttempts: 4 },
      },
      {
        id: "u2",
        name: "Bruno",
        email: "bruno@example.com",
        image: null,
        role: "USER",
        createdAt: new Date("2026-10-02T00:00:00Z"),
        referredBy: null,
        refApplied: false,
        levelOfStudy: null,
        onboardingCompleted: false,
        onboardingSkipped: true,
        _count: { notes: 0, quizzes: 1, quizAttempts: 1 },
      },
    ]);
    db.user.count.mockResolvedValue(2);
    db.affiliate.findMany.mockResolvedValue([
      { code: "CODE1", userName: "Referrer", userEmail: "ref@example.com" },
    ]);

    const body = await (
      await GET(request("?sortBy=createdAt&sortOrder=desc"))
    ).json();

    expect(body.users).toHaveLength(2);
    expect(body.users[0]).toMatchObject({
      referredByName: "Referrer",
      referredByEmail: "ref@example.com",
      notesCount: 2,
    });
    expect(body.users[1]).toMatchObject({
      referredByName: null,
      referredByEmail: null,
    });
    expect(db.affiliate.findMany).toHaveBeenCalledTimes(1);
    expect(db.affiliate.findMany).toHaveBeenCalledWith({
      where: { code: { in: ["CODE1"] } },
      select: { code: true, userName: true, userEmail: true },
    });
  });

  it("caps the page size at 100", async () => {
    await GET(request("?limit=500"));

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
