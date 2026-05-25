import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

/**
 * Paper components (+ topics) for GCE mocks: all PAPER components for every programme
 * that shares your profile’s qualification level(s) (not limited to programmes you picked
 * in onboarding).
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const profilePrograms = await prisma.examProfileProgram.findMany({
      where: { examProfileId: profileId },
      include: {
        program: {
          select: { examLevelId: true },
        },
      },
    });

    const levelIds = [...new Set(profilePrograms.map((p) => p.program.examLevelId))];

    if (levelIds.length === 0) {
      return NextResponse.json({ components: [] });
    }

    const programsAtLevels = await prisma.program.findMany({
      where: { examLevelId: { in: levelIds }, code: { not: "UNKNOWN" } },
      include: {
        components: {
          where: { type: "PAPER" },
          include: {
            topics: { orderBy: { order: "asc" } },
          },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        topics: Array<{ id: string; name: string }>;
        programId: string;
        programName: string;
      }
    >();

    for (const prog of programsAtLevels) {
      const programName = prog.name;
      for (const c of prog.components) {
        if (!byId.has(c.id)) {
          byId.set(c.id, {
            id: c.id,
            name: c.name,
            code: c.code,
            programId: prog.id,
            programName,
            topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
          });
        }
      }
    }

    return NextResponse.json({
      components: [...byId.values()],
    });
  } catch (error) {
    console.error("Mock options GET error:", error);
    return NextResponse.json(
      { error: "Failed to load mock options" },
      { status: 500 },
    );
  }
}
