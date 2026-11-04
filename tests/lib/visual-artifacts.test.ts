import { describe, expect, it } from "vitest";
import { getTaskConfig } from "@/lib/ai/registry";
import { loadPromptRaw, renderPrompt } from "@/lib/prompts/loader";
import {
  buildConvexLensSvg,
  buildFreeFallSvg,
  canonicalDrawKey,
  matchesConvexLensConcept,
  matchesFreeFallConcept,
  sanitizeMermaidSource,
  sanitizeSvgMarkup,
  VISUAL_DRAW_CAP_PER_DAY,
} from "@/lib/visual-artifacts";

describe("visual artifacts", () => {
  it("registers the visual_draw task on Meta with no cache", () => {
    const config = getTaskConfig("visual_draw");
    expect(config.provider).toBe("meta");
    expect(config.cacheTtlMs).toBe(0);
  });

  it("loads the draw prompt with its slots", () => {
    const loaded = loadPromptRaw("draw", "explain_and_draw");
    expect(loaded.settings.name).toBe("explain_and_draw");
    const text = renderPrompt(
      "explain_and_draw",
      "C: {{concept}} X: {{context}}",
      ["concept", "context"],
      { concept: "field lines", context: "notes" },
    );
    expect(text).toContain("field lines");
  });

  it("builds canonical keys that separate answers from note concepts", () => {
    expect(canonicalDrawKey({ answerId: "a1" })).toBe("answer:a1");
    expect(canonicalDrawKey({ noteId: "n1", concept: " Field Lines " })).toBe(
      "note:n1:field lines",
    );
    expect(canonicalDrawKey({ noteId: "n1", concept: "rays" })).not.toBe(
      canonicalDrawKey({ noteId: "n1", concept: "circuits" }),
    );
  });

  it("caps draws at 3 per key per day", () => {
    expect(VISUAL_DRAW_CAP_PER_DAY).toBe(3);
  });

  it("strips scripts and handlers from SVG, rejects non SVG", () => {
    const clean = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="4" onclick="evil()"/></svg>',
    );
    expect(clean).not.toBeNull();
    expect(clean as string).not.toContain("<script");
    expect(clean as string).not.toContain("onclick");
    expect(sanitizeSvgMarkup("just text")).toBeNull();
    expect(
      sanitizeSvgMarkup('<svg><a href="javascript:alert(1)">x</a></svg>'),
    )?.not.toContain("javascript:");
  });

  it("accepts constrained mermaid, rejects prose, repairs bad directions", () => {
    expect(sanitizeMermaidSource("flowchart TD\n A-->B")).not.toBeNull();
    expect(sanitizeMermaidSource("here is a diagram of rays")).toBeNull();
    // A missing or invalid direction is repaired, not rejected.
    expect(sanitizeMermaidSource("graph foo\n A-->B")).toContain("graph TD");
    expect(
      sanitizeMermaidSource("```mermaid\nflowchart TD\n A-->B\n```"),
    ).toContain("flowchart TD");
  });

  it("matches free-fall concepts and builds a sanitizable SVG", () => {
    expect(matchesFreeFallConcept("body in free fall in physics")).toBe(true);
    expect(matchesFreeFallConcept("free body diagram free fall")).toBe(true);
    expect(matchesFreeFallConcept("photosynthesis steps")).toBe(false);
    expect(sanitizeSvgMarkup(buildFreeFallSvg())).not.toBeNull();
  });

  it("matches convex lens concepts and builds a sanitizable SVG", () => {
    expect(
      matchesConvexLensConcept(
        "Convex converging lens ray diagram with parallel rays converging to focal point",
      ),
    ).toBe(true);
    expect(matchesConvexLensConcept("concave diverging lens")).toBe(false);
    expect(matchesConvexLensConcept("photosynthesis steps")).toBe(false);
    const svg = sanitizeSvgMarkup(buildConvexLensSvg());
    expect(svg).not.toBeNull();
    expect(svg as string).toContain("F");
    expect(svg as string).toContain("Image");
  });
});
