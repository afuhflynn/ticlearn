import { prisma } from "@/lib/prisma";

const MAX_CONTEXT_CHARS = 160_000;

/**
 * Builds a past-paper context block from approved Paper 3 sources.
 * Used to ground AI generation and tutor replies without re-scraping each time.
 */
export async function buildPaper3SourceContextBlock(options?: {
  sourceIds?: string[];
  subject?: "ICT" | "COMPUTER_SCIENCE";
  limit?: number;
}): Promise<string> {
  const limit = options?.limit ?? 16;

  const sources = await prisma.paper3Source.findMany({
    where: {
      status: "READY",
      ...(options?.subject ? { subject: options.subject } : {}),
      ...(options?.sourceIds?.length ? { id: { in: options.sourceIds } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      title: true,
      year: true,
      subject: true,
      section: true,
      category: true,
      fileUrl: true,
      fileName: true,
      extractedText: true,
      contentMarkdown: true,
      questions: {
        where: { status: "APPROVED" },
        take: 12,
        select: {
          title: true,
          questionNumber: true,
          content: true,
          expectedAnswer: true,
          marks: true,
          taskType: true,
        },
      },
    },
  });

  if (sources.length === 0) return "";

  const blocks = sources.map((source) => {
    const meta: string[] = [
      `### ${source.title} (${source.year}, ${source.subject}, section ${source.section})`,
    ];

    if (source.fileUrl?.trim()) {
      meta.push(
        `Attached file: ${source.fileName?.trim() || "upload"} — ${source.fileUrl.trim()}`,
      );
    }

    const body =
      source.extractedText?.trim() ||
      source.contentMarkdown?.trim() ||
      "(No extracted text — use approved question samples below.)";

    meta.push(body);

    if (source.questions.length > 0) {
      meta.push(
        "Approved question samples from this source:",
        ...source.questions.map(
          (q) =>
            `- Q${q.questionNumber} (${q.taskType}, ${q.marks}m): ${q.title}\n  Stem: ${q.content.slice(0, 400)}\n  Model: ${q.expectedAnswer.slice(0, 280)}`,
        ),
      );
    }

    return meta.join("\n");
  });

  const assembled = blocks.join("\n\n---\n\n");

  return assembled.length > MAX_CONTEXT_CHARS
    ? `${assembled.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated for length]`
    : assembled;
}
