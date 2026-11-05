import { describe, expect, it, vi } from "vitest";

vi.mock("uploadthing/server", () => ({
  UTApi: class UTApi {},
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: (_opts: unknown, fn: unknown) => ({ run: fn }),
  },
}));

import { parseVisualAnswer } from "@/lib/inngest/visual-analysis-functions";

describe("parseVisualAnswer", () => {
  it("parses the plain JSON the prompt asks for", () => {
    const out = parseVisualAnswer(
      '{"visualType": "diagram", "description": "A lens with three rays.", "confidence": 0.9}',
    );
    expect(out).toEqual({
      visualType: "DIAGRAM",
      description: "A lens with three rays.",
      confidence: 0.9,
    });
  });

  it("strips code fences around the JSON", () => {
    const out = parseVisualAnswer(
      '```json\n{"visualType": "chart", "description": "Bars.", "confidence": 0.5}\n```',
    );
    expect(out.visualType).toBe("CHART");
  });

  it("throws on prose so the caller falls through to the fallback", () => {
    expect(() => parseVisualAnswer("I cannot see the page.")).toThrow();
  });

  it("throws on a wrong shape so a bad model answer never stores", () => {
    expect(() =>
      parseVisualAnswer('{"visualType": "nope", "description": "x"}'),
    ).toThrow();
    expect(() =>
      parseVisualAnswer('{"visualType": "diagram", "confidence": 0.5}'),
    ).toThrow();
  });
});
