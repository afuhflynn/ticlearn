import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateMockSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.enum(["ICT", "COMPUTER_SCIENCE"]).optional(),
  focusCategory: z
    .enum([
      "MIXED",
      "DATABASE",
      "SPREADSHEET",
      "PROGRAMMING",
      "WEB_PROGRAMMING",
    ])
    .optional(),
  timeLimit: z.number().int().min(30).max(180).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  totalMarks: z.number().int().min(1).optional(),
  questionIds: z.array(z.string()).min(1, "At least one question required").optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mockId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mockId } = await params;

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!mock) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    return NextResponse.json({ mock });
  } catch (error) {
    console.error("Paper3 mock GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mock" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ mockId: string }> },
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

    const { mockId } = await params;
    const data = updateMockSchema.parse(await req.json());

    const existing = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.focusCategory !== undefined) updateData.focusCategory = data.focusCategory;
    if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.totalMarks !== undefined) updateData.totalMarks = data.totalMarks;

    if (data.questionIds) {
      const questions = await prisma.paper3Question.findMany({
        where: { id: { in: data.questionIds } },
      });

      if (questions.length !== data.questionIds.length) {
        return NextResponse.json(
          { error: "Some questions not found" },
          { status: 400 },
        );
      }

      const totalMarks = data.totalMarks ?? questions.reduce((sum, q) => sum + q.marks, 0);

      const mock = await prisma.$transaction(async (tx) => {
        await tx.paper3MockQuestion.deleteMany({ where: { mockId } });

        return tx.paper3Mock.update({
          where: { id: mockId },
          data: {
            ...updateData,
            totalMarks,
            questions: {
              create: data.questionIds!.map((questionId, index) => ({
                questionId,
                order: index,
                marks: questions.find((q) => q.id === questionId)?.marks ?? 1,
              })),
            },
          },
          include: {
            questions: {
              include: { question: true },
              orderBy: { order: "asc" },
            },
          },
        });
      });

      return NextResponse.json({ mock, success: true });
    }

    const mock = await prisma.paper3Mock.update({
      where: { id: mockId },
      data: updateData,
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ mock, success: true });
  } catch (error) {
    console.error("Paper3 mock PUT error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update mock" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ mockId: string }> },
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

    const { mockId } = await params;

    const existing = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    await prisma.paper3Mock.delete({ where: { id: mockId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paper3 mock DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete mock" },
      { status: 500 },
    );
  }
}
