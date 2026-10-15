import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const db = prisma as unknown as {
  topicPerformance: { findMany: ReturnType<typeof vi.fn> };
};

const { computeReadiness } =
  await vi.importActual<typeof import("@/lib/readiness")>("@/lib/readiness");

beforeEach(() => {
  vi.clearAllMocks();
  db.topicPerformance = { findMany: vi.fn().mockResolvedValue([]) };
});

describe("lib/readiness (covers: AC-8, AC-9)", () => {
  it("returns an assessment state when the user has no performances", async () => {
    const result = await computeReadiness("student-1");

    expect(result).toEqual({
      readiness: 50,
      weakestTopic: null,
      strongestTopic: null,
      topicReadiness: [],
      needsAssessment: true,
    });
  });

  it("caps the live topic read at 200 rows", async () => {
    await computeReadiness("student-1");

    expect(db.topicPerformance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it("averages mastery by topic and orders weakest first", async () => {
    db.topicPerformance.findMany.mockResolvedValue([
      {
        noteId: "n1",
        masteryScore: 80,
        totalAttempts: 0,
        correctAttempts: 0,
        lastPracticedAt: null,
        topic: { name: "Algebra" },
      },
      {
        noteId: "n2",
        masteryScore: 60,
        totalAttempts: 0,
        correctAttempts: 0,
        lastPracticedAt: null,
        topic: { name: "Algebra" },
      },
      {
        noteId: "n3",
        masteryScore: 40,
        totalAttempts: 0,
        correctAttempts: 0,
        lastPracticedAt: null,
        topic: { name: "Geometry" },
      },
    ]);

    const result = await computeReadiness("student-1");

    expect(result.needsAssessment).toBe(false);
    expect(result.weakestTopic).toEqual({ name: "Geometry", score: 40 });
    expect(result.strongestTopic).toEqual({ name: "Algebra", score: 70 });
    expect(result.readiness).toBe(55);
    expect(result.topicReadiness).toHaveLength(2);
  });
});
