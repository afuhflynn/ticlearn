import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

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
      where: { id: mockId, status: "PUBLISHED" },
      include: {
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

    if (!mock) {
      return NextResponse.json(
        { error: "Mock exam not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(_req.url);
    const retake = searchParams.get("retake") === "true";

    if (!retake) {
      const existingWhere = profileId
        ? { userId: session.user.id, mockId: mock.id, status: "IN_PROGRESS" as const }
        : { userId: session.user.id, mockId: mock.id, status: "IN_PROGRESS" as const };

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

    return NextResponse.json({ attempt, mock, resumed: false });
  } catch (error) {
    console.error("Paper3 mock start error:", error);
    return NextResponse.json(
      { error: "Failed to start exam" },
      { status: 500 },
    );
  }
}
