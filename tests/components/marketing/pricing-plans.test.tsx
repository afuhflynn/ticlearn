// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { plans } from "@/constants/plans";

/**
 * The one client island on the pricing page (spec 0012, AC-8).
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
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

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
  toast: { success: toastSuccess, error: toastError },
}));

const originalLocation = window.location;

function signIn() {
  sessionState.current = { user: { id: "user-1" } };
}

function signOut() {
  sessionState.current = null;
}

function renderIsland() {
  return render(<PricingPlans plans={plans} />);
}

beforeEach(() => {
  signOut();
  routerPush.mockReset();
  subscriptionMock.mockReset();
  subscriptionMock.mockResolvedValue({ subscription: null });
  toastSuccess.mockReset();
  toastError.mockReset();
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

describe("the pricing island (spec 0012 AC-8)", () => {
  it("shows the name, the price and the features of every plan", () => {
    renderIsland();

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("3,500")).toBeInTheDocument();
    expect(screen.getByText("Unlimited notes")).toBeInTheDocument();
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getAllByText("FCFA").length).toBe(2);
  });

  it("marks one plan as the popular one", () => {
    renderIsland();

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("sends a signed out visitor to the sign in page and starts no payment", async () => {
    const user = userEvent.setup();
    renderIsland();

    await user.click(screen.getByRole("button", { name: "Start Free Trial" }));

    expect(routerPush).toHaveBeenCalledWith("/sign-in?callbackUrl=/pricing");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a signed in student to the payment page for the paid plan", async () => {
    signIn();
    const user = userEvent.setup();
    renderIsland();

    await user.click(screen.getByRole("button", { name: "Start Free Trial" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/payment/initiate");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      plan: "PRO",
      redirectUrl: "/dashboard",
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.test/abc123");
    });
    expect(toastError).not.toHaveBeenCalled();
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
      screen.queryByRole("button", { name: "Start Free Trial" }),
    ).not.toBeInTheDocument();
  });

  it("tells the student when the payment could not be started", async () => {
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

    await user.click(screen.getByRole("button", { name: "Start Free Trial" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Payment initiation failed. Please try again.",
      );
    });
  });

  it("tells the student when the payment request could not be made", async () => {
    signIn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const user = userEvent.setup();
    renderIsland();

    await user.click(screen.getByRole("button", { name: "Start Free Trial" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to initiate payment");
    });
  });

  it("offers the free plan as a link to the sign up page", () => {
    renderIsland();

    const link = screen.getByRole("link", { name: "Get Started" });
    expect(link).toHaveAttribute("href", "/sign-up");
  });
});
