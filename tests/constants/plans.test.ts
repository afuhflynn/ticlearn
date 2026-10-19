/**
 * The one plan list (spec 0012, AC-8).
 *
 * The pricing page and the client island both read this list, so a price
 * cannot drift between the card a student reads and the button they press.
 */
import { describe, expect, it } from "vitest";
import { plans } from "@/constants/plans";

describe("the shared plan list (spec 0012 AC-8)", () => {
  it("offers a free plan and one paid plan", () => {
    expect(plans.map((plan) => plan.priceKey)).toEqual(["FREE", "PRO"]);
  });

  it("keeps the plan keys unique", () => {
    const keys = plans.map((plan) => plan.priceKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("prices every plan in whole CFA francs, with no minor units", () => {
    for (const plan of plans) {
      expect(plan.price, plan.name).toMatch(/^\d{1,3}(,\d{3})*$/);
    }
  });

  it("gives every plan a name, a description, a call to action and a link", () => {
    for (const plan of plans) {
      expect(plan.name.length, plan.name).toBeGreaterThan(0);
      expect(plan.description.length, plan.name).toBeGreaterThan(0);
      expect(plan.cta.length, plan.name).toBeGreaterThan(0);
      expect(plan.href.length, plan.name).toBeGreaterThan(0);
    }
  });

  it("lists at least one feature per plan", () => {
    for (const plan of plans) {
      expect(plan.features.length, plan.name).toBeGreaterThan(0);
      for (const feature of plan.features) {
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it("marks exactly one plan as the popular one", () => {
    expect(plans.filter((plan) => plan.popular)).toHaveLength(1);
  });

  it("charges nothing for the free plan", () => {
    const free = plans.find((plan) => plan.priceKey === "FREE");
    expect(free?.price).toBe("0");
  });
});
