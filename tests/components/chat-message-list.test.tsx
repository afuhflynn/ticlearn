import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function renderList(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(element, { wrapper });
}

describe("ChatMessageList", () => {
  it("shows the activity line from the moment send is pressed (covers: AC-1)", () => {
    const { rerender } = renderList(
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
    renderList(
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
    renderList(
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

    renderList(
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

    renderList(
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

  it("typesets delimited math through KaTeX instead of flat text", () => {
    renderList(
      <ChatMessageList
        messages={[
          message("user", "What is the permutation formula?"),
          message(
            "assistant",
            "The count is $P(n,r) = \\frac{n!}{(n-r)!}$ for ordered picks.",
          ),
        ]}
        status="ready"
      />,
    );

    expect(document.querySelector(".katex")).toBeInTheDocument();
  });

  it("leaves bare undelimited math as plain text, by design", () => {
    renderList(
      <ChatMessageList
        messages={[
          message("user", "What is the permutation formula?"),
          message("assistant", "The count is P(n,r) = n! / (n-r)! ordered."),
        ]}
        status="ready"
      />,
    );

    expect(document.querySelector(".katex")).not.toBeInTheDocument();
  });
});

describe("editing a question in place (covers: AC-22)", () => {
  it("edits the question where it sits and saves the new wording", async () => {
    const user = userEvent.setup();
    const onEditSubmit = vi.fn();
    const question = message("user", "Explain mitosis");

    renderList(
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

    renderList(
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
    renderList(
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

describe("clean activity plus true answer split (covers: AC-1, AC-2, AC-3, AC-8)", () => {
  const assistantWithParts = (
    id: string,
    parts: UIMessage["parts"],
  ): UIMessage => ({ id, role: "assistant", parts });

  it("renders clean teaching without echoed build sentences", () => {
    const answer = assistantWithParts("a-1", [
      {
        type: "text",
        text: "I will search the web for photosynthesis. Photosynthesis converts light to chemical energy.",
      } as unknown as UIMessage["parts"][number],
    ]);

    renderList(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        status="ready"
      />,
    );

    expect(
      screen.getByText(
        "Photosynthesis converts light to chemical energy.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/I will search the web/)).toBeNull();
  });

  it("keeps reasoning parts out of the answer text", () => {
    const answer = assistantWithParts("a-2", [
      {
        type: "reasoning",
        text: "Thinking through the steps",
      } as unknown as UIMessage["parts"][number],
      {
        type: "text",
        text: "The mitochondria produce ATP.",
      } as unknown as UIMessage["parts"][number],
    ]);

    renderList(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        status="ready"
      />,
    );

    expect(
      screen.getByText("The mitochondria produce ATP."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Thinking through the steps")).toBeNull();
  });

  it("shows one activity line above the answer when tools ran", () => {
    const answer = assistantWithParts("a-3", [
      {
        type: "tool-webSearch",
        toolCallId: "call-1",
        state: "output-available",
        input: { query: "kinematics" },
        output: { ok: true },
      } as unknown as UIMessage["parts"][number],
      {
        type: "text",
        text: "Kinematics describes motion.",
      } as unknown as UIMessage["parts"][number],
    ]);

    renderList(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        status="ready"
      />,
    );

    expect(
      document.querySelectorAll("[data-slot='activity-block']"),
    ).toHaveLength(1);
    expect(
      screen.getByText("Kinematics describes motion."),
    ).toBeInTheDocument();
  });

  it("shows the fallback line when the filter empties the answer", () => {
    const answer = assistantWithParts("a-4", [
      {
        type: "tool-webSearch",
        toolCallId: "call-1",
        state: "output-available",
        input: { query: "kinematics" },
        output: { ok: true },
      } as unknown as UIMessage["parts"][number],
      {
        type: "text",
        text: "Searching the web now.",
      } as unknown as UIMessage["parts"][number],
    ]);

    renderList(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        status="ready"
      />,
    );

    expect(
      screen.getByText("That work is detailed in the activity above."),
    ).toBeInTheDocument();
  });

  it("keeps clean teaching plus the stopped note when a stop follows echo", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const answer = assistantWithParts("a-5", [
      {
        type: "text",
        text: "Let me check that page. The mitochondria produce ATP.",
      } as unknown as UIMessage["parts"][number],
    ]);

    renderList(
      <ChatMessageList
        messages={[message("user", "Explain this"), answer]}
        onRetry={onRetry}
        status="ready"
        stoppedIds={new Set([answer.id])}
      />,
    );

    expect(
      screen.getByText("The mitochondria produce ATP."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Let me check that page/)).toBeNull();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledWith(answer.id);
  });
});
