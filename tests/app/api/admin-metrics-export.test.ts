import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/metrics/export/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyMetric: { findMany: vi.fn() },
  },
}));

vi.mock("next/server", () => {
  class MockNextResponse {
    body: string;
    status: number;
    headers: Headers;
    constructor(body: string, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    static json(data: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(data), init);
    }
  }
  return {
    NextResponse: MockNextResponse,
  };
});

const db = prisma.dailyMetric as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/admin/metrics/export${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "admin-1", role: "ADMIN" });
  db.findMany.mockResolvedValue([]);
});

describe("GET /api/admin/metrics/export (covers: AC-3, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non admin caller", async () => {
    signIn({ id: "student-1", role: "USER" });

    const res = await GET(request());

    expect(res.status).toBe(403);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it("exports stored daily metric rows as CSV", async () => {
    db.findMany.mockResolvedValue([
      {
        date: new Date("2026-10-01T00:00:00Z"),
        metric: "active_users",
        autoValue: 12,
      },
      {
        date: new Date("2026-10-02T00:00:00Z"),
        metric: "quizzes_taken",
        autoValue: 5,
      },
    ]);

    const res = await GET(request("?from=2026-10-01&to=2026-10-02"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.body).toBe(
      "date,metric,value\n2026-10-01,active_users,12\n2026-10-02,quizzes_taken,5",
    );
  });

  it("bounds the export read at 10000 rows", async () => {
    await GET(request());

    expect(db.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10000 }),
    );
  });
});
