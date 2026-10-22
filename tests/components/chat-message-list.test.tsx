import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChatMessageList } from "@/components/chat/chat-message-list";

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
  it("shows the thinking line until the first assistant token arrives", () => {
    const { rerender } = render(
      <ChatMessageList
        messages={[message("user", "Explain this")]}
        status="submitted"
      />,
    );

    expect(screen.getByText("Tip is thinking…")).toBeInTheDocument();

    rerender(
      <ChatMessageList
        messages={[message("assistant", "Here is the answer")]}
        status="streaming"
      />,
    );

    expect(screen.queryByText("Tip is thinking…")).not.toBeInTheDocument();
    expect(screen.getByText("Here is the answer")).toBeInTheDocument();
    expect(
      document.querySelector("[data-slot='streaming-caret']"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a retry action when the answer fails", async () => {
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
      screen.getByText(/That answer did not make it through/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
