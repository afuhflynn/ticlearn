import { describe, expect, it } from "vitest";
import { groupArtByPage, orderScansByPages } from "@/components/art/grouping";
import type { DrawnArt, ScanArt } from "@/hooks/useArtifacts";

function scan(pageNumber: number): ScanArt {
  return {
    kind: "scan",
    pageNumber,
    imageUrl: `/demo/page-${pageNumber}.svg`,
    altText: `Page ${pageNumber} figure from your note`,
    total: 3,
  };
}

function drawn(id: string, sourcePage: number | null): DrawnArt {
  return {
    kind: "drawn",
    id,
    format: "mermaid",
    payload: "graph TD\n A-->B",
    altText: `Diagram ${id}`,
    sourcePage,
    createdAt: new Date().toISOString(),
  };
}

describe("groupArtByPage", () => {
  it("keeps one section per page in reading order with drawn underneath", () => {
    const { sections, unassigned } = groupArtByPage(
      [scan(3), scan(1)],
      [drawn("a", 3), drawn("b", 1)],
    );
    expect(sections.map((s) => s.pageNumber)).toEqual([1, 3]);
    expect(sections[0]?.drawn.map((d) => d.id)).toEqual(["b"]);
    expect(sections[1]?.drawn.map((d) => d.id)).toEqual(["a"]);
    expect(unassigned).toEqual([]);
  });

  it("parks drawn art with no page or no section in unassigned", () => {
    const { sections, unassigned } = groupArtByPage(
      [scan(1)],
      [drawn("a", null), drawn("b", 9)],
    );
    expect(sections).toHaveLength(1);
    expect(unassigned.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("caps sections and reports the overflow", () => {
    const scans = Array.from({ length: 15 }, (_, i) => scan(i + 1));
    const { sections, overflow } = groupArtByPage(scans, [], 12);
    expect(sections).toHaveLength(12);
    expect(overflow).toBe(3);
  });
});

describe("orderScansByPages", () => {
  it("follows the cited page order instead of page number order", () => {
    const ordered = orderScansByPages([scan(1), scan(2), scan(3)], [2, 1, 3]);
    expect(ordered.map((s) => s.pageNumber)).toEqual([2, 1, 3]);
  });

  it("drops cited pages with no scan and keeps the rest in order", () => {
    const ordered = orderScansByPages([scan(3), scan(1)], [3, 9, 1]);
    expect(ordered.map((s) => s.pageNumber)).toEqual([3, 1]);
  });
});
