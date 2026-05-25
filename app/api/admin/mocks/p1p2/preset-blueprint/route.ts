import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STUDENT_MOCK_PRESETS } from "@/lib/mock-generator";

const schema = z.object({
  componentId: z.string().min(1),
  paper: z.enum(["PAPER_1", "PAPER_2", "P1", "P2"]),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibleForStudents: z.boolean().optional(),
  visibleInCommunity: z.boolean().optional(),
  /** When set, the exam is linked to this Paper 1/2 group (and hidden from the flat Practice list unless `alsoListInPracticeCatalog`). */
  moduleId: z.string().optional(),
  /** If a `moduleId` is set, turn this on to also list the exam under "More mocks". */
  alsoListInPracticeCatalog: z.boolean().optional(),
});

/**
 * Create a standard Paper 1 / Paper 2 blueprint (same shape as student "bespoke" mocks)
 * so you can list it for students/community without manual section math.
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = schema.parse(await req.json());
    const paper =
      body.paper === "P1" || body.paper === "PAPER_1" ? "PAPER_1" : "PAPER_2";
    const preset =
      paper === "PAPER_1"
        ? STUDENT_MOCK_PRESETS.PAPER_1
        : STUDENT_MOCK_PRESETS.PAPER_2;

    const comp = await prisma.component.findFirst({
      where: { id: body.componentId, type: "PAPER" },
      select: { id: true },
    });
    if (!comp) {
      return NextResponse.json({ error: "Unknown paper component" }, { status: 400 });
    }

    const moduleId = body.moduleId?.trim();
    if (moduleId) {
      const moduleOk = await prisma.paper12MockModule.findUnique({
        where: { id: moduleId },
        select: { id: true },
      });
      if (!moduleOk) {
        return NextResponse.json({ error: "Unknown mock group" }, { status: 400 });
      }
    }

    const alsoList =
      moduleId && body.alsoListInPracticeCatalog === true ? true : false;
    const visibleForStudents = moduleId
      ? alsoList
        ? body.visibleForStudents !== false
        : false
      : body.visibleForStudents !== false;
    const visibleInCommunity = moduleId
      ? alsoList
        ? body.visibleInCommunity === true
        : false
      : body.visibleInCommunity === true;

    try {
      const blueprint = await prisma.examBlueprint.create({
        data: {
          componentId: body.componentId,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          totalMarks: preset.nominalTotalMarks,
          durationMin: preset.baseDurationMin,
          visibleForStudents,
          visibleInCommunity,
          sections: {
            create: [
              {
                name: preset.sectionName,
                questionCount: preset.baseQuestionCount,
                marksPerQuestion: preset.marksPerQuestion,
                totalMarks: preset.nominalTotalMarks,
                questionType: preset.questionType,
                answerRule: null,
                order: 1,
              },
            ],
          },
        },
        include: { sections: { orderBy: { order: "asc" } } },
      });

      if (moduleId) {
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
      }

      return NextResponse.json({ blueprint });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
        return NextResponse.json(
          {
            error:
              "A blueprint with this name already exists for this subject paper. Choose another name.",
          },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    console.error("Admin P1P2 preset-blueprint error:", error);
    return NextResponse.json(
      { error: "Failed to create blueprint" },
      { status: 500 },
    );
  }
}
