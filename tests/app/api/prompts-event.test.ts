import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/prompts/event/route";
import { auth } from "@/lib/auth";
import { trackEvent } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

vi.mock("@/lib/kpi", () => ({
  EVENTS: {
    LIMIT_HIT: "limit_hit",
    PROMPT_SHOWN: "prompt_shown",
    PROMPT_CLICKED: "prompt_clicked",
    PROMPT_DISMISSED: "prompt_dismissed",
    UPGRADE_START: "upgrade_start",
  },
  trackEvent: vi.fn(async () => {}),
}));

const db = prisma as unknown as {
  kpiEvent: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const session = { user: { id: "u-1" } };

function post(body: unknown, sessionOverride: unknown = session) {
  vi.mocked(auth.api.getSession).mockResolvedValue(sessionOverride as never);
  return POST(
    new Request("http://localhost/api/prompts/event", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/prompts/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.kpiEvent.count).mockResolvedValue(0);
    vi.mocked(db.kpiEvent.findFirst).mockResolvedValue(null);
    vi.mocked(db.kpiEvent.create).mockResolvedValue({ id: "e-1" } as never);
  });

  it("returns 401 with no session", async () => {
    const res = await post({ event: "limit_hit", surface: "quiz" }, null);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown event", async () => {
    const res = await post({ event: "nope", surface: "quiz" });
    expect(res.status).toBe(400);
  });

  it("records a happy limit hit", async () => {
    const res = await post({
      event: "limit_hit",
      surface: "quiz",
      kind: "quiz_limit",
      used: 10,
      cap: 10,
    });
    expect(res.status).toBe(200);
    expect(vi.mocked(trackEvent)).toHaveBeenCalledOnce();
  });

  it("dedupes a second shown invite on the same Douala day", async () => {
    vi.mocked(db.kpiEvent.findFirst).mockResolvedValue({ id: "old" } as never);
    const res = await post({ event: "prompt_shown", surface: "tip" });
    const body = (await res.json()) as { deduped?: boolean };
    expect(res.status).toBe(200);
    expect(body.deduped).toBe(true);
    expect(vi.mocked(trackEvent)).not.toHaveBeenCalled();
  });

  it("returns 429 past the hourly cap", async () => {
    vi.mocked(db.kpiEvent.count).mockResolvedValue(30);
    const res = await post({ event: "prompt_clicked", surface: "quiz" });
    expect(res.status).toBe(429);
  });
});
