import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/onboarding/finish/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: vi.fn() },
    onboardingProgress: { updateMany: vi.fn() },
  },
}));

const db = prisma as unknown as {
  user: { update: ReturnType<typeof vi.fn> };
  onboardingProgress: { updateMany: ReturnType<typeof vi.fn> };
};

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user }) as never;
}

function post(body: unknown) {
  return new Request("http://localhost:3000/api/onboarding/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const finish = {
  levelOfStudy: "YEAR_2",
  targetGoal: "Semester & Final Exams",
  institution: "University of Buea",
  program: "Computer Science",
};

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.user.update.mockResolvedValue({
    levelOfStudy: "YEAR_2",
    targetGoal: "Semester & Final Exams",
    institution: "University of Buea",
    faculty: null,
    program: "Computer Science",
    onboardingCompleted: true,
  });
  db.onboardingProgress.updateMany.mockResolvedValue({ count: 1 });
});

/**
 * `POST /api/onboarding/finish` (spec 0041, AC-1 and AC-7).
 *
 * Finish copies validated values onto the student and marks setup done.
 * Anything invalid stops with a plain message and writes nothing.
 */
describe("POST /api/onboarding/finish (covers: AC-1, AC-7)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await POST(post(finish));

    expect(res.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns 400 when the goal is missing", async () => {
    const res = await POST(post({ levelOfStudy: "YEAR_2" }));

    expect(res.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns 422 for a birth date that does not parse", async () => {
    const res = await POST(post({ ...finish, dateOfBirth: "not a date" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/birth date/i);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns 422 when the age sits outside 15 to 50", async () => {
    const res = await POST(post({ ...finish, dateOfBirth: "2020-01-01" }));
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/15 and 50/);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("copies the setup onto the student and marks setup done (covers: AC-1)", async () => {
    const res = await POST(post(finish));
    const body = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: expect.objectContaining({
        levelOfStudy: "YEAR_2",
        targetGoal: "Semester & Final Exams",
        institution: "University of Buea",
        program: "Computer Science",
        onboardingCompleted: true,
        onboardingSkipped: false,
      }),
      select: expect.anything(),
    });
    expect(db.onboardingProgress.updateMany).toHaveBeenCalledWith({
      where: { userId: "student-1" },
      data: expect.objectContaining({ currentStep: 3 }),
    });
  });
});
