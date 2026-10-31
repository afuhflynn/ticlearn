import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteArt } from "@/components/art/note-art";

const useNoteArt = vi.hoisted(() => vi.fn());
const generateMutate = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useArtifacts", () => ({
  useNoteArt: useNoteArt,
  useGenerateArt: () => ({ mutate: generateMutate, isPending: false }),
}));

function scan(pageNumber: number) {
  return {
    kind: "scan" as const,
    pageNumber,
    imageUrl: `/demo/page-${pageNumber}.svg`,
    altText: `Page ${pageNumber} figure from your note`,
    total: 2,
  };
}

beforeEach(() => {
  useNoteArt.mockReset();
  generateMutate.mockReset();
  useNoteArt.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("NoteArt (spec 0030)", () => {
  it("groups each page scan with its own drawn art under an anchored section (covers: AC-3)", () => {
    useNoteArt.mockReturnValue({
      data: {
        scans: [scan(1), scan(2)],
        drawn: [
          {
            kind: "drawn" as const,
            id: "d1",
            format: "svg" as const,
            payload: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            altText: "Page one diagram.",
            sourcePage: 1,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 2,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(<NoteArt noteId="n1" />);

    expect(screen.getByRole("link", { name: "p. 1" })).toHaveAttribute(
      "href",
      "#note-page-1",
    );
    expect(screen.getByRole("link", { name: "p. 2" })).toHaveAttribute(
      "href",
      "#note-page-2",
    );
    expect(container.querySelector("#note-page-1")).not.toBeNull();
    expect(container.querySelector("#note-page-2")).not.toBeNull();
    const sectionOne = container.querySelector("#note-page-1");
    expect(sectionOne?.textContent).toContain("Page one diagram.");
  });

  it("parks unassigned art under Other diagrams so nothing disappears (covers: AC-3)", () => {
    useNoteArt.mockReturnValue({
      data: {
        scans: [scan(1)],
        drawn: [
          {
            kind: "drawn" as const,
            id: "d9",
            format: "svg" as const,
            payload: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            altText: "Free idea.",
            sourcePage: null,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<NoteArt noteId="n1" />);

    expect(screen.getByText("Other diagrams")).toBeInTheDocument();
    expect(screen.getAllByText("Free idea.").length).toBeGreaterThan(0);
  });

  it("asks for the named idea when the student draws (covers: AC-4)", async () => {
    const user = userEvent.setup();
    useNoteArt.mockReturnValue({
      data: { scans: [], drawn: [], total: 0 },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<NoteArt noteId="n1" />);

    const draw = screen.getByRole("button", { name: "Draw it" });
    expect(draw).toBeDisabled();

    await user.type(screen.getByLabelText("Idea to draw"), "field lines");
    await user.click(screen.getByRole("button", { name: "Draw it" }));

    expect(generateMutate).toHaveBeenCalledWith(
      { noteId: "n1", concept: "field lines" },
      expect.anything(),
    );
  });
});
