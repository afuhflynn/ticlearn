import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StreamingCaret } from "@/components/ai-elements/streaming-caret";

vi.mock("motion/react", async () => {
  const actual =
    await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe("StreamingCaret", () => {
  it("is hidden from assistive technology while marking the end of an answer", () => {
    const { container } = render(<StreamingCaret className="answer-caret" />);

    const caret = container.querySelector("[data-slot='streaming-caret']");
    expect(caret).not.toBeNull();
    expect(caret).toHaveAttribute("aria-hidden", "true");
    expect(caret).toHaveClass("answer-caret");
  });
});
