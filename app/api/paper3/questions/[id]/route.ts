import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const { id } = await params;

    const question = await prisma.paper3Question.findUnique({
      where: { id },
      include: {
        source: {
          select: { id: true, title: true, year: true, subject: true },
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
    console.error("Paper3 question GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
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
    const body = await req.json();

    const question = await prisma.paper3Question.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        contentMd: body.contentMd,
        marks: body.marks,
        expectedAnswer: body.expectedAnswer,
        markingBreakdown:
          typeof body.markingBreakdown === "string"
            ? JSON.parse(body.markingBreakdown)
            : body.markingBreakdown,
        explanation: body.explanation,
        concepts: body.concepts,
        visualElements: body.visualElements,
        taskItems: body.taskItems,
      },
    });

    return NextResponse.json({ question, success: true });
  } catch (error) {
    console.error("Paper3 question PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 },
    );
  }
}
