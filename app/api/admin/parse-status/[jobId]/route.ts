import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    // Check if questions were created recently for this job
    // For Phase 2 flexible mode, we query the most recent questions
    const recentQuestions = await prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        text: true,
        type: true,
        marks: true,
        section: true,
      },
    });

    if (recentQuestions.length === 0) {
      return NextResponse.json({ status: "processing", jobId });
    }

    return NextResponse.json({
      status: "completed",
      jobId,
      questions: recentQuestions.map((q, i) => ({
        number: String(i + 1),
        text: q.text.substring(0, 200),
        marks: q.marks ?? 1,
        type: q.type,
      })),
    });
  } catch (error) {
    console.error("Parse status error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
