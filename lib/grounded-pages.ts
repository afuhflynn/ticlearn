import { prisma } from "@/lib/prisma";

export type GroundedPageInput = {
  pageNumber: number;
  visualType: string;
  description: string;
  confidence: number | null;
};

export async function getGroundedPageInputs(
  noteId: string,
): Promise<GroundedPageInput[]> {
  const pages = await prisma.page.findMany({
    where: { noteId },
    orderBy: { pageNumber: "asc" },
    include: {
      analyses: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const inputs: GroundedPageInput[] = [];
  for (const page of pages) {
    const analysis = page.analyses[0];
    if (!analysis) continue;
    if (!analysis.description || analysis.description.trim().length === 0)
      continue;
    inputs.push({
      pageNumber: page.pageNumber,
      visualType: analysis.visualType,
      description: analysis.description.slice(0, 1200),
      confidence: analysis.confidence,
    });
  }
  return inputs;
}

export function formatPageContext(inputs: GroundedPageInput[]): string {
  if (inputs.length === 0) return "No analyzed pages for this note.";
  return inputs
    .map((p) => {
      const conf =
        typeof p.confidence === "number"
          ? ` (confidence ${p.confidence.toFixed(2)})`
          : "";
      return `Page ${p.pageNumber} [${p.visualType}]${conf}: ${p.description}`;
    })
    .join("\n");
}
