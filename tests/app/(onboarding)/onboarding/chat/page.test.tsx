import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SmartSetupChatPage from "@/app/(onboarding)/onboarding/chat/page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const hookState = vi.hoisted(() => ({
  progress: {
    data: undefined as
      | { currentStep: number; answers: Record<string, unknown> }
      | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  start: { mutate: vi.fn(), isPending: false },
  save: { mutateAsync: vi.fn(), isPending: false },
  finish: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboardingProgress: () => hookState.progress,
  useStartOnboarding: () => hookState.start,
  useSaveOnboardingStep: () => hookState.save,
  useFinishOnboarding: () => hookState.finish,
}));

function fresh() {
  hookState.progress.data = { currentStep: 0, answers: {} };
  hookState.progress.isLoading = false;
  hookState.progress.isError = false;
  hookState.start.mutate.mockClear();
  hookState.save.mutateAsync.mockClear();
  hookState.finish.mutateAsync.mockClear();
  push.mockClear();
  hookState.save.mutateAsync.mockResolvedValue({ currentStep: 1, saved: true });
  hookState.finish.mutateAsync.mockResolvedValue({ ok: true, user: {} });
}

beforeEach(() => {
  fresh();
});

/**
 * The smart setup chat page (spec 0041, AC-2 and AC-3).
 *
 * One ask at a time with tappable picks, visible progress, and a skip
 * that never strands the student. Labels and button names carry the
 * accessible names, so keyboard and screen reader users get the same
 * flow.
 */
describe("SmartSetupChatPage (covers: AC-2, AC-3)", () => {
  it("shows a skeleton while the saved step loads", () => {
    hookState.progress.isLoading = true;
    hookState.progress.data = undefined;

    render(<SmartSetupChatPage />);

    expect(screen.getByText("Getting your setup ready")).toBeInTheDocument();
  });

  it("shows a retry plus skip path when the read fails", async () => {
    const user = userEvent.setup();
    hookState.progress.isError = true;

    render(<SmartSetupChatPage />);

    expect(screen.getByText("Setup hit a snag")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("asks the year first with tappable picks plus progress plus skip", () => {
    render(<SmartSetupChatPage />);

    expect(screen.getByText("What year are you in?")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Year 1/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Skip for now/ }),
    ).toBeInTheDocument();
  });

  it("moves to the goal ask after a year tap", async () => {
    const user = userEvent.setup();
    render(<SmartSetupChatPage />);

    await user.click(screen.getByRole("button", { name: /Year 2/ }));

    await waitFor(() =>
      expect(hookState.save.mutateAsync).toHaveBeenCalledWith({
        step: 1,
        stepKey: "level",
        answers: { levelOfStudy: "YEAR_2" },
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("What is your main goal?")).toBeInTheDocument(),
    );
  });

  it("labels the school inputs so assistive tech names them", () => {
    hookState.progress.data = {
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
    };

    render(<SmartSetupChatPage />);

    expect(screen.getByLabelText("School")).toBeInTheDocument();
    expect(screen.getByLabelText("Program")).toBeInTheDocument();
  });

  it("asks again in plain words when school input is too short", async () => {
    const user = userEvent.setup();
    hookState.progress.data = {
      currentStep: 2,
      answers: { levelOfStudy: "YEAR_2" },
    };

    render(<SmartSetupChatPage />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /school and your program/i,
    );
    expect(hookState.save.mutateAsync).not.toHaveBeenCalled();
  });

  it("warns before finish when year or goal is missing", async () => {
    const user = userEvent.setup();
    hookState.progress.data = { currentStep: 3, answers: {} };

    render(<SmartSetupChatPage />);

    await user.click(
      screen.getByRole("button", { name: "Finish and open dashboard" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /year and your goal/i,
    );
    expect(hookState.finish.mutateAsync).not.toHaveBeenCalled();
  });

  it("skips to the dashboard from any step", async () => {
    const user = userEvent.setup();
    render(<SmartSetupChatPage />);

    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() =>
      expect(hookState.save.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ skipped: true }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });
});
