import { describe, expect, it } from "vitest";
import {
  finishSchema,
  GOAL_VALUES,
  goalStepSchema,
  levelStepSchema,
  STEP_KEYS,
  schoolStepSchema,
  TOTAL_STEPS,
} from "@/lib/onboarding/validation";

/**
 * The setup validation contract (spec 0041, AC-5).
 *
 * Every step schema decides what the server accepts before anything is
 * saved. A bad value must be rejected with plain words and never reach
 * the database; a good value must pass untouched.
 */
describe("levelStepSchema (covers: AC-5)", () => {
  it("accepts each study year the app shows", () => {
    for (const value of ["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4"]) {
      expect(levelStepSchema.safeParse({ levelOfStudy: value }).success).toBe(
        true,
      );
    }
  });

  it("rejects an unknown year with plain words", () => {
    const result = levelStepSchema.safeParse({ levelOfStudy: "YEAR_9" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/study year/i);
    }
  });

  it("rejects a missing year", () => {
    expect(levelStepSchema.safeParse({}).success).toBe(false);
  });
});

describe("goalStepSchema (covers: AC-5)", () => {
  it("accepts each goal the app shows", () => {
    for (const goal of GOAL_VALUES) {
      expect(goalStepSchema.safeParse({ targetGoal: goal }).success).toBe(true);
    }
  });

  it("rejects a free typed goal with a plain message", () => {
    const result = goalStepSchema.safeParse({ targetGoal: "Become rich" });

    expect(result.success).toBe(false);
  });
});

describe("schoolStepSchema (covers: AC-5)", () => {
  it("accepts a school plus program pair", () => {
    const result = schoolStepSchema.safeParse({
      institution: "University of Buea",
      program: "Computer Science",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a one letter school with plain words", () => {
    const result = schoolStepSchema.safeParse({
      institution: "U",
      program: "Computer Science",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/school/i);
    }
  });

  it("rejects a one letter program with plain words", () => {
    const result = schoolStepSchema.safeParse({
      institution: "University of Buea",
      program: "C",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/program/i);
    }
  });

  it("trims padding before measuring length", () => {
    const result = schoolStepSchema.safeParse({
      institution: "  University of Buea  ",
      program: "  Computer Science  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.institution).toBe("University of Buea");
      expect(result.data.program).toBe("Computer Science");
    }
  });

  it("leaves faculty optional", () => {
    expect(
      schoolStepSchema.safeParse({
        institution: "University of Buea",
        program: "Law",
      }).success,
    ).toBe(true);
  });
});

describe("finishSchema (covers: AC-1, AC-5)", () => {
  it("accepts a full finish payload", () => {
    const result = finishSchema.safeParse({
      levelOfStudy: "YEAR_2",
      targetGoal: "Semester & Final Exams",
      institution: "University of Buea",
      program: "Computer Science",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a finish with no goal", () => {
    expect(finishSchema.safeParse({ levelOfStudy: "YEAR_2" }).success).toBe(
      false,
    );
  });

  it("rejects a finish with no year", () => {
    expect(
      finishSchema.safeParse({ targetGoal: "Semester & Final Exams" }).success,
    ).toBe(false);
  });

  it("rejects an unknown year even at finish", () => {
    expect(
      finishSchema.safeParse({
        levelOfStudy: "YEAR_9",
        targetGoal: "Semester & Final Exams",
      }).success,
    ).toBe(false);
  });
});

describe("step order (covers: AC-2)", () => {
  it("asks level then goal then school then confirm", () => {
    expect(STEP_KEYS).toEqual(["level", "goal", "school", "confirm"]);
    expect(TOTAL_STEPS).toBe(4);
  });
});
