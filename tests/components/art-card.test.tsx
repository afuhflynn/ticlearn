import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArtCard } from "@/components/art/art-card";

const mermaidRender = vi.hoisted(() => vi.fn());
const mermaidInitialize = vi.hoisted(() => vi.fn());

vi.mock("mermaid", () => ({
  default: { initialize: mermaidInitialize, render: mermaidRender },
}));

function scanItem() {
  return {
    kind: "scan" as const,
    pageNumber: 3,
    imageUrl: "/demo/page-3.svg",
    altText: "Page 3 figure from your note",
    total: 3,
  };
}

function svgItem(payload: string) {
  return {
    kind: "drawn" as const,
    id: "d1",
    format: "svg" as const,
    payload,
    altText: "A circle.",
    sourcePage: null as number | null,
    createdAt: new Date().toISOString(),
  };
}

function mermaidItem() {
  return {
    kind: "drawn" as const,
    id: "m1",
    format: "mermaid" as const,
    payload: "graph TD\n A-->B",
    altText: "Two boxes with an arrow.",
    sourcePage: null as number | null,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  mermaidRender.mockReset();
  mermaidInitialize.mockReset();
});

describe("ArtCard (spec 0030)", () => {
  it("shows the scan with its page tag and alt text (covers: AC-1)", () => {
    const { container } = render(
      <ArtCard item={scanItem()} caption="Page 3 figure from your note" />,
    );

    const img = screen.getByRole("img", {
      name: "Page 3 figure from your note",
    });
    expect(img).toHaveAttribute("src", "/demo/page-3.svg");
    expect(container.textContent).toContain("Page 3 ·");
  });

  it("strips scripts from rendered svg before it reaches the page (covers: AC-5)", () => {
    const { container } = render(
      <ArtCard
        item={svgItem(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="4"/></svg>',
        )}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("renders the mermaid diagram with plain text labels (covers: AC-4)", async () => {
    mermaidRender.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Ready queue</text></svg>',
    });

    render(<ArtCard item={mermaidItem()} />);

    expect(await screen.findByText("Ready queue")).toBeInTheDocument();
  });

  it("falls back to a compact notice when the diagram cannot render (covers: AC-4, AC-7)", async () => {
    mermaidRender.mockRejectedValue(new Error("parse error"));

    render(<ArtCard item={mermaidItem()} />);

    expect(
      await screen.findByText(/The diagram could not render\./),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Two boxes with an arrow\./)).toHaveLength(2);
  });
});
