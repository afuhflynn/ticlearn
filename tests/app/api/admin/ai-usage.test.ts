import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/ai-usage/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

const events = prisma.aiUsageEvent as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/admin/ai-usage${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(limit).mockResolvedValue(null);
  signIn({ id: "admin-1", role: "ADMIN" });
  events.findMany.mockResolvedValue([]);
  events.count.mockResolvedValue(0);
  events.aggregate.mockResolvedValue({
    _sum: { costXaf: null, promptTokens: null, completionTokens: null },
    _count: { id: 0 },
  } as never);
  events.groupBy.mockResolvedValue([] as never);
});

describe("GET /api/admin/ai-usage authorization (covers: AC-4)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for a signed in student, so spend stays admin only", async () => {
    signIn({ id: "student-1", role: "USER" });

    const res = await GET(request());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("never queries the ledger for a non admin caller", async () => {
    signIn({ id: "student-1", role: "USER" });
    await GET(request());
    expect(events.findMany).not.toHaveBeenCalled();
  });

  it("allows an admin through", async () => {
    expect((await GET(request())).status).toBe(200);
  });
});

describe("GET /api/admin/ai-usage aggregation (covers: AC-4)", () => {
  it("returns the spend split by model", async () => {
    events.groupBy.mockResolvedValueOnce([
      {
        modelId: "google/gemini-3.7-flash",
        _sum: { costXaf: 4 },
        _count: { id: 9 },
      },
      { modelId: "openai/gpt-5-nano", _sum: { costXaf: 2 }, _count: { id: 2 } },
    ] as never);

    const body = await (await GET(request())).json();

    expect(body.byModel).toHaveLength(2);
    expect(body.byModel[0].modelId).toBe("google/gemini-3.7-flash");
  });

  it("returns the spend split by task", async () => {
    events.groupBy.mockResolvedValueOnce([] as never);
    events.groupBy.mockResolvedValueOnce([
      { task: "grading", _sum: { costXaf: 6 }, _count: { id: 11 } },
    ] as never);

    const body = await (await GET(request())).json();

    expect(body.byTask[0].task).toBe("grading");
  });

  it("reports total calls, XAF and tokens for the window", async () => {
    events.aggregate.mockResolvedValue({
      _sum: {
        costUsd: 0.01,
        costXaf: 7,
        promptTokens: 800,
        completionTokens: 280,
      },
      _count: { id: 12 },
    } as never);

    const body = await (await GET(request())).json();

    expect(body.totals).toEqual({
      calls: 12,
      // Converted from the precise USD sum, not the rounded per row XAF.
      costXaf: 7,
      costUsd: 0.01,
      promptTokens: 800,
      completionTokens: 280,
    });
  });

  it("does not inflate the total by adding rounded per row XAF", async () => {
    events.aggregate.mockResolvedValue({
      _sum: {
        costUsd: 0.006,
        costXaf: 10,
        promptTokens: 0,
        completionTokens: 0,
      },
      _count: { id: 10 },
    } as never);

    const body = await (await GET(request())).json();

    expect(body.totals.costXaf).toBe(4);
  });

  it("reports zero rather than null when there is no spend at all", async () => {
    const body = await (await GET(request())).json();

    expect(body.totals.costXaf).toBe(0);
    expect(body.totals.promptTokens).toBe(0);
  });

  it("returns the newest rows first, so an admin sees live activity", async () => {
    await GET(request());
    expect(events.findMany.mock.calls[0][0].orderBy).toEqual({
      createdAt: "desc",
    });
  });

  it("filters by model when asked", async () => {
    await GET(request("?modelId=openai/gpt-5-nano"));

    expect(events.findMany.mock.calls[0][0].where.modelId).toBe(
      "openai/gpt-5-nano",
    );
  });

  it("filters by task when asked", async () => {
    await GET(request("?task=grading"));

    expect(events.findMany.mock.calls[0][0].where.task).toBe("grading");
  });

  it("pages the row list", async () => {
    await GET(request("?page=2&pageSize=10"));

    const call = events.findMany.mock.calls[0][0];
    expect(call.skip).toBe(10);
    expect(call.take).toBe(10);
  });
});

describe("GET /api/admin/ai-usage errors", () => {
  it("returns 400 for a malformed date", async () => {
    expect((await GET(request("?from=nope"))).status).toBe(400);
  });

  it("returns 400 for a model id longer than the column allows", async () => {
    expect((await GET(request(`?modelId=${"x".repeat(200)}`))).status).toBe(
      400,
    );
  });

  it("returns 400 for a page number below one", async () => {
    expect((await GET(request("?page=0"))).status).toBe(400);
  });

  it("returns the rate limit response when the caller is throttled", async () => {
    vi.mocked(limit).mockResolvedValue(
      new Response("slow", { status: 429 }) as never,
    );

    const res = await GET(request());

    expect(res.status).toBe(429);
    expect(events.findMany).not.toHaveBeenCalled();
  });

  it("meters the admin read in its own bucket", async () => {
    await GET(request());
    expect(limit).toHaveBeenCalledWith("admin", expect.any(Request));
  });
});
