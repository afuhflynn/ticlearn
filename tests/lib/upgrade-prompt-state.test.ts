import { describe, expect, it } from "vitest";
import { FREE_LIMITS } from "@/lib/plan-limits";
import { decidePromptForm } from "@/lib/upgrade-prompt-state";

describe("decidePromptForm", () => {
  it("shows full on a fresh active day", () => {
    expect(
      decidePromptForm({ shownToday: false, dismissedToday: false }),
    ).toEqual({ showFull: true, quiet: false });
  });

  it("shows short after the full invite landed", () => {
    expect(
      decidePromptForm({ shownToday: true, dismissedToday: false }),
    ).toEqual({ showFull: false, quiet: false });
  });

  it("stays quiet after a dismiss until next active day", () => {
    expect(
      decidePromptForm({ shownToday: true, dismissedToday: true }),
    ).toEqual({ showFull: false, quiet: true });
  });

  it("keeps the AC-1 free counts unchanged", () => {
    expect(FREE_LIMITS).toMatchObject({
      pdfUploads: 5,
      quizGenerations: 10,
      aiTutorMessages: 15,
      maxConversationMessages: 50,
    });
  });
});
