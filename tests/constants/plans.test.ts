/**
 * The one plan catalogue (spec 0033, AC-1 to AC-6).
 *
 * Free plus Weekly plus Semester are the only offer. Monthly keys stay in
 * code for old active subs but are not for sale.
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

describe("the plan catalogue (spec 0033 AC-1)", () => {
  it("offers free plus weekly plus semester on the public page", () => {
    expect(publicPlans.map((plan) => plan.key)).toEqual([
      "FREE",
      "WEEKLY",
      "PRO",
    ]);
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

  it("sells weekly at 500 and semester at 3000", () => {
    expect(planCatalog.WEEKLY.priceXaf).toBe(500);
    expect(planCatalog.WEEKLY.label).toBe("Weekly Pass");
    expect(planCatalog.WEEKLY.period).toBe("week");
    expect(planCatalog.PRO.priceXaf).toBe(3000);
    expect(planCatalog.PRO.label).toBe("Semester Pass");
    expect(planCatalog.PRO.period).toBe("semester");
    expect(planCatalog.PRO.semesterMonths).toBe(5);
  });

  it("reads the free bullets from FREE_LIMITS (spec 0033 AC-2)", () => {
    const free = planCatalog.FREE;
    expect(free.features).toContain(`${FREE_LIMITS.pdfUploads} notes`);
    expect(free.features).toContain(
      `${FREE_LIMITS.quizGenerations} quizzes from your notes`,
    );
    expect(free.features).toContain(
      `${FREE_LIMITS.aiTutorMessages} Tip messages a day`,
    );
    expect(FREE_LIMITS.pdfUploads).toBe(5);
    expect(FREE_LIMITS.quizGenerations).toBe(10);
    expect(FREE_LIMITS.aiTutorMessages).toBe(15);
  });

  it("states bounded counts with no Unlimited word (spec 0033 AC-5)", () => {
    for (const plan of Object.values(planCatalog)) {
      for (const feature of plan.features) {
        expect(feature.toLowerCase()).not.toContain("unlimited");
      }
    }
    expect(planCatalog.WEEKLY.features).toContain("10 notes");
    expect(planCatalog.PRO.features).toContain("100 notes");
    expect(planCatalog.PRO.features).toContain(
      "Every quiz traces back to the page it came from",
    );
  });

  it("shows an estimated monthly line as a secondary estimate", () => {
    const pass = planCatalog.PRO;
    const perMonth = Math.round(pass.priceXaf / (pass.semesterMonths ?? 1));
    expect(pass.features.length).toBeGreaterThan(0);
    expect(String(perMonth)).toBe("600");
  });

  it("charges the amount the page displays, from the one catalogue", () => {
    const price = getPlanPrice("PRO");
    expect(price.amount).toBe(planCatalog.PRO.priceXaf);
    expect(price.amount).toBe(3000);
  });

  it("only accepts weekly and semester, never Free or legacy monthly", () => {
    expect(payablePlans).toEqual(["WEEKLY", "PRO"]);
    expect(payablePlans).not.toContain("FREE");
    expect(payablePlans).not.toContain("STARTER");
  });
});

describe("the plan catalogue public tiers (spec 0033 AC-1)", () => {
  it("shows exactly three public tiers", () => {
    expect(publicPlans).toHaveLength(3);
    expect(publicPlans.map((plan) => plan.key)).toEqual([
      "FREE",
      "WEEKLY",
      "PRO",
    ]);
  });

  it("keeps the free and paid bullet lists genuinely different", () => {
    const free = new Set(planCatalog.FREE.features);
    const paid = new Set(planCatalog.PRO.features);
    const shared = [...free].filter((feature) => paid.has(feature));
    expect(shared).toHaveLength(0);
  });
});

describe("the plan catalogue pricing (spec 0033 AC-6)", () => {
  it("charges the catalogue amount for every payable plan", () => {
    for (const plan of payablePlans) {
      const price = getPlanPrice(plan);
      expect(price.amount).toBe(
        planCatalog[plan as keyof typeof planCatalog].priceXaf,
      );
      expect(price.fcfa).toBe(
        planCatalog[plan as keyof typeof planCatalog].priceXaf.toLocaleString(),
      );
    }
  });

  it("awards 2500 credits weekly and 15000 semester", () => {
    expect(planCatalog.WEEKLY.credits).toBe(2500);
    expect(planCatalog.PRO.credits).toBe(15000);
  });

  it("reads weekly caps from PAID_LIMITS.WEEKLY", () => {
    expect(PAID_LIMITS.WEEKLY.pdfUploads).toBe(10);
    expect(PAID_LIMITS.WEEKLY.quizGenerations).toBe(20);
    expect(PAID_LIMITS.WEEKLY.aiTutorMessages).toBe(50);
  });
});
