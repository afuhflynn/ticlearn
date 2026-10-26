// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionPage from "@/app/(dashboard)/subscription/page";
import { getPlanLimits } from "@/lib/plan-limits";

const usageState = vi.hoisted(() => ({
  current: {
    plan: "FREE",
    status: "NONE",
    previousPlan: null as string | null,
    isPending: false,
    isPaid: false,
  },
}));

const queryStates = vi.hoisted(() => ({
  modal: "",
  setView: vi.fn(),
}));

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: () => [queryStates, queryStates.setView],
  };
});

vi.mock("@/hooks", () => ({
  useUsage: () => ({
    plan: usageState.current.plan,
    status: usageState.current.status,
    previousPlan: usageState.current.previousPlan,
    limits: getPlanLimits(usageState.current.plan),
    usage: { pdfUploads: 1, quizGenerations: 2, aiTutorMessages: 3 },
    creditCosts: { quizGeneration: 50, aiTutorMessage: 5 },
    canUpload: true,
    canGenerateQuiz: true,
    canUseAIChat: true,
    chatDailyUsage: null,
    isLoading: false,
    isPaid: usageState.current.isPaid,
    isPending: usageState.current.isPending,
    refetch: vi.fn(),
  }),
  useCredits: () => ({
    data: { balance: 200, totalEarned: 200, earned: 200, spent: 0 },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../student-skeletons", () => ({
  SubscriptionSkeleton: () => <div data-testid="skeleton">loading</div>,
}));

beforeEach(() => {
  usageState.current = {
    plan: "FREE",
    status: "NONE",
    previousPlan: null,
    isPending: false,
    isPaid: false,
  };
  queryStates.setView.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ mtnNumber: null, orangeNumber: null }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setActivePlan(plan: string, status: "ACTIVE" | "PENDING" = "ACTIVE") {
  usageState.current = {
    plan,
    status,
    previousPlan: status === "PENDING" ? plan : null,
    isPending: status === "PENDING",
    isPaid: status === "ACTIVE" && plan !== "FREE",
  };
}

describe("the dashboard subscription page", () => {
  it("renders the page once usage and payment settings load", async () => {
    setActivePlan("PRO", "ACTIVE");
    render(<SubscriptionPage />);

    await screen.findByText("Plan & credits");
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("shows the active plan label and its status", async () => {
    setActivePlan("PRO", "ACTIVE");
    render(<SubscriptionPage />);

    expect(await screen.findByText("Semester Pass")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows the pending payment note without offering a second charge", async () => {
    setActivePlan("PRO", "PENDING");
    render(<SubscriptionPage />);

    expect(
      await screen.findByText("Payment not finished yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Finish the payment on your phone/),
    ).toBeInTheDocument();
  });

  it("shows the free limits and the starting credit balance", async () => {
    setActivePlan("FREE", "ACTIVE");
    render(<SubscriptionPage />);

    expect(await screen.findByText("Free")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });
});
