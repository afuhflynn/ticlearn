// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { publicPlans } from "@/constants/plans";

/**
 * The one client island on the pricing page (spec 0019, AC-7 and AC-8).
 *
 * The page around it is a server component, so everything that needs state
 * lives here: who is signed in, which plan they are on, and the subscribe
 * button.
 */
const sessionState = vi.hoisted(() => ({
  current: null as null | { user: { id: string } },
}));

const routerPush = vi.hoisted(() => vi.fn());
const subscriptionMock = vi.hoisted(() =>
  vi.fn(async () => ({ subscription: null as unknown })),
);

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: sessionState.current }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/api-client", () => ({
  api: { queries: { subscription: subscriptionMock } },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const originalLocation = window.location;

function signIn() {
  sessionState.current = { user: { id: "user-1" } };
}

function signOut() {
  sessionState.current = null;
}

function renderIsland() {
  return render(<PricingPlans plans={publicPlans} />);
}

beforeEach(() => {
  signOut();
  routerPush.mockReset();
  subscriptionMock.mockReset();
  subscriptionMock.mockResolvedValue({ subscription: null });
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ link: "https://checkout.test/abc123" }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe("the pricing island (spec 0019 AC-7)", () => {
  it("shows the name, the price and the features of every plan", () => {
    renderIsland();

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Semester Pass")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(screen.getByText("Unlimited notes")).toBeInTheDocument();
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getAllByText("FCFA").length).toBe(2);
  });

  it("marks one plan as the one semester pass", () => {
    renderIsland();

    expect(screen.getByText("One semester")).toBeInTheDocument();
  });

  it("sends a signed out visitor to the sign in page and starts no payment", async () => {
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    expect(routerPush).toHaveBeenCalledWith("/sign-in?callbackUrl=/pricing");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a signed in student to the payment page for the paid plan", async () => {
    signIn();
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/payment/initiate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      plan: "PRO",
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.test/abc123");
    });
  });

  it("shows the current plan and offers nothing to press", async () => {
    signIn();
    subscriptionMock.mockResolvedValue({
      subscription: { plan: "PRO", status: "ACTIVE" },
    });
    renderIsland();

    const current = await screen.findByRole("button", { name: "Current Plan" });

    expect(current).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Start Semester Pass" }),
    ).not.toBeInTheDocument();
  });

  it("offers the free plan as a link to the sign up page", () => {
    renderIsland();

    const link = screen.getByRole("link", { name: "Get Started" });
    expect(link).toHaveAttribute("href", "/sign-up");
  });
});

describe("the pricing island payment failures (spec 0019 AC-8)", () => {
  it("shows a plain notice when payment could not be started", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ error: "gateway down" }),
      })),
    );
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText("gateway down")).toBeInTheDocument();
  });

  it("shows a plain notice when the payment request could not be made", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Failed to start payment. Please try again."),
    ).toBeInTheDocument();
  });

  it("returns the button to its normal state so the student can retry", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      })),
    );
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // The button is back to its normal state and can be clicked again.
    expect(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    ).not.toBeDisabled();
  });

  it("shows the estimated monthly line as a secondary estimate (spec 0019 AC-4)", () => {
    renderIsland();

    expect(
      screen.getByText(/about 500 FCFA a month \(estimate\)/),
    ).toBeInTheDocument();
  });

  it("shows the current plan as disabled with the replace line (spec 0019 AC-11)", async () => {
    signIn();
    subscriptionMock.mockResolvedValue({
      subscription: { plan: "PRO", status: "ACTIVE" },
    });
    renderIsland();

    const current = await screen.findByRole("button", { name: "Current Plan" });
    expect(current).toBeDisabled();
    expect(
      screen.getByText("Buying the Semester Pass replaces your current plan."),
    ).toBeInTheDocument();
  });

  it("shows the pending payment note and keeps the action available (spec 0019 AC-12)", async () => {
    signIn();
    subscriptionMock.mockResolvedValue({
      subscription: { plan: "PRO", status: "PENDING" },
    });
    renderIsland();

    expect(
      await screen.findByText(
        "Finish on your phone: complete the payment and come back.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    ).not.toBeDisabled();
  });

  it("shows the starting label with no spinner while the payment starts", async () => {
    signIn();
    let resolvePayment: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolvePayment = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    renderIsland();

    await user.click(
      screen.getByRole("button", { name: "Start Semester Pass" }),
    );

    const starting = await screen.findByRole("button", { name: "Starting…" });
    expect(starting).toBeDisabled();
    // A spinner is not a loading state in this app, so nothing may spin here.
    expect(document.querySelector(".animate-spin")).toBeNull();

    resolvePayment({
      ok: true,
      json: async () => ({ link: "https://checkout.test/abc123" }),
    });
    await waitFor(() =>
      expect(window.location.href).toBe("https://checkout.test/abc123"),
    );
  });
});
