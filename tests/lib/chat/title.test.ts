import { describe, expect, it } from "vitest";
import {
  cleanGeneratedTitle,
  isReplaceableTitle,
  provisionalChatTitle,
} from "@/lib/chat/title";

describe("provisionalChatTitle", () => {
  it("uses a short first message as it stands", () => {
    expect(provisionalChatTitle("Explain osmosis")).toBe("Explain osmosis");
  });

  it("collapses newlines and repeated spaces into one line", () => {
    expect(provisionalChatTitle("Explain\n\nosmosis   please")).toBe(
      "Explain osmosis please",
    );
  });

  it("cuts a long message at a word boundary and marks the cut", () => {
    const title = provisionalChatTitle(
      "Explain the difference between mitosis and meiosis in plant cells please",
      40,
    );

    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(41);
    expect(title).not.toContain("  ");
  });

  it("keeps the placeholder when there is nothing to name", () => {
    expect(provisionalChatTitle("   ")).toBe("New Chat");
  });
});

describe("cleanGeneratedTitle", () => {
  it("removes the label, quotes and trailing punctuation a model adds", () => {
    expect(cleanGeneratedTitle('Title: "Cell Division Basics."')).toBe(
      "Cell Division Basics",
    );
    expect(cleanGeneratedTitle("**Osmosis Explained**")).toBe(
      "Osmosis Explained",
    );
  });

  it("returns nothing when the model wrote nothing usable", () => {
    expect(cleanGeneratedTitle("   ")).toBe("");
    expect(cleanGeneratedTitle("Title:")).toBe("");
  });
});

describe("isReplaceableTitle", () => {
  it("lets the model replace the placeholder or its own provisional title", () => {
    expect(isReplaceableTitle("New Chat", "Explain osmosis")).toBe(true);
    expect(isReplaceableTitle("Explain osmosis", "Explain osmosis")).toBe(true);
  });

  it("leaves a title the student renamed by hand alone", () => {
    expect(isReplaceableTitle("My own title", "Explain osmosis")).toBe(false);
    expect(isReplaceableTitle(null, "Explain osmosis")).toBe(false);
  });
});
