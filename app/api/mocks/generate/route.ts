import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMockFromBlueprint } from "@/lib/mock-generator";
import { getActiveProfileId } from "@/lib/exam-profile";
import {
  getPlatformSettings,
  practiceMockGenerationCreditsRequired,
} from "@/lib/platform-settings";
import {
  getEffectiveCreditCost,
  getUserCreditBalance,
  InsufficientCreditsError,
  spendCredits,
} from "@/lib/credits";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { blueprintId } = await req.json();
    if (!blueprintId) return NextResponse.json({ error: "blueprintId is required" }, { status: 400 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId) return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const blueprint = await prisma.examBlueprint.findUnique({
      where: { id: blueprintId },
      select: {
        componentId: true,
        visibleForStudents: true,
        visibleInCommunity: true,
      },
    });

    if (!blueprint) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
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

    const hasProgramMatch = programComponentIds.has(blueprint.componentId);

    const inVisibleModule = await prisma.paper12MockModuleItem.findFirst({
      where: {
        blueprintId,
        module: { visibleToStudents: true },
      },
      select: { id: true },
    });

    if (
      !blueprint.visibleForStudents &&
      !blueprint.visibleInCommunity &&
      !inVisibleModule
    ) {
      return NextResponse.json(
        { error: "This mock blueprint is inactive" },
        { status: 403 },
      );
    }

    const matchesStudentSubjects =
      blueprint.visibleForStudents && hasProgramMatch;

    const allowedViaCommunity = blueprint.visibleInCommunity === true;

    const allowedViaModule = !!inVisibleModule && hasProgramMatch;

    if (!matchesStudentSubjects && !allowedViaCommunity && !allowedViaModule) {
      return NextResponse.json(
        { error: "This mock is not available for your program" },
        { status: 403 },
      );
    }

    const settings = await getPlatformSettings();
    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    const wantsDebit = practiceMockGenerationCreditsRequired(settings);
    const genCost = getEffectiveCreditCost(
      settings.creditCostMockGeneration,
      subscription?.plan ?? null,
      settings,
    );

    if (wantsDebit) {
      const balance = await getUserCreditBalance(session.user.id);
      if (balance < genCost) {
        return NextResponse.json(
          {
            error: `Insufficient credits. Need ${genCost} credits to generate this mock.`,
            balance,
            requiredCredits: genCost,
          },
          { status: 402 },
        );
      }
    }

    const mock = await generateMockFromBlueprint(blueprintId, profileId);

    if (wantsDebit) {
      try {
        await spendCredits({
          userId: session.user.id,
          amount: genCost,
          type: "MOCK_GENERATION",
          description: `Practice mock: ${mock.blueprint.name}`,
          referenceId: mock.attemptId,
        });
      } catch (error) {
        await prisma.mockAttempt.delete({ where: { id: mock.attemptId } }).catch(
          () => {},
        );
        if (error instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: error.message,
              balance: error.balance,
              requiredCredits: error.required,
            },
            { status: 402 },
          );
        }
        throw error;
      }
    }

    return NextResponse.json({ mock });
  } catch (error) {
    console.error("Mock generate error:", error);
    return NextResponse.json({ error: "Failed to generate mock" }, { status: 500 });
  }
}
