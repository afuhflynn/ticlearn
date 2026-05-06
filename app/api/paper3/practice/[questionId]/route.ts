import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;

    const question = await prisma.paper3Question.findFirst({
      where: { id: questionId, status: "APPROVED" },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        section: true,
        skillType: true,
        taskType: true,
        programmingLanguage: true,
        concepts: true,
        content: true,
        contentMd: true,
        marks: true,
        expectedAnswer: true,
        explanation: true,
        markingBreakdown: true,
        visualElements: true,
        taskItems: true,
        source: {
          select: {
            id: true,
            title: true,
            category: true,
            subject: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Paper3 practice question GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 },
    );
  }
}
