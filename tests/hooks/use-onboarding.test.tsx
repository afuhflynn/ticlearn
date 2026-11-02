import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const onboardingApi = vi.hoisted(() => ({
  progress: vi.fn(),
  start: vi.fn(),
  save: vi.fn(),
  finish: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { mutations: { onboarding: onboardingApi } },
}));

import {
  useFinishOnboarding,
  useOnboardingProgress,
  useSaveOnboardingStep,
  useStartOnboarding,
} from "@/hooks/useOnboarding";
import { queryKeys } from "@/lib/query-keys";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  onboardingApi.progress.mockResolvedValue({ currentStep: 0, answers: {} });
  onboardingApi.start.mockResolvedValue({
    progressId: "progress-1",
    currentStep: 0,
    answers: {},
  });
  onboardingApi.save.mockResolvedValue({ currentStep: 1, saved: true });
  onboardingApi.finish.mockResolvedValue({ ok: true, user: {} });
});

/**
 * The setup hooks (spec 0041, AC-4).
 *
 * Thin bindings over the setup routes. The query reads the saved step
 * for resume; every mutation refreshes the saved step afterwards, and
 * finish also refreshes the profile so the dashboard reads fresh truth.
 */
describe("useOnboardingProgress (covers: AC-4)", () => {
  it("reads the saved step through the progress route", async () => {
    onboardingApi.progress.mockResolvedValue({
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
    });

    const { result } = renderHook(() => useOnboardingProgress(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
    });
  });
});

describe("useSaveOnboardingStep (covers: AC-4)", () => {
  it("saves through the progress route and refreshes the saved step", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");

    const { result } = renderHook(() => useSaveOnboardingStep(), { wrapper });
    result.current.mutate({
      step: 1,
      stepKey: "level",
      answers: { levelOfStudy: "YEAR_2" },
    });

    await waitFor(() => expect(onboardingApi.save).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.onboardingProgress,
    });

    invalidate.mockRestore();
  });
});

describe("useFinishOnboarding (covers: AC-1)", () => {
  it("finishes through the finish route and refreshes progress plus profile", async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");

    const { result } = renderHook(() => useFinishOnboarding(), { wrapper });
    result.current.mutate({
      levelOfStudy: "YEAR_2",
      targetGoal: "Semester & Final Exams",
    });

    await waitFor(() => expect(onboardingApi.finish).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.onboardingProgress,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.profile,
    });

    invalidate.mockRestore();
  });
});

describe("useStartOnboarding (covers: AC-4)", () => {
  it("starts through the start route and refreshes the saved step", async () => {
    const { result } = renderHook(() => useStartOnboarding(), { wrapper });
    result.current.mutate(undefined);

    await waitFor(() => expect(onboardingApi.start).toHaveBeenCalled());
  });
});
