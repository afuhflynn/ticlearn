import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatArt } from "@/components/chat/chat-art";

const useNoteArt = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useArtifacts", () => ({
  useNoteArt: useNoteArt,
}));

function message(parts: UIMessage["parts"]): UIMessage {
  return { id: "m1", role: "assistant", parts };
}

function drawPart() {
  return {
    type: "tool-drawVisual",
    toolName: "drawVisual",
    state: "output-available",
    output: {
      ok: true,
      id: "draw-1",
      format: "mermaid",
      payload: "graph TD\n A-->B",
      altText: "Two boxes with an arrow.",
    },
  } as unknown as UIMessage["parts"][number];
}

beforeEach(() => {
  useNoteArt.mockReset();
  useNoteArt.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("ChatArt (spec 0030)", () => {
  it("shows the cited page scan beside the answer with its page tag (covers: AC-1)", () => {
    useNoteArt.mockReturnValue({
      data: {
        scans: [
          {
            kind: "scan" as const,
            pageNumber: 3,
            imageUrl: "/demo/page-3.svg",
            altText: "Page 3 figure from your note",
            total: 3,
          },
        ],
        drawn: [],
        total: 3,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <ChatArt
        message={message([{ type: "text", text: "hello" }])}
        text="From page 3 of your note, the time slice matters."
        noteId="n1"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Page 3 figure from your note" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Page 3 ·/)).toBeInTheDocument();
  });

  it("renders nothing when the answer cites no page and draws nothing (covers: AC-1)", () => {
    const { container } = render(
      <ChatArt
        message={message([{ type: "text", text: "hello" }])}
        text="Just words, no figures."
        noteId="n1"
      />,
    );

    expect(container.querySelector("figure")).toBeNull();
  });

  it("shows a fresh diagram from the draw tool beside the answer (covers: AC-4)", () => {
    render(
      <ChatArt
        message={message([drawPart()])}
        text="Here is the idea drawn."
        noteId={null}
      />,
    );

    expect(screen.getAllByText("Two boxes with an arrow.")).toHaveLength(2);
  });
});
