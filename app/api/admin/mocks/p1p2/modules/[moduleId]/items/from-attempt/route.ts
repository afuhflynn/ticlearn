import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseStoredSessionPayload,
} from "@/lib/mock-session-payload";
import type { QuestionType } from "@/lib/generated/prisma/enums";

const bodySchema = z.object({
  attemptId: z.string().min(1),
});

function mapQuestionType(raw: string): QuestionType {
  const u = raw?.toUpperCase() ?? "";
  if (u === "MCQ") return "MCQ";
  if (u === "STRUCTURED") return "STRUCTURED";
  if (u === "PRACTICAL") return "PRACTICAL";
  if (u === "ESSAY") return "ESSAY";
  return "STRUCTURED";
}

type RouteCtx = { params: Promise<{ moduleId: string }> };

/**
 * Create a catalog ExamBlueprint from an admin preview attempt’s session shape,
 * then attach it to the mock group. New student runs will re-sample the question bank
 * to match the blueprint sections (same as other preset mocks).
 */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { moduleId } = await ctx.params;
    const { attemptId } = bodySchema.parse(await req.json());

    const mod = await prisma.paper12MockModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!mod) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const profiles = await prisma.examProfile.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileIds = profiles.map((p) => p.id);

    const attempt = await prisma.mockAttempt.findFirst({
      where: {
        id: attemptId,
        creationContext: "ADMIN_PREVIEW",
        examProfileId: { in: profileIds },
      },
      select: {
        componentId: true,
        sessionPayload: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Preview attempt not found" }, { status: 404 });
    }

    const payload = parseStoredSessionPayload(attempt.sessionPayload);
    if (!payload?.sections?.length) {
      return NextResponse.json(
        { error: "Could not read mock structure from preview" },
        { status: 409 },
      );
    }

    let baseName = payload.displayName.trim().slice(0, 180) || "Imported mock";
    let suffix = 0;
    let name = baseName;
    // Ensure unique name per component
    for (;;) {
      const clash = await prisma.examBlueprint.findFirst({
        where: { componentId: attempt.componentId, name },
        select: { id: true },
      });
      if (!clash) break;
      suffix += 1;
      name = `${baseName} (${suffix})`.slice(0, 200);
    }

    const blueprint = await prisma.examBlueprint.create({
      data: {
        componentId: attempt.componentId,
        name,
        description: `Created from admin preview · ${new Date().toISOString().slice(0, 10)}`,
        totalMarks: payload.totalMarks,
        durationMin: payload.durationMin,
        visibleForStudents: true,
        visibleInCommunity: false,
        sections: {
          create: payload.sections.map((sec, i) => ({
            name: sec.name,
            questionCount: sec.questionCount,
            marksPerQuestion: sec.marksPerQuestion ?? null,
            totalMarks: sec.totalMarks,
            questionType: mapQuestionType(sec.questionType),
            answerRule: sec.answerRule ?? null,
            order: i + 1,
          })),
        },
      },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    const maxOrd = await prisma.paper12MockModuleItem.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrd._max.sortOrder ?? -1) + 1;

    await prisma.paper12MockModuleItem.create({
      data: {
        moduleId,
        blueprintId: blueprint.id,
        sortOrder,
      },
    });

    return NextResponse.json({ blueprint, ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    console.error("P1P2 from-attempt error:", error);
    return NextResponse.json(
      { error: "Could not add preview to group" },
      { status: 500 },
    );
  }
}
