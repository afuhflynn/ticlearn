import { Prisma } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type QuestionStatus = "PENDING" | "APPROVED" | "REJECTED";
type Paper3Section = "A" | "B";
type Paper3TaskType =
  | "ACCESS_TABLE"
  | "ACCESS_RELATIONSHIP"
  | "ALGORITHM_PSEUDOCODE"
  | "C_PROGRAM"
  | "EXCEL_FORMULA"
  | "EXCEL_GRID"
  | "INPUT_FIELD"
  | "PASCAL_PROGRAM"
  | "SQL_QUERY"
  | "WEB_PROGRAMMING";

const updateQuestionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  contentMd: z.string().min(1).optional(),
  marks: z.number().int().min(1).max(20).optional(),
  expectedAnswer: z.string().min(1).optional(),
  markingBreakdown: z
    .union([
      z.string(),
      z.array(
        z.object({
          criteria: z.string(),
          marks: z.number(),
          description: z.string(),
        }),
      ),
    ])
    .optional(),
  explanation: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  visualElements: z.unknown().optional(),
  taskItems: z.unknown().optional(),
});

function parseMarkingBreakdown(
  value:
    | string
    | Array<{ criteria: string; marks: number; description: string }>
    | undefined,
) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;

  const parsed = JSON.parse(value) as Array<{
    criteria: string;
    marks: number;
    description: string;
  }>;
  return parsed;
}

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as QuestionStatus | null;
    const section = searchParams.get("section") as Paper3Section | null;
    const taskType = searchParams.get("taskType") as Paper3TaskType | null;
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Prisma.Paper3QuestionWhereInput = {};
    if (status) where.status = status as QuestionStatus;
    if (section) where.section = section as Paper3Section;
    if (taskType) where.taskType = taskType as Paper3TaskType;
    if (source) where.sourceId = source;
    if (subject) where.source = { subject: subject as "ICT" | "COMPUTER_SCIENCE" };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { questionNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category === "WEB_PROGRAMMING") {
      where.taskType = "WEB_PROGRAMMING" as Paper3TaskType;
    } else if (
      category &&
      ["DATABASE", "SPREADSHEET", "PROGRAMMING"].includes(category)
    ) {
      where.source = {
        category: category as "DATABASE" | "SPREADSHEET" | "PROGRAMMING",
      };
    }

    const [questions, total, sources] = await Promise.all([
      prisma.paper3Question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          source: {
            select: { id: true, title: true, year: true, subject: true },
          },
        },
      }),
      prisma.paper3Question.count({ where }),
      prisma.paper3Source.findMany({
        where: { status: "READY" },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]);

    return NextResponse.json({
      questions,
      sources,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Paper3 questions GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
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

    const data = updateQuestionSchema.parse(await req.json());
    const {
      id,
      title,
      content,
      contentMd,
      marks,
      expectedAnswer,
      markingBreakdown,
      explanation,
      concepts,
      visualElements,
      taskItems,
    } = data;

    const question = await prisma.paper3Question.update({
      where: { id },
      data: {
        title,
        content,
        contentMd,
        marks,
        expectedAnswer,
        markingBreakdown: parseMarkingBreakdown(markingBreakdown),
        explanation,
        concepts,
        visualElements: visualElements as Prisma.JsonObject,
        taskItems: taskItems as Prisma.JsonObject,
      },
    });

    return NextResponse.json({ question, success: true });
  } catch (error) {
    console.error("Paper3 question PUT error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 },
    );
  }
}
