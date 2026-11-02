import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/onboarding/start/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    onboardingProgress: { upsert: vi.fn() },
  },
}));

const db = prisma as unknown as {
  onboardingProgress: { upsert: ReturnType<typeof vi.fn> };
};

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.onboardingProgress.upsert.mockResolvedValue({
    id: "progress-1",
    currentStep: 0,
    answers: {},
  });
});

/**
 * `POST /api/onboarding/start` (spec 0041, AC-4 and AC-7 and AC-8).
 *
 * Starting is idempotent: one row per student at most, keyed by user id,
 * so a double tap or a retry never creates a duplicate.
 */
describe("POST /api/onboarding/start (covers: AC-4, AC-7, AC-8)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(db.onboardingProgress.upsert).not.toHaveBeenCalled();
  });

  it("upserts one row keyed by the student id", async () => {
    const res = await POST();
    const body = (await res.json()) as {
      progressId: string;
      currentStep: number;
      answers: Record<string, unknown>;
    };

    expect(res.status).toBe(200);
    expect(db.onboardingProgress.upsert).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      update: {},
      create: { userId: "student-1", currentStep: 0, answers: {} },
      select: { id: true, currentStep: true, answers: true },
    });
    expect(body).toEqual({
      progressId: "progress-1",
      currentStep: 0,
      answers: {},
    });
  });

  it("hands back a saved step when one already exists", async () => {
    db.onboardingProgress.upsert.mockResolvedValue({
      id: "progress-1",
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
    });

    const res = await POST();
    const body = (await res.json()) as { currentStep: number };

    expect(body.currentStep).toBe(2);
  });
});
