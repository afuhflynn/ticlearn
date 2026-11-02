import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { trackEvent } from "@/lib/kpi";
import {
  forbid,
  logOnboarding,
  needAuth,
  requireUserId,
} from "@/lib/onboarding/server";

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The setup auth helpers (spec 0041, AC-7).
 *
 * Every setup route is owner only. A missing session reads as no user,
 * never as another student, and the funnel log never throws back into
 * the request when tracking fails.
 */
describe("requireUserId (covers: AC-7)", () => {
  it("returns null when there is no session", async () => {
    signIn(null);

    await expect(requireUserId()).resolves.toBeNull();
  });

  it("returns the signed in student id", async () => {
    signIn({ id: "student-1" });

    await expect(requireUserId()).resolves.toBe("student-1");
  });
});

describe("needAuth and forbid (covers: AC-7)", () => {
  it("answers 401 with no session hint", async () => {
    const res = needAuth();
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("answers 403 for a foreign row", async () => {
    const res = forbid();
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });
});

describe("logOnboarding (covers: AC-4)", () => {
  it("records the funnel event for the student", async () => {
    await logOnboarding("student-1", "onboarding_step_saved", { step: 1 });

    expect(trackEvent).toHaveBeenCalledWith(
      "student-1",
      "onboarding_step_saved",
      {
        step: 1,
      },
    );
  });

  it("never throws when tracking fails", async () => {
    vi.mocked(trackEvent).mockRejectedValueOnce(new Error("down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logOnboarding("student-1", "onboarding_completed", {}),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
