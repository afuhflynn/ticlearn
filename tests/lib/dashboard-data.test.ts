import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardContinue } from "@/lib/dashboard-data";

/**
 * `getDashboardContinue`, the one read the dashboard paints (spec 0014, AC-3).
 *
 * The route and the server render both call this, so the mapping is the
 * contract: dates leave as ISO strings, the attempt is the latest by
 * `completedAt`, and the payload carries no score anywhere.
 */

const prisma = vi.hoisted(() => ({
  note: { findMany: vi.fn() },
  quizAttempt: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

beforeEach(() => {
  prisma.note.findMany.mockReset();
  prisma.quizAttempt.findFirst.mockReset();
});

describe("getDashboardContinue (spec 0014 AC-3)", () => {
  it("reads the two pieces with the limits the payload promises", async () => {
    prisma.note.findMany.mockResolvedValue([]);
    prisma.quizAttempt.findFirst.mockResolvedValue(null);

    await getDashboardContinue("user-42");

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-42" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    );
    expect(prisma.quizAttempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-42" },
        orderBy: { completedAt: "desc" },
      }),
    );
  });

  it("maps the rows to the JSON ready shape a prefetch and a fetch agree on", async () => {
    prisma.note.findMany.mockResolvedValue([
      {
        id: "note-1",
        title: "Operating Systems: Process Scheduling",
        fileName: "process-scheduling.pdf",
        status: "READY",
        createdAt: new Date("2026-10-23T10:00:00.000Z"),
      },
    ]);
    prisma.quizAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      quizTitle: "Process scheduling check",
      completedAt: new Date("2026-10-23T11:00:00.000Z"),
    });
    const payload = await getDashboardContinue("user-42");

    expect(payload).toEqual({
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
    });
  });

  it("keeps the attempt nullable so an empty dashboard paints", async () => {
    prisma.note.findMany.mockResolvedValue([]);
    prisma.quizAttempt.findFirst.mockResolvedValue(null);

    const payload = await getDashboardContinue("user-42");

    expect(payload.recentNotes).toEqual([]);
    expect(payload.lastAttempt).toBeNull();
  });
});
