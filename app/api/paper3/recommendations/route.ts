import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPaper3Subjects, getSubjectAllowedTaskTypes } from "@/lib/paper3/subject-tasks";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSubjects = await getUserPaper3Subjects(session.user.id);
    const allowedTaskTypes = getSubjectAllowedTaskTypes(userSubjects);

    const baseWhere: Record<string, unknown> = { status: "APPROVED" };
    if (allowedTaskTypes) {
      baseWhere.taskType = { in: allowedTaskTypes };
    }

    const userStats = await prisma.paper3UserStats.findFirst({
      where: { userId: session.user.id },
    });

    if (!userStats || userStats.weakConcepts.length === 0) {
      const randomQuestions = await prisma.paper3Question.findMany({
        where: baseWhere,
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        questions: randomQuestions,
        reason: "general",
      });
    }

    const questions = await prisma.paper3Question.findMany({
      where: {
        ...baseWhere,
        concepts: {
          hasSome: userStats.weakConcepts,
        },
      },
      take: 10,
    });

    if (questions.length < 10) {
      const additional = await prisma.paper3Question.findMany({
        where: {
          ...baseWhere,
          NOT: {
            id: { in: questions.map((q) => q.id) },
          },
        },
        take: 10 - questions.length,
      });
      return NextResponse.json({
        questions: [...questions, ...additional],
        reason: "weakness",
        weakConcepts: userStats.weakConcepts,
      });
    }

    return NextResponse.json({
      questions,
      reason: "weakness",
      weakConcepts: userStats.weakConcepts,
    });
  } catch (error) {
    console.error("Paper3 recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 },
    );
  }
}
