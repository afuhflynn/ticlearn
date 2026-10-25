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
