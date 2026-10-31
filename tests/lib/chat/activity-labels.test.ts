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

  it("reads a page lookup sentence that names no note id or provider (AC-3)", () => {
    const label = toolLabelFromName("getNotePages", {});

    expect(label).toBe("Reading page numbers from your note");
    expect(label).not.toContain("getNotePages");
  });

  it("reads a plain failure sentence for a page lookup (AC-3)", () => {
    expect(toolFailureFromName("getNotePages")).toBe(
      "Couldn't read the page numbers. Answering without them.",
    );
  });

  it("knows the page lookup tool, so it never falls back to Working (AC-3)", () => {
    expect(isKnownToolName("getNotePages")).toBe(true);
  });

  it("reads a quiz start sentence that names no tool (spec 0031, AC-1)", () => {
    const label = toolLabelFromName("startQuiz", {});

    expect(label).toBe("Starting your quiz");
    expect(label).not.toContain("startQuiz");
  });

  it("reads a plain failure sentence for a quiz start (spec 0031, AC-1)", () => {
    expect(toolFailureFromName("startQuiz")).toBe(
      "Couldn't start the quiz here. Ask again and I will set it up.",
    );
  });

  it("knows the quiz start tool, so it never falls back to Working (spec 0031, AC-1)", () => {
    expect(isKnownToolName("startQuiz")).toBe(true);
  });
});
