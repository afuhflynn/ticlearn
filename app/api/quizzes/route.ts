import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isPublic: true }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        note: {
          select: { id: true, title: true },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    return NextResponse.json({
      quizzes: quizzes.map((quiz) => ({
        ...quiz,
        attemptCount: quiz._count.attempts,
      })),
    });
  } catch (error) {
    console.error("Quizzes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 },
    );
  }
}
