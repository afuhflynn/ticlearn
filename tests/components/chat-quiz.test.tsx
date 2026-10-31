import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { ChatQuiz } from "@/components/chat/chat-quiz";

vi.mock("@/components/chat/quiz-runner", () => ({
  QuizRunner: ({
    conversationId,
    noteId,
    noteTitle,
  }: {
    conversationId: string;
    noteId: string | null;
    noteTitle: string | null;
  }) => (
    <div
      data-testid="quiz-runner"
      data-conversation={conversationId}
      data-note={noteId ?? ""}
      data-title={noteTitle ?? ""}
    />
  ),
}));

function message(parts: UIMessage["parts"]): UIMessage {
  return { id: "m1", role: "assistant", parts };
}

function startPart(output: unknown) {
  // Static parts carry the tool name in the type only, no toolName field.
  return {
    type: "tool-startQuiz",
    state: "output-available",
    input: {},
    output,
  } as unknown as UIMessage["parts"][number];
}

function dynamicStartPart(output: unknown) {
  return {
    type: "dynamic-tool",
    toolName: "startQuiz",
    state: "output-available",
    input: {},
    output,
  } as unknown as UIMessage["parts"][number];
}

describe("ChatQuiz (spec 0031, covers: AC-1, AC-2)", () => {
  it("mounts the runner with the resolved note from a static part", () => {
    render(
      <ChatQuiz
        conversationId="conv-1"
        message={message([
          startPart({ ok: true, noteId: "note-1", noteTitle: "Morphemes" }),
        ])}
      />,
    );

    const runner = screen.getByTestId("quiz-runner");
    expect(runner.getAttribute("data-conversation")).toBe("conv-1");
    expect(runner.getAttribute("data-note")).toBe("note-1");
    expect(runner.getAttribute("data-title")).toBe("Morphemes");
  });

  it("mounts the runner from a dynamic tool part too", () => {
    render(
      <ChatQuiz
        conversationId="conv-2"
        message={message([
          dynamicStartPart({
            ok: true,
            noteId: "note-2",
            noteTitle: "Sentences",
          }),
        ])}
      />,
    );

    expect(screen.getByTestId("quiz-runner")).toBeDefined();
  });

  it("mounts the runner empty state when no note resolved", () => {
    render(
      <ChatQuiz
        conversationId="conv-1"
        message={message([
          startPart({ ok: true, noteId: null, noteTitle: null }),
        ])}
      />,
    );

    const runner = screen.getByTestId("quiz-runner");
    expect(runner.getAttribute("data-note")).toBe("");
  });

  it("shows a plain notice instead of a runner when the note is missing", () => {
    render(
      <ChatQuiz
        conversationId="conv-1"
        message={message([startPart({ ok: false, reason: "missing" })])}
      />,
    );

    expect(screen.queryByTestId("quiz-runner")).toBeNull();
    expect(screen.getByText(/could not start/i)).toBeDefined();
  });

  it("renders nothing without a startQuiz part", () => {
    const { container } = render(
      <ChatQuiz
        conversationId="conv-1"
        message={message([
          {
            type: "tool-drawVisual",
            state: "output-available",
            input: {},
            output: { ok: true },
          } as unknown as UIMessage["parts"][number],
        ])}
      />,
    );

    expect(container.textContent).toBe("");
  });

  it("renders nothing while the tool has no output yet", () => {
    const { container } = render(
      <ChatQuiz
        conversationId="conv-1"
        message={message([
          {
            type: "tool-startQuiz",
            state: "input-available",
            input: {},
          } as unknown as UIMessage["parts"][number],
        ])}
      />,
    );

    expect(container.textContent).toBe("");
  });
});
