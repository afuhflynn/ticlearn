import { describe, expect, it } from "vitest";

import {
  isKnownToolName,
  toolFailureFromName,
  toolLabelFromName,
} from "@/lib/chat/activity-labels";

describe("the student surface for web tools (AC-16)", () => {
  it("reads a sentence for a search, built from the query", () => {
    expect(
      toolLabelFromName("webSearch", { query: "CEMAC exam timetable" }),
    ).toBe('Searching the web for "CEMAC exam timetable"');
  });

  it("reads a plain sentence when the query has already gone", () => {
    expect(toolLabelFromName("webSearch")).toBe("Searching the web");
  });

  it("reads a sentence for a page read, and never a URL", () => {
    const label = toolLabelFromName("readPage", {
      url: "https://example.com/very/long/address",
    });

    expect(label).toBe("Reading that page");
    expect(label).not.toContain("http");
  });

  it("names no provider anywhere the student can see", () => {
    const surfaces = [
      toolLabelFromName("webSearch", { query: "fees" }),
      toolLabelFromName("readPage"),
      toolFailureFromName("webSearch"),
      toolFailureFromName("readPage"),
    ];

    for (const sentence of surfaces) {
      expect(sentence.toLowerCase()).not.toContain("firecrawl");
      expect(sentence.toLowerCase()).not.toContain("tavily");
    }
  });

  it("knows both tools, so neither falls back to Working", () => {
    expect(isKnownToolName("webSearch")).toBe(true);
    expect(isKnownToolName("readPage")).toBe(true);
  });
});
