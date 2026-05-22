import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const blueprint = await prisma.examBlueprint.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: "asc" } }, component: true },
    });
    if (!blueprint) return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Blueprint GET error:", error);
    return NextResponse.json({ error: "Failed to fetch blueprint" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const {
      name,
      description,
      totalMarks,
      durationMin,
      sections,
      visibleForStudents,
      visibleInCommunity,
    } = await req.json();

    if (sections) {
      const sectionsTotal = sections.reduce((s: number, sec: { totalMarks: number }) => s + sec.totalMarks, 0);
      if (sectionsTotal !== totalMarks) {
        return NextResponse.json({ error: `Section marks sum (${sectionsTotal}) != totalMarks (${totalMarks})` }, { status: 400 });
      }
    }

    const blueprint = await prisma.$transaction(async (tx) => {
      if (sections) await tx.blueprintSection.deleteMany({ where: { blueprintId: id } });

      return tx.examBlueprint.update({
        where: { id },
        data: {
          name,
          description,
          totalMarks,
          durationMin,
          ...(typeof visibleForStudents === "boolean" ? { visibleForStudents } : {}),
          ...(typeof visibleInCommunity === "boolean" ? { visibleInCommunity } : {}),
          ...(sections ? {
            sections: {
              create: sections.map((sec: { name: string; questionCount: number; marksPerQuestion?: number; totalMarks: number; questionType: string; answerRule?: string; order: number }) => ({
                name: sec.name,
                questionCount: sec.questionCount,
                marksPerQuestion: sec.marksPerQuestion ?? null,
                totalMarks: sec.totalMarks,
                questionType: sec.questionType as "MCQ" | "STRUCTURED" | "PRACTICAL" | "ESSAY",
                answerRule: sec.answerRule ?? null,
                order: sec.order,
              })),
            },
          } : {}),
        },
        include: { sections: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Blueprint PUT error:", error);
    return NextResponse.json({ error: "Failed to update blueprint" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data: {
      visibleForStudents?: boolean;
      visibleInCommunity?: boolean;
    } = {};
    if (typeof body.visibleForStudents === "boolean") {
      data.visibleForStudents = body.visibleForStudents;
    }
    if (typeof body.visibleInCommunity === "boolean") {
      data.visibleInCommunity = body.visibleInCommunity;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Provide visibleForStudents or visibleInCommunity as booleans" },
        { status: 400 },
      );
    }

    const blueprint = await prisma.examBlueprint.update({
      where: { id },
      data,
      include: {
        sections: { orderBy: { order: "asc" } },
        component: { include: { program: { include: { examLevel: true } } } },
      },
    });

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error("Blueprint PATCH error:", error);
    return NextResponse.json({ error: "Failed to update blueprint" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.examBlueprint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blueprint DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete blueprint" }, { status: 500 });
  }
}
