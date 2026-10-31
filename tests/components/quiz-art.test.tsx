import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizArt } from "@/components/art/quiz-art";

const useNoteArt = vi.hoisted(() => vi.fn());
const useAnswerArt = vi.hoisted(() => vi.fn());
const generateMutate = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useArtifacts", () => ({
  useNoteArt: useNoteArt,
  useAnswerArt: useAnswerArt,
  useGenerateArt: () => ({ mutate: generateMutate, isPending: false }),
}));

function scan(pageNumber: number) {
  return {
    kind: "scan" as const,
    pageNumber,
    imageUrl: `/demo/page-${pageNumber}.svg`,
    altText: `Page ${pageNumber} figure from your note`,
    total: 3,
  };
}

beforeEach(() => {
  useNoteArt.mockReset();
  useAnswerArt.mockReset();
  generateMutate.mockReset();
  useNoteArt.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
  useAnswerArt.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("QuizArt (spec 0030)", () => {
  it("shows page cards in cited sourcePages order, not page number order (covers: AC-2)", () => {
    useNoteArt.mockReturnValue({
      data: { scans: [scan(1), scan(2), scan(3)], drawn: [], total: 3 },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <QuizArt noteId="n1" sourcePages={[2, 1, 3]} answerId="a1" concept="c" />,
    );

    const captions = screen
      .getAllByText(/Page \d ·/)
      .map((el) => el.textContent);
    expect(captions).toEqual([
      "Page 2 · Page 2 figure from your note",
      "Page 1 · Page 1 figure from your note",
      "Page 3 · Page 3 figure from your note",
    ]);
  });

  it("counts cited pages with no scan as overflow (covers: AC-2)", () => {
    useNoteArt.mockReturnValue({
      data: { scans: [scan(1), scan(2), scan(3)], drawn: [], total: 5 },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <QuizArt
        noteId="n1"
        sourcePages={[3, 1, 2, 4, 5]}
        answerId="a1"
        concept="c"
      />,
    );

    expect(
      screen.getByText("Plus 2 more pages in your note."),
    ).toBeInTheDocument();
  });

  it("shows drawn retry art with a draw again control (covers: AC-2)", () => {
    useAnswerArt.mockReturnValue({
      data: {
        drawn: [
          {
            kind: "drawn" as const,
            id: "d1",
            format: "svg" as const,
            payload: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            altText: "A circle.",
            sourcePage: null,
            createdAt: new Date().toISOString(),
          },
        ],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<QuizArt answerId="a1" concept="round robin" />);

    expect(screen.getAllByText("A circle.")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Draw again" }),
    ).toBeInTheDocument();
  });

  it("draws for the answer when asked (covers: AC-2)", async () => {
    const user = userEvent.setup();
    render(<QuizArt answerId="a1" concept="round robin" />);

    await user.click(screen.getByRole("button", { name: "Draw it for me" }));

    expect(generateMutate).toHaveBeenCalledWith(
      { answerId: "a1", concept: "round robin" },
      expect.anything(),
    );
  });
});
