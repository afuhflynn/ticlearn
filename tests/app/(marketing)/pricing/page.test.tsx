// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PricingPage, { metadata } from "@/app/(marketing)/pricing/page";
import { plans } from "@/constants/plans";

/**
 * The pricing page (spec 0012, AC-8, AC-9 and AC-10).
 *
 * The page is a server component with its own metadata, and the plan grid is
 * the one client island it imports. The plan names, the prices and the
 * features are all in the first HTML.
 */
const subscriptionMock = vi.hoisted(() =>
  vi.fn(async () => ({ subscription: null as unknown })),
);

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  api: { queries: { subscription: subscriptionMock } },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("the pricing page (spec 0012 AC-9)", () => {
  it("carries its own title", () => {
    expect(metadata.title).toBe(
      "TiCLearn Pricing · Free and Semester Pass Plans",
    );
  });

  it("carries its own description", () => {
    expect(metadata.description).toBe(
      "What TiCLearn costs for a Cameroonian university student: what the free tier includes, what the semester pass adds, and how you pay over Mobile Money.",
    );
  });
});

describe("the pricing page markup (spec 0012 AC-8)", () => {
  it("shows the plan names and the prices without waiting for any data", () => {
    render(<PricingPage />);

    expect(screen.getByText("Simple, Transparent Pricing")).toBeInTheDocument();
    for (const plan of plans) {
      expect(screen.getByText(plan.name)).toBeInTheDocument();
      expect(screen.getByText(plan.price)).toBeInTheDocument();
    }
  });

  it("shows the features of every plan", () => {
    render(<PricingPage />);

    for (const plan of plans) {
      for (const feature of plan.features) {
        expect(screen.getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it("reads the one plan list, so the page and the island cannot drift", () => {
    render(<PricingPage />);

    expect(screen.getByText(plans[1].price)).toBeInTheDocument();
    expect(screen.getByText(plans[1].cta)).toBeInTheDocument();
  });
});
