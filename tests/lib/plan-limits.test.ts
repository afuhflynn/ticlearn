import { describe, expect, it } from "vitest";
import { Plan } from "@/lib/generated/prisma/enums";
import {
  FREE_LIMITS,
  getPlanLimits,
  isUnlimited,
  limitReached,
  PAID_LIMITS,
  remainingOf,
  resolvePlan,
  UNLIMITED,
} from "@/lib/plan-limits";

describe("resolvePlan (covers: AC-13)", () => {
  it("resolves a user with no subscription to FREE", () => {
    expect(resolvePlan(null)).toBe("FREE");
    expect(resolvePlan(undefined)).toBe("FREE");
  });

  it("resolves to FREE unless the subscription is active", () => {
    expect(resolvePlan({ plan: Plan.WEEKLY, status: "PENDING" })).toBe("FREE");
    expect(resolvePlan({ plan: Plan.WEEKLY, status: "CANCELLED" })).toBe(
      "FREE",
    );
  });

  it("resolves an active subscription to its plan", () => {
    expect(resolvePlan({ plan: Plan.WEEKLY, status: "ACTIVE" })).toBe("WEEKLY");
  });

  it("resolves a retired monthly plan to FREE (spec 0039)", () => {
    expect(resolvePlan({ plan: Plan.STARTER, status: "ACTIVE" })).toBe("FREE");
    expect(resolvePlan({ plan: Plan.PREMIUM, status: "ACTIVE" })).toBe("FREE");
  });

  it("falls back to FREE for a plan the schema does not know", () => {
    expect(resolvePlan({ plan: "GOLD", status: "ACTIVE" })).toBe("FREE");
  });

  it("treats FREE as reachable even though it is not a value of the Plan enum", () => {
    expect(Object.values(Plan)).not.toContain("FREE");
    expect(resolvePlan({ status: "ACTIVE" })).toBe("FREE");
  });
});

describe("getPlanLimits (covers: AC-13)", () => {
  it("gives every plan a limit set and never an empty one", () => {
    for (const plan of Object.values(Plan)) {
      const limits = getPlanLimits(plan);
      expect(Object.keys(limits).sort()).toEqual(
        Object.keys(FREE_LIMITS).sort(),
      );
    }
  });

  it("falls back to the free limits for an unknown plan", () => {
    expect(getPlanLimits("NOPE")).toEqual(FREE_LIMITS);
  });

  it("never hands a paid student less of the product than a free one", () => {
    const effective = (limit: number, freeLimit: number) =>
      limit === UNLIMITED || limit >= freeLimit;

    for (const plan of Object.values(Plan)) {
      const limits = getPlanLimits(plan);
      expect(
        effective(limits.pdfUploads, FREE_LIMITS.pdfUploads),
        `${plan} pdfUploads`,
      ).toBe(true);
      expect(
        effective(limits.quizGenerations, FREE_LIMITS.quizGenerations),
        `${plan} quizGenerations`,
      ).toBe(true);
      expect(
        effective(limits.aiTutorMessages, FREE_LIMITS.aiTutorMessages),
        `${plan} aiTutorMessages`,
      ).toBe(true);
      expect(
        effective(
          limits.maxConversationMessages,
          FREE_LIMITS.maxConversationMessages,
        ),
        `${plan} maxConversationMessages`,
      ).toBe(true);
    }
  });

  it("caps a weekly student at the tutor messages the client advertises", () => {
    expect(getPlanLimits(Plan.WEEKLY).aiTutorMessages).toBe(50);
  });

  it("falls back to the free limits for a retired monthly plan (spec 0039)", () => {
    expect(getPlanLimits(Plan.STARTER)).toEqual(FREE_LIMITS);
    expect(getPlanLimits(Plan.PREMIUM)).toEqual(FREE_LIMITS);
  });

  it("counts with the unlimited sentinel or a positive whole number, nothing else", () => {
    for (const limits of Object.values(PAID_LIMITS)) {
      for (const [key, value] of Object.entries(limits)) {
        if (typeof value !== "number") continue;
        expect(Number.isInteger(value), `${key} is a whole number`).toBe(true);
        expect(
          value === UNLIMITED || value > 0,
          `${key} is unlimited or positive`,
        ).toBe(true);
      }
    }
  });
});

describe("limitReached and remainingOf (covers: AC-13)", () => {
  it("reads minus one as unlimited, so it is never reached", () => {
    expect(isUnlimited(UNLIMITED)).toBe(true);
    expect(limitReached(UNLIMITED, 9_999)).toBe(false);
    expect(remainingOf(UNLIMITED, 9_999)).toBe(UNLIMITED);
  });

  it("reaches a finite limit at the limit, not one past it", () => {
    expect(limitReached(2, 1)).toBe(false);
    expect(limitReached(2, 2)).toBe(true);
    expect(limitReached(2, 3)).toBe(true);
  });

  it("never reports a negative remainder", () => {
    expect(remainingOf(2, 5)).toBe(0);
  });
});
