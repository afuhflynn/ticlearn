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
    const limit = parseInt(searchParams.get("limit") || "5");

    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: {
        id: true,
        quizTitle: true,
        score: true,
        correctAnswers: true,
        totalQuestions: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      attempts: recentAttempts.map((a) => ({
        ...a,
        completedAt: a.completedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Recent attempts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent attempts" },
      { status: 500 },
    );
  }
}
