import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

/**
 * Student catalog: named Paper 1 & 2 mock groups with exams the learner can start.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId) {
      return NextResponse.json({ error: "No active profile" }, { status: 400 });
    }

    const profilePrograms = await prisma.examProfileProgram.findMany({
      where: { examProfileId: profileId },
      include: {
        program: {
          select: { components: { select: { id: true } } },
        },
      },
    });

    const programComponentIds = new Set(
      profilePrograms.flatMap((pp) => pp.program.components.map((c) => c.id)),
    );

    const modules = await prisma.paper12MockModule.findMany({
      where: { visibleToStudents: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            blueprint: {
              include: { sections: { orderBy: { order: "asc" } } },
            },
          },
        },
      },
    });

    const out = modules
      .map((mod) => {
        const items = mod.items.filter((it) =>
          programComponentIds.has(it.blueprint.componentId),
        );
        return {
          id: mod.id,
          title: mod.title,
          description: mod.description,
          items: items.map((it) => ({
            id: it.id,
            blueprint: {
              id: it.blueprint.id,
              name: it.blueprint.name,
              description: it.blueprint.description,
              totalMarks: it.blueprint.totalMarks,
              durationMin: it.blueprint.durationMin,
              componentId: it.blueprint.componentId,
              sections: it.blueprint.sections.map((s) => ({
                name: s.name,
                questionCount: s.questionCount,
                totalMarks: s.totalMarks,
                questionType: s.questionType,
              })),
            },
          })),
        };
      })
      .filter((m) => m.items.length > 0);

    return NextResponse.json({ modules: out });
  } catch (error) {
    console.error("P1P2 modules catalog GET error:", error);
    return NextResponse.json(
      { error: "Could not load mock groups" },
      { status: 500 },
    );
  }
}
