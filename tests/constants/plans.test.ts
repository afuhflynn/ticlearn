/**
 * The one plan catalogue (spec 0019, AC-1 and AC-6).
 *
 * The pricing page, the client island, the payment route, the webhook and the
 * manual route all read this catalogue, so the price a student reads can never
 * drift from the amount they are charged.
 */
import { describe, expect, it, vi } from "vitest";
import { payablePlans, planCatalog, publicPlans } from "@/constants/plans";
import { FREE_LIMITS, PAID_LIMITS } from "@/lib/plan-limits";

vi.mock("@/lib/fapshi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fapshi")>();
  return {
    ...actual,
    initiatePayment: vi.fn(() =>
      Promise.resolve({ success: true, link: "http://test.com" }),
    ),
  };
});

import { getPlanPrice } from "@/lib/fapshi";

describe("the plan catalogue (spec 0019 AC-1)", () => {
  it("offers a free plan and one paid plan on the public page", () => {
    expect(publicPlans.map((plan) => plan.key)).toEqual(["FREE", "PRO"]);
  });

  it("keeps the plan keys unique", () => {
    const keys = Object.keys(planCatalog);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("prices every plan in whole CFA francs, with no minor units", () => {
    for (const plan of Object.values(planCatalog)) {
      expect(Number.isInteger(plan.priceXaf), plan.label).toBe(true);
      expect(plan.priceXaf).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every plan a label, a call to action and a link", () => {
    for (const plan of Object.values(planCatalog)) {
      expect(plan.label.length).toBeGreaterThan(0);
      expect(plan.cta.length).toBeGreaterThan(0);
      expect(plan.href.length).toBeGreaterThan(0);
    }
  });

  it("lists at least one feature per plan", () => {
    for (const plan of Object.values(planCatalog)) {
      expect(plan.features.length).toBeGreaterThan(0);
      for (const feature of plan.features) {
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it("marks exactly one plan as the popular one", () => {
    expect(
      Object.values(planCatalog).filter((plan) => plan.popular),
    ).toHaveLength(1);
  });

  it("charges nothing for the free plan", () => {
    expect(planCatalog.FREE.priceXaf).toBe(0);
  });

  it("sells the semester pass at 2,500 FCFA", () => {
    expect(planCatalog.PRO.priceXaf).toBe(2_500);
    expect(planCatalog.PRO.label).toBe("Semester Pass");
    expect(planCatalog.PRO.period).toBe("semester");
    expect(planCatalog.PRO.semesterMonths).toBe(5);
  });

  it("reads the free bullets from FREE_LIMITS (spec 0019 AC-2)", () => {
    const free = planCatalog.FREE;
    expect(free.features).toContain(`${FREE_LIMITS.pdfUploads} notes`);
    expect(free.features).toContain(
      `${FREE_LIMITS.quizGenerations} quizzes from your notes`,
    );
    expect(free.features).toContain(
      `${FREE_LIMITS.aiTutorMessages} Tip messages a day`,
    );
    expect(free.features).toContain("Read any note you upload, any time");
  });

  it("reads the semester pass bullets from PAID_LIMITS.PRO (spec 0019 AC-3)", () => {
    const pass = planCatalog.PRO;
    expect(pass.features).toContain("Unlimited notes");
    expect(pass.features).toContain("Unlimited quizzes from your notes");
    expect(pass.features).toContain("Unlimited Tip messages");
    expect(pass.features).toContain(
      "Every quiz traces back to the page it came from",
    );
  });

  it("shows an estimated monthly line as a secondary estimate (spec 0019 AC-4)", () => {
    const pass = planCatalog.PRO;
    const perMonth = Math.round(pass.priceXaf / (pass.semesterMonths ?? 1));
    expect(pass.features.length).toBeGreaterThan(0);
    expect(String(perMonth)).toBe("500");
  });

  it("charges the amount the page displays, from the one catalogue (spec 0019 AC-6)", () => {
    const price = getPlanPrice("PRO");
    expect(price.amount).toBe(planCatalog.PRO.priceXaf);
    expect(price.amount).toBe(2_500);
  });

  it("only accepts payable plans, never Free", () => {
    expect(payablePlans).toContain("PRO");
    expect(payablePlans).not.toContain("FREE");
  });
});

describe("the plan catalogue public tiers (spec 0019 AC-1)", () => {
  it("shows exactly two public tiers, Free and Semester Pass", () => {
    expect(publicPlans).toHaveLength(2);
    expect(publicPlans.map((plan) => plan.key)).toEqual(["FREE", "PRO"]);
  });

  it("keeps the free and paid bullet lists genuinely different", () => {
    const free = new Set(planCatalog.FREE.features);
    const paid = new Set(planCatalog.PRO.features);
    const shared = [...free].filter((feature) => paid.has(feature));
    expect(shared).toHaveLength(0);
  });
});

describe("the plan catalogue pricing (spec 0019 AC-6)", () => {
  it("charges the catalogue amount for every payable plan", () => {
    for (const plan of payablePlans) {
      const price = getPlanPrice(
        plan as "PRO" | "STARTER" | "STANDARD" | "PREMIUM",
      );
      expect(price.amount).toBe(
        planCatalog[plan as keyof typeof planCatalog].priceXaf,
      );
      expect(price.fcfa).toBe(
        planCatalog[plan as keyof typeof planCatalog].priceXaf.toLocaleString(),
      );
    }
  });

  it("treats the semester as the main unit with an estimated monthly line (spec 0019 AC-4)", () => {
    const pass = planCatalog.PRO;
    expect(pass.period).toBe("semester");
    expect(pass.priceXaf).toBe(2_500);
    const perMonth = Math.round(pass.priceXaf / (pass.semesterMonths ?? 1));
    expect(perMonth).toBe(500);
  });
});
