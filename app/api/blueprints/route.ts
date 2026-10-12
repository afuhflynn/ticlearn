import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    // Get the profile's programs, then find component IDs for those programs
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

    // 1. Blueprints explicitly made visible for students
    const visibleBlueprints = await prisma.examBlueprint.findMany({
      where: {
        componentId: { in: [...programComponentIds] },
        visibleForStudents: true,
      },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    // 2. Also include blueprints that are in visible modules
    //    (safety net for the common case where visibleForStudents wasn't toggled)
    const moduleLinkedBlueprints = await prisma.examBlueprint.findMany({
      where: {
        componentId: { in: [...programComponentIds] },
        visibleForStudents: false,
        paper12ModuleItems: {
          some: { module: { visibleToStudents: true } },
        },
      },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    // Merge, dedup by id
    const seen = new Set<string>();
    const blueprints = [...visibleBlueprints, ...moduleLinkedBlueprints].filter(
      (bp) => {
        if (seen.has(bp.id)) return false;
        seen.add(bp.id);
        return true;
      },
    );

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("Blueprints GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 },
    );
  }
}
