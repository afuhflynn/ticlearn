import { describe, expect, it } from "vitest";

import {
  applyCaps,
  canonicalUrl,
  dedupeResults,
  evaluateResults,
  normaliseResult,
  truncateAtBoundary,
} from "@/lib/web-search/normalize";

function result(
  overrides: Partial<Parameters<typeof normaliseResult>[0]> & { url: string },
) {
  const normalised = normaliseResult({
    title: "Photosynthesis in plants",
    snippet: "Photosynthesis converts light into chemical energy. ".repeat(5),
    body: null,
    ...overrides,
  });
  if (!normalised) throw new Error("expected a normalised result");
  return normalised;
}

describe("canonicalUrl", () => {
  it("collapses the differences that make two results look different", () => {
    expect(canonicalUrl("https://www.Example.com/page/?utm_source=x#top")).toBe(
      "https://example.com/page",
    );
  });
});

describe("dedupe (AC-7)", () => {
  it("keeps the longer snippet, the body that exists and the higher score", () => {
    const withBody = result({
      url: "https://example.com/a",
      snippet: "short",
      body: "A long body about photosynthesis. ".repeat(20),
      score: 0.4,
    });
    const longerSnippet = result({
      url: "https://www.example.com/a/",
      snippet: "A much longer snippet about photosynthesis. ".repeat(5),
      body: null,
      score: 0.9,
    });

    const merged = dedupeResults([withBody, longerSnippet]);

    expect(merged).toHaveLength(1);
    expect(merged[0].snippet).toBe(longerSnippet.snippet);
    expect(merged[0].body).toBe(withBody.body);
    expect(merged[0].score).toBe(0.9);
  });
});

describe("the usability gate (AC-4)", () => {
  it("drops a page with no shared word and no other reason to keep it", () => {
    const unrelated = result({
      url: "https://example.com/b",
      title: "Football results",
      snippet: "The league table after the weekend matches. ".repeat(4),
    });
    const alsoUnrelated = result({
      url: "https://example.com/b-two",
      title: "Transfer news",
      snippet: "The club signed a striker on deadline day. ".repeat(4),
    });

    const evaluation = evaluateResults(
      [unrelated, alsoUnrelated],
      "photosynthesis light reaction",
    );
    expect(evaluation.usable).toHaveLength(0);
    expect(evaluation.reason).toBe("NO_USABLE");
  });

  it("keeps a page whose language differs from the query", () => {
    const french = result({
      url: "https://example.cm/photosynthese",
      title: "La photosynthèse",
      snippet:
        "La photosynthèse est le processus qui transforme la lumière en énergie chimique. ".repeat(
          2,
        ),
      language: "fr",
    });

    const evaluation = evaluateResults(
      [french],
      "photosynthesis light reaction",
    );
    expect(evaluation.usable).toHaveLength(1);
  });

  it("keeps the last result standing even without a shared word", () => {
    const only = result({
      url: "https://example.com/c",
      title: "Leaf structure",
      snippet: "A page about the inside of a leaf and its parts. ".repeat(3),
    });

    const evaluation = evaluateResults([only], "photosynthesis light reaction");
    expect(evaluation.usable).toHaveLength(1);
  });

  it("reports an empty answer as worth one more pass", () => {
    expect(evaluateResults([], "photosynthesis")).toEqual({
      usable: [],
      reason: "ZERO_RESULTS",
      worthRetrying: true,
    });
  });

  it("reports blocked results without asking for another pass", () => {
    const blocked = result({
      url: "https://example.com/d",
      statusCode: 403,
      bodyExpected: true,
      body: null,
      snippet: "",
    });

    const evaluation = evaluateResults([blocked], "photosynthesis");
    expect(evaluation.reason).toBe("BLOCKED");
    expect(evaluation.worthRetrying).toBe(false);
  });
});

describe("caps (AC-8)", () => {
  it("keeps at most five results and 6,000 characters for a quick answer", () => {
    const results = Array.from({ length: 8 }, (_, index) =>
      result({
        url: `https://example.com/${index}`,
        snippet: "Photosynthesis converts light into chemical energy. ".repeat(
          40,
        ),
      }),
    );

    const capped = applyCaps(results, "quick");

    expect(capped.results).toHaveLength(5);
    expect(capped.contextChars).toBeLessThanOrEqual(6_000);
    expect(capped.truncated).toBe(true);
  });

  it("marks the result the total budget cut, for a thorough answer", () => {
    const results = Array.from({ length: 3 }, (_, index) =>
      result({
        url: `https://example.com/thorough-${index}`,
        snippet: "Photosynthesis converts light into chemical energy. ".repeat(
          60,
        ),
        body: "Photosynthesis detail in the chloroplast. ".repeat(200),
        bodyExpected: true,
      }),
    );

    const capped = applyCaps(results, "thorough");

    expect(capped.contextChars).toBeLessThanOrEqual(12_000);
    expect(capped.results).toHaveLength(2);
    expect(capped.results.at(-1)?.warnings).toContain("TRUNCATED");
  });

  it("never carries a body in a quick answer", () => {
    const withBody = result({
      url: "https://example.com/e",
      body: "Photosynthesis body. ".repeat(50),
    });

    const capped = applyCaps([withBody], "quick");
    expect(capped.results[0].body).toBeNull();
  });

  it("cuts at a sentence boundary rather than mid word", () => {
    const text = "Photosynthesis converts light into chemical energy. ".repeat(
      100,
    );
    const capped = applyCaps(
      [result({ url: "https://example.com/f", snippet: text })],
      "quick",
    );

    const snippet = capped.results[0].snippet;
    expect(snippet).toContain("… [truncated]");
    expect(snippet.replace(" … [truncated]", "")).toMatch(/[.!?]$/);
  });

  it("never spends more characters than the cap it was given", () => {
    const text = "Photosynthesis converts light into chemical energy. ".repeat(
      40,
    );

    for (const cap of [1, 5, 14, 15, 20, 100, 1_200]) {
      expect(truncateAtBoundary(text, cap).text.length).toBeLessThanOrEqual(
        cap,
      );
    }
  });

  it("drops a tail too short to read rather than showing a fragment", () => {
    const results = Array.from({ length: 3 }, (_, index) =>
      result({
        url: `https://example.com/tail-${index}`,
        snippet: "Photosynthesis converts light into chemical energy. ".repeat(
          60,
        ),
        body: "Photosynthesis detail in the chloroplast. ".repeat(200),
        bodyExpected: true,
      }),
    );

    const capped = applyCaps(results, "thorough");

    expect(capped.contextChars).toBeLessThanOrEqual(12_000);
    for (const kept of capped.results) {
      expect(kept.snippet.length).toBeGreaterThanOrEqual(100);
    }
  });
});
