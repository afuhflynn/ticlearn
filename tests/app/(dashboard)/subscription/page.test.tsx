// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionPage from "@/app/(dashboard)/subscription/page";
import { planCatalog } from "@/constants/plans";

const sessionState = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email: string; name: string } },
}));

const usageState = vi.hoisted(() => ({
  plan: "FREE" as string,
  status: "NONE" as string,
  previousPlan: null as string | null,
  isPending: false as boolean,
  isPaid: false as boolean,
}));

const routerPush = vi.hoisted(() => vi.fn());
const searchParamsState = vi.hoisted(() => new URLSearchParams());
const queryStates = vi.hoisted(() => ({
  tab: "auto" as const,
  modal: "" as const,
  setView: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: sessionState.current }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => searchParamsState,
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: () => [queryStates, queryStates.setView] as unknown,
  };
});

vi.mock("@/nuqs", () => ({
  correctionsForKeys: vi.fn(() => ({})),
}));

vi.mock("@/hooks", () => ({
  useUsage: () => ({
    plan: usageState.current.plan,
    status: usageState.current.status,
    previousPlan: usageState.current.previousPlan,
    limits: {
      ...planCatalog[usageState.current.plan as keyof typeof planCatalog],
      maxConversationMessages: 50,
    },
    usage: { pdfUploads: 0, quizGenerations: 0, aiTutorMessages: 0 },
    canUpload: true,
    canGenerateQuiz: true,
    canUseAIChat: true,
    chatDailyUsage: null,
    isLoading: false,
    isPaid: usageState.current.isPaid,
    isPending: usageState.current.isPending,
    refetch: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../student-skeletons", () => ({
  SubscriptionSkeleton: () => <div data-testid="skeleton">loading</div>,
}));

beforeEach(() => {
  sessionState.current = null;
  usageState.current = {
    plan: "FREE",
    status: "NONE",
    previousPlan: null,
    isPending: false,
    isPaid: false,
  };
  routerPush.mockReset();
  searchParamsState.delete("tab");
  searchParamsState.delete("modal");
  queryStates.setView.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        mtnNumber: null,
        orangeNumber: null,
        balance: 0,
        creditsPer1000Xaf: 100,
        minCreditPurchaseXaf: 100,
        maxCreditPurchaseXaf: 50_000,
        minXafEffective: 100,
      }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setActivePlan(plan: string, status: "ACTIVE" | "PENDING" = "ACTIVE") {
  sessionState.current = {
    user: { id: "u-1", email: "a@b.com", name: "Student" },
  };
  usageState.current = {
    plan,
    status,
    previousPlan: status === "PENDING" ? plan : null,
    isPending: status === "PENDING",
    isPaid: status === "ACTIVE" && plan !== "FREE",
  };
}

describe("the dashboard subscription page", () => {
  it("renders the page once usage and settings load", async () => {
    setActivePlan("PRO", "ACTIVE");
    render(<SubscriptionPage />);

    await screen.findByText("Subscription & Usage");
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("shows the active plan label as the current state (spec 0019 AC-11)", async () => {
    setActivePlan("PRO", "ACTIVE");
    render(<SubscriptionPage />);

    expect(await screen.findByText("PRO")).toBeInTheDocument();
    expect(
      screen.getByText("You are currently on the PRO plan"),
    ).toBeInTheDocument();
  });

  it("shows the pending payment note and keeps the action available (spec 0019 AC-12)", async () => {
    setActivePlan("PRO", "PENDING");
    render(<SubscriptionPage />);

    expect(await screen.findByText("Payment Processing")).toBeInTheDocument();
    expect(
      screen.getByText("Upgrading to PRO - please complete payment"),
    ).toBeInTheDocument();
  });
});
