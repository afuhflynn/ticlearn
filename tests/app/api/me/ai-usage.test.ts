import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/me/ai-usage/route";
import { dailyTotals } from "@/lib/ai/usage";
import { auth } from "@/lib/auth";
import { limit } from "@/lib/rate-limit";

vi.mock("@/lib/ai/usage", () => ({
  dailyTotals: vi.fn(async () => []),
}));

const from = new Date("2026-10-12T00:00:00+01:00");
const to = new Date("2026-10-13T00:00:00+01:00");

function request(query = "") {
  return new Request(`http://localhost:3000/api/me/ai-usage${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(limit).mockResolvedValue(null);
  vi.mocked(dailyTotals).mockResolvedValue([]);
  signIn({ id: "student-1" });
});

describe("GET /api/me/ai-usage auth (covers: AC-4)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("never queries the ledger for an anonymous caller", async () => {
    signIn(null);
    await GET(request());
    expect(dailyTotals).not.toHaveBeenCalled();
  });
});

describe("GET /api/me/ai-usage happy path (covers: AC-4)", () => {
  it("returns the student's own daily totals", async () => {
    vi.mocked(dailyTotals).mockResolvedValue([
      { day: "2026-10-12", calls: 3, tokens: 839, costXaf: 12 },
    ]);

    const res = await GET(request("?from=2026-10-12&to=2026-10-12"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.days).toEqual([
      { day: "2026-10-12", calls: 3, tokens: 839, costXaf: 12 },
    ]);
  });

  it("scopes the read to the signed in student, so nobody sees another spend", async () => {
    signIn({ id: "student-77" });
    await GET(request());

    expect(vi.mocked(dailyTotals).mock.calls[0][0]).toBe("student-77");
  });

  it("reports the summed call count and XAF for the window", async () => {
    vi.mocked(dailyTotals).mockResolvedValue([
      { day: "2026-10-11", calls: 2, tokens: 100, costXaf: 5 },
      { day: "2026-10-12", calls: 3, tokens: 200, costXaf: 7 },
    ]);

    const body = await (await GET(request())).json();

    expect(body.totals).toEqual({ calls: 5, costXaf: 12 });
    expect(body.totalDays).toBe(2);
  });

  it("returns a valid empty payload when the student has no spend", async () => {
    const body = await (await GET(request())).json();

    expect(body.days).toEqual([]);
    expect(body.totals).toEqual({ calls: 0, costXaf: 0 });
    expect(body.page).toBe(1);
  });

  it("paginates the day list without changing the window totals", async () => {
    vi.mocked(dailyTotals).mockResolvedValue([
      { day: "2026-10-10", calls: 1, tokens: 10, costXaf: 1 },
      { day: "2026-10-11", calls: 1, tokens: 10, costXaf: 1 },
      { day: "2026-10-12", calls: 1, tokens: 10, costXaf: 1 },
    ]);

    const body = await (await GET(request("?pageSize=2"))).json();

    expect(body.days).toHaveLength(2);
    expect(body.totalDays).toBe(3);
    expect(body.totals.costXaf).toBe(3);
  });

  it("reads the window as Douala days, matching the ledger's own bucketing", async () => {
    await GET(request("?from=2026-10-12&to=2026-10-12"));

    const [start, end] = vi
      .mocked(dailyTotals)
      .mock.calls[0].slice(1) as Date[];
    expect(start.toISOString()).toBe(from.toISOString());
    expect(end.toISOString()).toBe(to.toISOString());
  });

  it("defaults the window to today when no dates are given", async () => {
    await GET(request());
    expect(dailyTotals).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/me/ai-usage errors", () => {
  it("returns 400 for a malformed date", async () => {
    const res = await GET(request("?from=12-10-2026"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid query" });
  });

  it("returns 400 for a page number below one", async () => {
    expect((await GET(request("?page=0"))).status).toBe(400);
  });

  it("returns 400 for an oversized page size", async () => {
    expect((await GET(request("?pageSize=5000"))).status).toBe(400);
  });

  it("returns the rate limit response when the caller is throttled", async () => {
    const denied = new Response("slow down", { status: 429 });
    vi.mocked(limit).mockResolvedValue(denied as never);

    const res = await GET(request());

    expect(res.status).toBe(429);
    expect(dailyTotals).not.toHaveBeenCalled();
  });

  it("applies a rate limit to the read", async () => {
    await GET(request());
    expect(limit).toHaveBeenCalledWith("default", expect.any(Request));
  });
});
