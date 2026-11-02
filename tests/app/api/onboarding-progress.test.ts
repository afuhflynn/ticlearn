import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/onboarding/progress/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: vi.fn() },
    onboardingProgress: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const db = prisma as unknown as {
  user: { update: ReturnType<typeof vi.fn> };
  onboardingProgress: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user }) as never;
}

function post(body: unknown) {
  return new Request("http://localhost:3000/api/onboarding/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.onboardingProgress.findUnique.mockResolvedValue(null);
  db.onboardingProgress.upsert.mockResolvedValue({ currentStep: 1 });
  db.user.update.mockResolvedValue({ onboardingSkipped: true });
});

/**
 * `/api/onboarding/progress` (spec 0041, AC-3 and AC-4 and AC-5 and AC-7).
 *
 * The read opens the saved step for resume. The write saves one step at
 * a time, skips with empty academic fields, and rejects bad values with
 * plain words before anything reaches the database.
 */
describe("GET /api/onboarding/progress (covers: AC-4, AC-7)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(db.onboardingProgress.findUnique).not.toHaveBeenCalled();
  });

  it("opens step zero with empty answers for a fresh student", async () => {
    db.onboardingProgress.findUnique.mockResolvedValue(null);

    const res = await GET();
    const body = (await res.json()) as {
      currentStep: number;
      answers: Record<string, unknown>;
    };

    expect(body).toEqual({ currentStep: 0, answers: {} });
  });

  it("opens the saved step and answers for a returning student", async () => {
    db.onboardingProgress.findUnique.mockResolvedValue({
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
      updatedAt: new Date(),
    });

    const res = await GET();
    const body = (await res.json()) as { currentStep: number };

    expect(body.currentStep).toBe(2);
  });
});

describe("POST /api/onboarding/progress (covers: AC-3, AC-4, AC-5, AC-7)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await POST(post({ step: 1, stepKey: "level", answers: {} }));

    expect(res.status).toBe(401);
    expect(db.onboardingProgress.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed save", async () => {
    const res = await POST(post({ step: 9, stepKey: "nope" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejects an unknown year with 422 and saves nothing (covers: AC-5)", async () => {
    const res = await POST(
      post({
        step: 1,
        stepKey: "level",
        answers: { levelOfStudy: "YEAR_9" },
      }),
    );
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/study year/i);
    expect(db.onboardingProgress.upsert).not.toHaveBeenCalled();
  });

  it("saves a valid level step and moves to the next step (covers: AC-4)", async () => {
    const res = await POST(
      post({
        step: 1,
        stepKey: "level",
        answers: { levelOfStudy: "YEAR_2" },
      }),
    );
    const body = (await res.json()) as { currentStep: number; saved: boolean };

    expect(res.status).toBe(200);
    expect(body).toEqual({ currentStep: 1, saved: true });
    expect(db.onboardingProgress.upsert).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      update: {
        currentStep: 1,
        answers: { levelOfStudy: "YEAR_2" },
      },
      create: {
        userId: "student-1",
        currentStep: 1,
        answers: { levelOfStudy: "YEAR_2" },
      },
      select: { currentStep: true },
    });
  });

  it("merges the new step into earlier answers instead of replacing them (covers: AC-4)", async () => {
    db.onboardingProgress.findUnique.mockResolvedValue({
      answers: { levelOfStudy: "YEAR_2" },
    });

    await POST(
      post({
        step: 2,
        stepKey: "goal",
        answers: { targetGoal: "Semester & Final Exams" },
      }),
    );

    expect(db.onboardingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "student-1" },
        update: expect.objectContaining({
          answers: {
            levelOfStudy: "YEAR_2",
            targetGoal: "Semester & Final Exams",
          },
        }),
      }),
    );
  });

  it("skips with empty academic fields and keeps the app usable (covers: AC-3)", async () => {
    const res = await POST(
      post({ step: 1, stepKey: "level", answers: {}, skipped: true }),
    );
    const body = (await res.json()) as {
      currentStep: number;
      saved: boolean;
      skipped: boolean;
    };

    expect(res.status).toBe(200);
    expect(body).toEqual({ currentStep: 1, saved: true, skipped: true });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { onboardingSkipped: true, onboardingCompleted: false },
    });
  });
});
