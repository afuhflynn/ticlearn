import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateStudentPracticeMock,
  type StudentMockScope,
  type StudentPaperMode,
} from "@/lib/mock-generator";
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
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const body = (await req.json()) as {
      componentId?: string;
      paper?: string;
      scope?: string;
      topicIds?: string[];
    };

    const componentId = body.componentId?.trim();
    const paperRaw = body.paper?.toUpperCase();
    const scopeRaw = body.scope?.toUpperCase();

    if (!componentId || !paperRaw || !scopeRaw) {
      return NextResponse.json(
        { error: "componentId, paper, and scope are required" },
        { status: 400 },
      );
    }

    let paper: StudentPaperMode;
    if (paperRaw === "PAPER_1" || paperRaw === "P1") paper = "PAPER_1";
    else if (paperRaw === "PAPER_2" || paperRaw === "P2") paper = "PAPER_2";
    else
      return NextResponse.json({ error: "Invalid paper selection" }, { status: 400 });

    let scope: StudentMockScope;
    if (scopeRaw === "FULL_SYLLABUS" || scopeRaw === "FULL") scope = "FULL_SYLLABUS";
    else if (scopeRaw === "TOPICS") scope = "TOPICS";
    else return NextResponse.json({ error: "Invalid scope" }, { status: 400 });

    if (
      scope === "TOPICS" &&
      (!body.topicIds || !Array.isArray(body.topicIds) || body.topicIds.length === 0)
    ) {
      return NextResponse.json(
        { error: "Pick one or more topics for topic-focused mocks" },
        { status: 400 },
      );
    }

    const links = await prisma.examProfileProgram.findMany({
      where: { examProfileId: profileId },
      select: {
        program: { select: { examLevelId: true } },
      },
    });

    const levelIds = [...new Set(links.map((l) => l.program.examLevelId))];
    const componentOk = await prisma.component.findFirst({
      where: {
        id: componentId,
        type: "PAPER",
        program: { examLevelId: { in: levelIds }, code: { not: "UNKNOWN" } },
      },
      select: { id: true },
    });

    if (!componentOk)
      return NextResponse.json({ error: "Unknown paper for your profile" }, { status: 403 });

    if (scope === "TOPICS" && body.topicIds?.length) {
      const distinct = [...new Set(body.topicIds)];
      const topics = await prisma.topic.findMany({
        where: { id: { in: distinct }, componentId },
      });
      if (topics.length !== distinct.length)
        return NextResponse.json({ error: "Invalid topic selection" }, { status: 400 });
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

    const mock = await generateStudentPracticeMock({
      examProfileId: profileId,
      componentId,
      paper,
      scope,
      topicIds:
        scope === "TOPICS" && body.topicIds?.length ? body.topicIds : undefined,
    });

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

    return NextResponse.json({
      mock: {
        attemptId: mock.attemptId,
        blueprint: mock.blueprint,
        sections: mock.sections,
        sourceMode: mock.sourceMode,
      },
    });
  } catch (error) {
    console.error("Student mock generate error:", error);
    return NextResponse.json(
      { error: "Could not generate this mock — try another scope or topic." },
      { status: 500 },
    );
  }
}
