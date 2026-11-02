import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";

const privateGet = vi.hoisted(() => vi.fn());
const privatePost = vi.hoisted(() => vi.fn());

vi.mock("@/config/axios.config", () => ({
  privateAxios: { get: privateGet, post: privatePost },
  publicAxios: { get: privateGet },
}));

beforeEach(() => {
  privateGet.mockReset();
  privatePost.mockReset();
  privateGet.mockResolvedValue({ currentStep: 0, answers: {} });
  privatePost.mockResolvedValue({ ok: true });
});

/**
 * The setup calls on the shared client (spec 0041, AC-4).
 *
 * The page and hooks never hand roll a fetch. Each setup call travels
 * through the shared client with the exact route and body the server
 * expects.
 */
describe("api.mutations.onboarding (covers: AC-4)", () => {
  it("starts through POST /onboarding/start", async () => {
    await api.mutations.onboarding.start();

    expect(privatePost).toHaveBeenCalledWith("/onboarding/start", {});
  });

  it("reads through GET /onboarding/progress", async () => {
    await api.mutations.onboarding.progress();

    expect(privateGet).toHaveBeenCalledWith("/onboarding/progress");
  });

  it("saves through POST /onboarding/progress with the step payload", async () => {
    const payload = {
      step: 1,
      stepKey: "level" as const,
      answers: { levelOfStudy: "YEAR_2" },
    };

    await api.mutations.onboarding.save(payload);

    expect(privatePost).toHaveBeenCalledWith("/onboarding/progress", payload);
  });

  it("finishes through POST /onboarding/finish with the setup payload", async () => {
    const payload = {
      levelOfStudy: "YEAR_2",
      targetGoal: "Semester & Final Exams",
    };

    await api.mutations.onboarding.finish(payload);

    expect(privatePost).toHaveBeenCalledWith("/onboarding/finish", payload);
  });
});
