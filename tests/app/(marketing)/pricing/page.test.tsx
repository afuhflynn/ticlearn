// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PricingPage, { metadata } from "@/app/(marketing)/pricing/page";
import { publicPlans } from "@/constants/plans";

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

/**
 * The pricing page (spec 0019 AC-9 and AC-10).
 *
 * The page is a server component with its own metadata, and the plan grid is
 * the one client island it imports. The plan names, the prices and the
 * features are all in the first HTML.
 */
describe("the pricing page (spec 0019 AC-9)", () => {
  it("carries its own title", () => {
    expect(metadata.title).toBe("TiCLearn Pricing · Free and Semester Pass");
  });

  it("carries its own description", () => {
    expect(metadata.description).toBe(
      "TiCLearn is free to start, and one Semester Pass at 2,500 FCFA paid over MTN Mobile Money or Orange Money unlocks unlimited notes, quizzes and Tip messages. A one time payment, no card, no auto renewal.",
    );
  });

  it("carries a canonical for /pricing", () => {
    expect(metadata.alternates?.canonical).toBe("/pricing");
  });
});

describe("the pricing page markup (spec 0019 AC-10)", () => {
  it("shows the heading and the copy without waiting for any data", () => {
    render(<PricingPage />);

    expect(screen.getByText("Simple, honest pricing")).toBeInTheDocument();
  });

  it("shows the plan labels and the prices without waiting for any data", () => {
    render(<PricingPage />);

    for (const plan of publicPlans) {
      expect(screen.getByText(plan.label)).toBeInTheDocument();
      expect(
        screen.getByText(plan.priceXaf.toLocaleString()),
      ).toBeInTheDocument();
    }
  });

  it("shows the features of every plan", () => {
    render(<PricingPage />);

    for (const plan of publicPlans) {
      for (const feature of plan.features) {
        expect(screen.getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it("reads the one plan list, so the page and the island cannot drift", () => {
    render(<PricingPage />);

    expect(screen.getByText(publicPlans[1].label)).toBeInTheDocument();
    expect(screen.getByText(publicPlans[1].cta)).toBeInTheDocument();
  });

  it("carries open graph metadata (spec 0019 AC-9)", () => {
    expect(metadata.openGraph?.title).toBe(
      "TiCLearn Pricing · Free and Semester Pass",
    );
    expect(metadata.openGraph?.url).toBe(
      "https://ticlearn.ticsummit.org/pricing",
    );
    expect(metadata.openGraph?.locale).toBe("en_CM");
  });

  it("carries twitter metadata (spec 0019 AC-9)", () => {
    expect(metadata.twitter?.title).toBe(
      "TiCLearn Pricing · Free and Semester Pass",
    );
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });
});
