import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dashboard/continue/route";

/**
 * The dashboard continue route (spec 0014, AC-3 and AC-17).
 *
 * The route is a thin read: a session or a 401, the one `getDashboardContinue`
 * read, and a plain 500 when the read breaks. It owns no query and no shape;
 * `lib/dashboard-data.ts` does.
 */

const getSessionMock = vi.hoisted(() => vi.fn());
const getDashboardContinue = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/dashboard-data", () => ({
  getDashboardContinue,
}));

const continuePayload = {
  recentNotes: [
    {
      id: "note-1",
      title: "Operating Systems: Process Scheduling",
      fileName: "process-scheduling.pdf",
      status: "READY",
      createdAt: "2026-10-23T10:00:00.000Z",
    },
  ],
  lastAttempt: {
    attemptId: "attempt-1",
    quizId: "quiz-1",
    title: "Process scheduling check",
    answeredAt: "2026-10-23T11:00:00.000Z",
  },
  lastConversation: {
    id: "conversation-1",
    title: "Round robin time slice",
    updatedAt: "2026-10-23T12:00:00.000Z",
  },
};

beforeEach(() => {
  getDashboardContinue.mockReset();
  getSessionMock.mockResolvedValue(null);
});

describe("GET /api/dashboard/continue (spec 0014)", () => {
  it("answers 401 when there is no session", async () => {
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(getDashboardContinue).not.toHaveBeenCalled();
  });

  it("returns the continue read for the signed in student", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    getDashboardContinue.mockResolvedValue(continuePayload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(continuePayload);
    expect(getDashboardContinue).toHaveBeenCalledWith("user-42");
  });

  it("answers 500 without leaking the cause when the read breaks", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    getDashboardContinue.mockRejectedValue(new Error("connection refused"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(log).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch your dashboard",
    });
  });
});
