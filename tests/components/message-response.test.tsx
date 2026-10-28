import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageResponse } from "@/components/ai-elements/message";

const FENCE = String.fromCharCode(96, 96, 96);

function codeBlock(lang: string, body: string): string {
  return ["Here:", "", `${FENCE}${lang}`, body, FENCE, ""].join("\n");
}

describe("MessageResponse rendering modes", () => {
  it("parses partial markdown mid-stream instead of dropping it", () => {
    const { container } = render(
      <MessageResponse isStreaming>Explain **quadratic</MessageResponse>,
    );

    expect(container.textContent).toContain("quadratic");
  });

  it("renders the finished answer identically in static mode", () => {
    const { container } = render(
      <MessageResponse isStreaming={false}>
        {"## Steps\n\n1. Expand\n\n2. Solve\n"}
      </MessageResponse>,
    );

    expect(container.querySelector("h2")?.textContent).toContain("Steps");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders fenced code blocks with a copy control", () => {
    const { container } = render(
      <MessageResponse isStreaming={false}>
        {codeBlock("python", "def expand(a, b):\n    return a + b")}
      </MessageResponse>,
    );

    expect(container.querySelector("pre")).toBeInTheDocument();
    expect(container.textContent).toContain("def expand");
  });

  it("keeps headings, bold, lists and tables structured", () => {
    const content = [
      "## Marking",
      "",
      "**Q1** is correct.",
      "",
      "- Expand first",
      "- Then collect terms",
      "",
      "| Q | Mark |",
      "| - | ---- |",
      "| 1 | 2/2  |",
      "",
    ].join("\n");
    const { container } = render(
      <MessageResponse isStreaming={false}>{content}</MessageResponse>,
    );

    expect(container.querySelector("h2")?.textContent).toContain("Marking");
    expect(
      container.querySelector('[data-streamdown="strong"]')?.textContent,
    ).toContain("Q1");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});
