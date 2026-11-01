import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/conversion/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

const db = prisma as unknown as {
  kpiEvent: { groupBy: ReturnType<typeof vi.fn> };
  subscription: { count: ReturnType<typeof vi.fn> };
};

describe("GET /api/admin/conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.kpiEvent.groupBy).mockResolvedValue([]);
    vi.mocked(db.subscription.count).mockResolvedValue(3);
  });

  it("returns 401 with no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non admin student", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u-1", role: "USER" },
    } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns grouped counts plus paid for admin", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "a-1", role: "ADMIN" },
    } as never);
    vi.mocked(db.kpiEvent.groupBy).mockResolvedValue([
      { event: "limit_hit", _count: 4 },
      { event: "prompt_shown", _count: 2 },
    ]);
    const res = await GET();
    const body = (await res.json()) as {
      byEvent: Record<string, number>;
      paid: number;
    };
    expect(res.status).toBe(200);
    expect(body.byEvent.limit_hit).toBe(4);
    expect(body.paid).toBe(3);
  });
});
