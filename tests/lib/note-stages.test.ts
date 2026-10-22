import { describe, expect, it } from "vitest";
import { NOTE_STAGES } from "@/lib/note-stages";

describe("NOTE_STAGES", () => {
  it("keeps the note pipeline stages in database order with readable labels", () => {
    expect(NOTE_STAGES).toEqual([
      { value: "EXTRACTING", label: "Reading the note" },
      { value: "SUMMARIZING", label: "Writing the summary" },
      { value: "INDEXING", label: "Finding the topics" },
    ]);
  });
});
