import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasRequiredVisuals(question: {
  taskType: string;
  visualElements: unknown;
}) {
  const visualElements = question.visualElements as {
    tables?: unknown[];
    arrays?: unknown[];
    codeBlocks?: unknown[];
  } | null;

  switch (question.taskType) {
    case "EXCEL_GRID":
      return (visualElements?.arrays?.length ?? 0) > 0;
    case "ACCESS_TABLE":
    case "ACCESS_RELATIONSHIP":
      return (visualElements?.tables?.length ?? 0) > 0;
    case "C_PROGRAM":
    case "PASCAL_PROGRAM":
      return (visualElements?.codeBlocks?.length ?? 0) > 0;
    default:
      return true;
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.paper3Question.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        contentMd: true,
        expectedAnswer: true,
        concepts: true,
        markingBreakdown: true,
        taskType: true,
        visualElements: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    if (
      !existing.title ||
      !existing.content ||
      !existing.contentMd ||
      !existing.expectedAnswer ||
      existing.concepts.length === 0 ||
      !Array.isArray(existing.markingBreakdown) ||
      existing.markingBreakdown.length === 0 ||
      !hasRequiredVisuals(existing)
    ) {
      return NextResponse.json(
        {
          error:
            "Question is not structurally valid for approval. Ensure markdown, marking breakdown, concepts, and required visuals are present.",
        },
        { status: 400 },
      );
    }

    const question = await prisma.paper3Question.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json({ question, success: true });
  } catch (error) {
    console.error("Paper3 question approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve question" },
      { status: 500 },
    );
  }
}
