import { describe, expect, it } from "vitest";
import {
  defaultCount,
  defaultLevel,
  estimateMarks,
  prefillFromText,
  resolveCountInput,
  WIZARD_COUNTS,
  WIZARD_LEVELS,
} from "@/lib/chat/quiz-wizard";

describe("quiz wizard presets (spec 0033, covers: AC-3, AC-4, AC-5)", () => {
  it("lists four level plus format cards with GCE, HND, PROF, MIXED", () => {
    expect(WIZARD_LEVELS.map((l) => l.value)).toEqual([
      "GCE",
      "HND",
      "PROF",
      "MIXED",
    ]);
    for (const level of WIZARD_LEVELS) {
      expect(level.title.length).toBeGreaterThan(0);
      expect(level.format.length).toBeGreaterThan(0);
    }
  });

  it("lists the four count plus difficulty presets with marks", () => {
    expect(WIZARD_COUNTS).toHaveLength(4);
    expect(WIZARD_COUNTS[0]).toMatchObject({
      count: 5,
      difficulty: "STANDARD",
      marks: 20,
    });
    expect(WIZARD_COUNTS[1]).toMatchObject({
      count: 5,
      difficulty: "HARD",
      marks: 25,
    });
    expect(WIZARD_COUNTS[2]).toMatchObject({
      count: 10,
      difficulty: "STANDARD",
      marks: 40,
    });
    expect(WIZARD_COUNTS[3]).toMatchObject({
      count: 10,
      difficulty: "MIXED",
      marks: 45,
    });
  });

  it("estimates marks: standard is count times two, hard and mixed add five", () => {
    expect(estimateMarks(5, "STANDARD")).toBe(20);
    expect(estimateMarks(5, "HARD")).toBe(25);
    expect(estimateMarks(10, "STANDARD")).toBe(40);
    expect(estimateMarks(10, "MIXED")).toBe(45);
  });

  it("defaults Skip to MIXED level and 5 standard", () => {
    expect(defaultLevel()).toBe("MIXED");
    expect(defaultCount()).toEqual({ count: 5, difficulty: "STANDARD" });
  });

  it("prefills a clear ask like give me 10 hard HND questions", () => {
    expect(prefillFromText("give me 10 hard HND questions")).toMatchObject({
      count: 10,
      difficulty: "HARD",
      level: "HND",
    });
    expect(prefillFromText("gce please")).toMatchObject({ level: "GCE" });
    expect(prefillFromText("hello")).toEqual({});
  });

  it("resolves count input and clamps an unknown count to 5", () => {
    expect(resolveCountInput(10, "MIXED")).toEqual({
      count: 10,
      difficulty: "MIXED",
      marks: 45,
    });
    expect(resolveCountInput(7, "STANDARD").count).toBe(5);
  });
});
