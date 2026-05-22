import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** All GCE Paper components (Paper 1 & 2) for every programme — admin picks any subject. */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const programs = await prisma.program.findMany({
      where: { code: { not: "UNKNOWN" } },
      include: {
        examLevel: { select: { name: true } },
        components: {
          where: { type: "PAPER" },
          include: {
            topics: { orderBy: { order: "asc" } },
          },
          orderBy: { code: "asc" },
        },
      },
      orderBy: [{ examLevelId: "asc" }, { name: "asc" }],
    });

    const components: Array<{
      id: string;
      name: string;
      code: string;
      topics: Array<{ id: string; name: string }>;
      programId: string;
      programName: string;
      examLevelName: string;
    }> = [];

    const seen = new Set<string>();
    for (const prog of programs) {
      const levelName = prog.examLevel.name;
      for (const c of prog.components) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        components.push({
          id: c.id,
          name: c.name,
          code: c.code,
          topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
          programId: prog.id,
          programName: prog.name,
          examLevelName: levelName,
        });
      }
    }

    return NextResponse.json({ components });
  } catch (error) {
    console.error("Admin P1P2 mock options GET error:", error);
    return NextResponse.json(
      { error: "Failed to load components" },
      { status: 500 },
    );
  }
}
