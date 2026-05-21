import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";
import {
  creditEnforcementEffective,
  getPlatformSettings,
  maxAffordableMockQuestions,
  mockCreditCost,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";
import { canStudentAccessPublishedMock } from "@/lib/paper3/mock-access";
import { getUserPaper3Subjects } from "@/lib/paper3/subject-tasks";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ mockId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mockId } = await params;
    const profileId = await getActiveProfileId(session.user.id);

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
      include: {
        module: {
          select: {
            id: true,
            status: true,
            visibleToAllStudents: true,
          },
        },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                questionNumber: true,
                title: true,
                content: true,
                contentMd: true,
                marks: true,
                taskType: true,
                programmingLanguage: true,
                visualElements: true,
                taskItems: true,
                explanation: true,
                concepts: true,
                requireAnswer: true,
              },
            },
          },
        },
      },
    });

    if (!mock || mock.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Mock exam not found" },
        { status: 404 },
      );
    }

    const subjects = await getUserPaper3Subjects(session.user.id);
    if (!canStudentAccessPublishedMock(mock, subjects)) {
      return NextResponse.json(
        { error: "You do not have access to this mock." },
        { status: 403 },
      );
    }

    const settings = await getPlatformSettings();
    const enforcement = creditEnforcementEffective(settings);
    const questionCount = mock.questions.length;

    if (enforcement.mocks) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      const balance = user?.credits ?? 0;
      const requiredCredits = mockCreditCost(questionCount, settings);
      const maxAffordable = maxAffordableMockQuestions(balance, settings);

      if (maxAffordable < settings.mockMinQuestions) {
        return NextResponse.json(
          {
            error: `Insufficient credits. You need at least ${mockCreditCost(settings.mockMinQuestions, settings)} credits for a mock exam.`,
            balance,
            requiredCredits,
            maxAffordableQuestions: maxAffordable,
            questionCount,
          },
          { status: 402 },
        );
      }

      if (balance < requiredCredits) {
        return NextResponse.json(
          {
            error: `Insufficient credits for this mock (${questionCount} questions).`,
            balance,
            requiredCredits,
            maxAffordableQuestions: maxAffordable,
            questionCount,
            partialAllowed: maxAffordable >= settings.mockMinQuestions,
          },
          { status: 402 },
        );
      }
    }

    const { searchParams } = new URL(_req.url);
    const retake = searchParams.get("retake") === "true";

    if (!retake) {
      const existingWhere = profileId
        ? { userId: session.user.id, mockId: mock.id, status: "IN_PROGRESS" as const, examProfileId: profileId }
        : { userId: session.user.id, mockId: mock.id, status: "IN_PROGRESS" as const, examProfileId: null };

      const existingAttempt = await prisma.paper3MockAttempt.findFirst({
        where: existingWhere,
      });

      if (existingAttempt) {
        return NextResponse.json({
          attempt: existingAttempt,
          mock,
          resumed: true,
        });
      }
    }

    const attempt = await prisma.paper3MockAttempt.create({
      data: {
        userId: session.user.id,
        ...(profileId ? { examProfileId: profileId } : {}),
        mockId: mock.id,
        score: 0,
        totalMarks: mock.totalMarks,
        answers: {},
        results: [],
        status: "IN_PROGRESS",
      },
    });

    if (enforcement.mocks && questionCount > 0) {
      try {
        await spendCredits({
          userId: session.user.id,
          amount: mockCreditCost(questionCount, settings),
          type: "MOCK_EXAM",
          description: `Mock exam: ${mock.title} (${questionCount} questions)`,
          referenceId: attempt.id,
        });
      } catch (error) {
        await prisma.paper3MockAttempt.delete({ where: { id: attempt.id } });

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

    return NextResponse.json({ attempt, mock, resumed: false });
  } catch (error) {
    console.error("Paper3 mock start error:", error);
    return NextResponse.json(
      { error: "Failed to start exam" },
      { status: 500 },
    );
  }
}
