import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { FALLBACK_ACTIVITY_LABEL } from "@/lib/chat/activity-labels";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;
});

const message = (role: UIMessage["role"], text: string): UIMessage => ({
  id: `${role}-1`,
  role,
  parts: [{ type: "text", text }],
});

describe("ChatMessageList", () => {
  it("shows the activity line from the moment send is pressed (covers: AC-1)", () => {
    const { rerender } = render(
      <ChatMessageList
        messages={[message("user", "Explain this")]}
        status="submitted"
      />,
    );

    expect(
      screen.getByRole("button", { name: FALLBACK_ACTIVITY_LABEL }),
    ).toBeInTheDocument();

    rerender(
      <ChatMessageList
        messages={[
          message("user", "Explain this"),
          message("assistant", "Here is the answer"),
        ]}
        status="streaming"
      />,
    );

    expect(screen.getByText("Here is the answer")).toBeInTheDocument();
    expect(
      document.querySelector("[data-slot='streaming-caret']"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("draws no activity line once an answer finished with no steps (covers: AC-3)", () => {
    render(
      <ChatMessageList
        messages={[
          message("user", "Explain this"),
          message("assistant", "Here is the answer"),
        ]}
        status="ready"
      />,
    );

    expect(
      document.querySelector("[data-slot='activity-block']"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Here is the answer")).toBeInTheDocument();
  });

  it("shows a retry action when the answer fails (covers: AC-17)", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ChatMessageList
        messages={[message("user", "Explain this")]}
        onRetry={onRetry}
        status="error"
      />,
    );

    expect(
      screen.getByText(/The connection dropped before that answer finished/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("marks a stopped answer and retries it by its own id (covers: AC-6)", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const answer = message("assistant", "Half an answer");

    render(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        onRetry={onRetry}
        status="ready"
        stoppedIds={new Set([answer.id])}
      />,
    );

    expect(screen.getByText("Stopped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledWith(answer.id);
  });

  it("renders suggested questions and sends the one tapped (covers: AC-23)", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();

    render(
      <ChatMessageList
        messages={[
          message("user", "Explain this"),
          message("assistant", "Here is the answer"),
        ]}
        onSuggestion={onSuggestion}
        status="ready"
        suggestions={["Explain the chain rule with an example"]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /Explain the chain rule with an example/,
      }),
    );
    expect(onSuggestion).toHaveBeenCalledWith(
      "Explain the chain rule with an example",
    );
  });
});

describe("editing a question in place (covers: AC-22)", () => {
  it("edits the question where it sits and saves the new wording", async () => {
    const user = userEvent.setup();
    const onEditSubmit = vi.fn();
    const question = message("user", "Explain mitosis");

    render(
      <ChatMessageList
        messages={[question, message("assistant", "Here is the answer")]}
        onEditSubmit={onEditSubmit}
        status="ready"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit question" }));

    const editor = screen.getByRole("textbox", {
      name: "Edit your question",
    });
    expect(editor).toHaveValue("Explain mitosis");

    await user.clear(editor);
    await user.type(editor, "Explain meiosis");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onEditSubmit).toHaveBeenCalledWith(question, "Explain meiosis");
    expect(
      screen.queryByRole("textbox", { name: "Edit your question" }),
    ).not.toBeInTheDocument();
  });

  it("closes the editor on cancel without sending anything", async () => {
    const user = userEvent.setup();
    const onEditSubmit = vi.fn();

    render(
      <ChatMessageList
        messages={[message("user", "Explain mitosis")]}
        onEditSubmit={onEditSubmit}
        status="ready"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit question" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("textbox", { name: "Edit your question" }),
    ).not.toBeInTheDocument();
    expect(onEditSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Explain mitosis")).toBeInTheDocument();
  });

  it("does not offer an edit while an answer is streaming", () => {
    render(
      <ChatMessageList
        messages={[message("user", "Explain mitosis")]}
        status="streaming"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Edit question" }),
    ).toBeDisabled();
  });
});
