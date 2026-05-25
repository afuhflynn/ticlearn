import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

interface Paper3Subject {
  id: string;
  name: string;
  code: string;
}

const generateMockSchema = z.object({
  subject: z.enum(["ICT", "COMPUTER_SCIENCE"]).optional(),
  componentId: z.string().optional(),
  section: z.enum(["A", "B"]).optional(),
  focusCategory: z
    .enum([
      "MIXED",
      "DATABASE",
      "SPREADSHEET",
      "PROGRAMMING",
      "WEB_PROGRAMMING",
    ])
    .optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  timeLimit: z.number().int().min(30).max(180),
  questionCount: z.number().int().min(5).max(50),
  markDistribution: z
    .object({
      easy: z.number().int().min(0),
      medium: z.number().int().min(0),
      hard: z.number().int().min(0),
    })
    .optional(),
  sourceIds: z.array(z.string()).max(20).optional(),
  difficulty: z.enum(["foundation", "standard", "stretch"]).optional(),
  authorNotes: z.string().max(2000).optional(),
});

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

    const data = generateMockSchema.parse(await req.json());

    await inngest.send({
      name: "paper3/generate-mock",
      data: {
        subject: data.subject,
        componentId: data.componentId,
        section: data.section,
        focusCategory: data.focusCategory,
        title: data.title,
        description: data.description,
        timeLimit: data.timeLimit,
        questionCount: data.questionCount,
        markDistribution: data.markDistribution,
        sourceIds: data.sourceIds,
        difficulty: data.difficulty,
        authorNotes: data.authorNotes,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mock generation started. This may take a few minutes.",
    });
  } catch (error) {
    console.error("Paper3 mock generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to start mock generation" },
      { status: 500 },
    );
  }
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
    const subject = searchParams.get("subject") as Paper3Subject | null;
    const includeGenerated = searchParams.get("generated") === "true";

    const sources = await prisma.paper3Source.findMany({
      where: {
        subject: (subject as unknown) as "ICT" | "COMPUTER_SCIENCE" | undefined,
        status: "READY",
        ...(!includeGenerated && {
          sourceType: { not: "AI_GENERATED" },
        }),
      },
      select: {
        id: true,
        title: true,
        year: true,
        section: true,
        category: true,
        sourceType: true,
        status: true,
        updatedAt: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Paper3 sources GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}
