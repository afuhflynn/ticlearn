import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  MockStatus,
  Paper3Subject,
} from "./../../../../lib/generated/prisma/enums";

const createMockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.enum(["ICT", "COMPUTER_SCIENCE"]),
  focusCategory: z
    .enum([
      "MIXED",
      "DATABASE",
      "SPREADSHEET",
      "PROGRAMMING",
      "WEB_PROGRAMMING",
    ])
    .optional(),
  timeLimit: z.number().int().min(30).max(180),
  questionIds: z.array(z.string()).min(1, "At least one question required"),
});

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
    const subject = searchParams.get("subject") as Paper3Subject | null;
    const status = searchParams.get("status") as MockStatus | null;
    const focusCategory = searchParams.get("focusCategory");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: {
      subject?: Paper3Subject;
      status?: MockStatus;
      focusCategory?:
        | "MIXED"
        | "DATABASE"
        | "SPREADSHEET"
        | "PROGRAMMING"
        | "WEB_PROGRAMMING";
    } = {};
    if (subject) where.subject = subject;
    if (status) where.status = status;
    if (
      focusCategory &&
      [
        "MIXED",
        "DATABASE",
        "SPREADSHEET",
        "PROGRAMMING",
        "WEB_PROGRAMMING",
      ].includes(focusCategory)
    ) {
      where.focusCategory = focusCategory as NonNullable<
        typeof where.focusCategory
      >;
    }

    const [mocks, total] = await Promise.all([
      prisma.paper3Mock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          questions: {
            include: {
              question: {
                select: { id: true, title: true, marks: true, taskType: true },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { attempts: true },
          },
        },
      }),
      prisma.paper3Mock.count({ where }),
    ]);

    return NextResponse.json({
      mocks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Paper3 mocks GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    const data = createMockSchema.parse(await req.json());

    const questions = await prisma.paper3Question.findMany({
      where: { id: { in: data.questionIds } },
    });

    if (questions.length !== data.questionIds.length) {
      return NextResponse.json(
        { error: "Some questions not found" },
        { status: 400 },
      );
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const focusCategory =
      data.focusCategory ??
      (() => {
        const taskTypes = new Set(
          questions.map((question) => question.taskType),
        );
        if (taskTypes.size > 1) return "MIXED";
        const taskType = questions[0]?.taskType;
        if (taskType === "WEB_PROGRAMMING") return "WEB_PROGRAMMING";
        if (taskType?.startsWith("EXCEL_")) return "SPREADSHEET";
        if (taskType === "SQL_QUERY" || taskType?.startsWith("ACCESS_")) {
          return "DATABASE";
        }
        return "PROGRAMMING";
      })();

    const mock = await prisma.paper3Mock.create({
      data: {
        title: data.title,
        description: data.description,
        subject: data.subject,
        focusCategory,
        timeLimit: data.timeLimit,
        totalMarks,
        createdBy: session.user.id,
        status: "DRAFT",
        questions: {
          create: data.questionIds.map((questionId, index) => ({
            questionId,
            order: index,
            marks: questions.find((q) => q.id === questionId)?.marks ?? 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    return NextResponse.json({ mock, success: true });
  } catch (error) {
    console.error("Paper3 mocks POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create mock" },
      { status: 500 },
    );
  }
}
