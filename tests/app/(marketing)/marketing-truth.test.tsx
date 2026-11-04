// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(marketing)/page";
import { metadata as pricingMetadata } from "@/app/(marketing)/pricing/page";
import PrivacyPage from "@/app/(marketing)/privacy/page";
import TermsPage from "@/app/(marketing)/terms/page";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { WHATSAPP_GROUP_LABEL } from "@/constants/contact";
import { planCatalog, publicPlans } from "@/constants/plans";
import { FREE_LIMITS } from "@/lib/plan-limits";

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    queries: { subscription: vi.fn(async () => ({ subscription: null })) },
  },
}));

/**
 * The marketing truth pins (spec 0048 AC-2, AC-3, AC-4).
 *
 * Every number on a public page must equal the code value that enforces it,
 * so these tests read the same constants the app reads and assert the pages
 * print them. Copy is never retyped in the test either: each expected string
 * is built from the constant, so a limit change updates both sides together.
 */
describe("the marketing pages print code values (spec 0048)", () => {
  it("prints the free limits from code on the landing CTA band", () => {
    render(<HomePage />);

    const band = screen.getByText(/free to start/i).textContent ?? "";

    expect(band).toContain(`${FREE_LIMITS.pdfUploads} notes`);
    expect(band).toContain(`${FREE_LIMITS.quizGenerations} quizzes`);
    expect(band).toContain(`${FREE_LIMITS.aiTutorMessages}`);
  });

  it("prints the free limits and both pass prices from code in pricing metadata", () => {
    const description = pricingMetadata.description ?? "";

    expect(description).toContain(`${FREE_LIMITS.pdfUploads} notes`);
    expect(description).toContain(`${FREE_LIMITS.quizGenerations} quizzes`);
    expect(description).toContain(`${FREE_LIMITS.aiTutorMessages}`);
    expect(description).toContain(`${planCatalog.WEEKLY.priceXaf}`);
    expect(description).toContain(
      `${planCatalog.PRO.priceXaf.toLocaleString()}`,
    );
  });

  it("prints the pass bullets verbatim from the catalogue in the grid", () => {
    render(<PricingPlans plans={publicPlans} />);

    for (const plan of publicPlans) {
      for (const feature of plan.features) {
        expect(screen.getByText(feature)).toBeInTheDocument();
      }
    }
  });

  it("reads the contact link text from the contact file on terms", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("link", { name: WHATSAPP_GROUP_LABEL }),
    ).toHaveAttribute("href", expect.stringContaining("chat.whatsapp.com"));
  });

  it("reads the contact link text from the contact file on privacy", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("link", { name: WHATSAPP_GROUP_LABEL }),
    ).toHaveAttribute("href", expect.stringContaining("chat.whatsapp.com"));
  });
});
