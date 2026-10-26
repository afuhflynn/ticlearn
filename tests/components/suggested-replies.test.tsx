import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
  SuggestedReplies,
  suggestionsFromParts,
} from "@/components/chat/suggested-replies";

const suggestPart = (
  questions: unknown,
  state = "output-available",
): UIMessage["parts"][number] =>
  ({
    type: "tool-suggestReplies",
    toolCallId: "call-suggest",
    state,
    input: {},
    output: { questions },
  }) as unknown as UIMessage["parts"][number];

const textPart = (text: string): UIMessage["parts"][number] => ({
  type: "text",
  text,
});

describe("suggestionsFromParts (covers: AC-24)", () => {
  it("reads the questions from the finished suggestReplies tool", () => {
    expect(
      suggestionsFromParts([
        textPart("Here is the answer"),
        suggestPart([
          "Explain the chain rule with an example",
          "What is a derivative?",
        ]),
      ]),
    ).toEqual([
      "Explain the chain rule with an example",
      "What is a derivative?",
    ]);
  });

  it("draws nothing while the tool has not finished", () => {
    expect(
      suggestionsFromParts([
        suggestPart(["What is a derivative?"], "input-available"),
      ]),
    ).toEqual([]);
  });

  it("draws nothing when the output is not a list of questions", () => {
    expect(suggestionsFromParts([suggestPart("not a list")])).toEqual([]);
    expect(suggestionsFromParts([suggestPart(undefined)])).toEqual([]);
  });

  it("drops an empty or non string entry", () => {
    expect(
      suggestionsFromParts([
        suggestPart(["Explain the chain rule", "", "   ", 42, null]),
      ]),
    ).toEqual(["Explain the chain rule"]);
  });

  it("reads the newest suggestion part only", () => {
    expect(
      suggestionsFromParts([
        suggestPart(["An older question"]),
        textPart("A newer answer"),
        suggestPart(["A newer question"]),
      ]),
    ).toEqual(["A newer question"]);
  });

  it("draws nothing when the tool never ran", () => {
    expect(suggestionsFromParts([textPart("Here is the answer")])).toEqual([]);
  });
});

describe("the suggestion chips (covers: AC-23)", () => {
  it("draws nothing for an empty list", () => {
    const { container } = render(
      <SuggestedReplies questions={[]} onSelect={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("draws one chip per question", () => {
    render(
      <SuggestedReplies
        questions={["What is a derivative?", "Show me a past paper question"]}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["What is a derivative?", "Show me a past paper question"]);
  });

  it("sends the tapped question verbatim", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SuggestedReplies
        onSelect={onSelect}
        questions={["Explain the chain rule with an example"]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /Explain the chain rule with an example/,
      }),
    );

    expect(onSelect).toHaveBeenCalledWith(
      "Explain the chain rule with an example",
    );
  });
});
