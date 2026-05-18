import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const componentId = searchParams.get("componentId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    });

    const where: Record<string, unknown> = {};

    if (componentId) {
      where.componentId = componentId;
    } else if (user?.activeProfileId) {
      const profile = await prisma.examProfile.findUnique({
        where: { id: user.activeProfileId },
        select: {
          programs: {
            select: {
              program: {
                select: {
                  components: { select: { id: true } },
                },
              },
            },
          },
        },
      });
      if (profile) {
        const componentIds = profile.programs.flatMap((p) =>
          p.program.components.map((c) => c.id),
        );
        if (componentIds.length > 0) {
          where.componentId = { in: componentIds };
        }
      }
    }

    if (
      type &&
      ["MCQ", "OPEN", "STRUCTURED", "PRACTICAL", "ESSAY"].includes(type)
    ) {
      where.type = type;
    }

    const questions = await prisma.question.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        type: true,
        difficulty: true,
        marks: true,
        section: true,
        componentId: true,
        topicId: true,
        examSourceId: true,
        sourceType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Questions practice GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice questions" },
      { status: 500 },
    );
  }
}
