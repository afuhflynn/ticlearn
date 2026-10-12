import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const blueprints = await prisma.examBlueprint.findMany({
      include: {
        component: { include: { program: { include: { examLevel: true } } } },
        sections: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("Blueprints GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const {
      componentId,
      name,
      description,
      totalMarks,
      durationMin,
      sections,
      visibleForStudents,
      visibleInCommunity,
    } = await req.json();

    if (
      !componentId ||
      !name ||
      !totalMarks ||
      !durationMin ||
      !sections?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const sectionsTotal = sections.reduce(
      (s: number, sec: { totalMarks: number }) => s + sec.totalMarks,
      0,
    );
    if (sectionsTotal !== totalMarks) {
      return NextResponse.json(
        {
          error: `Section marks sum (${sectionsTotal}) does not match totalMarks (${totalMarks})`,
        },
        { status: 400 },
      );
    }

    const blueprint = await prisma.examBlueprint.create({
      data: {
        componentId,
        name,
        description,
        totalMarks,
        durationMin,
        visibleForStudents: visibleForStudents !== false,
        visibleInCommunity: visibleInCommunity === true,
        sections: {
          create: sections.map(
            (sec: {
              name: string;
              questionCount: number;
              marksPerQuestion?: number;
              totalMarks: number;
              questionType: string;
              answerRule?: string;
              order: number;
            }) => ({
              name: sec.name,
              questionCount: sec.questionCount,
              marksPerQuestion: sec.marksPerQuestion ?? null,
              totalMarks: sec.totalMarks,
              questionType: sec.questionType as
                | "MCQ"
                | "STRUCTURED"
                | "PRACTICAL"
                | "ESSAY",
              answerRule: sec.answerRule ?? null,
              order: sec.order,
            }),
          ),
        },
      },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Blueprints POST error:", error);
    return NextResponse.json(
      { error: "Failed to create blueprint" },
      { status: 500 },
    );
  }
}
