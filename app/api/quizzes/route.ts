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
    const scope = searchParams.get("scope") || "all";
    const noteId = searchParams.get("noteId");

    const where =
      scope === "my"
        ? {
            userId: session.user.id,
            ...(noteId ? { noteId } : {}),
          }
        : scope === "public"
          ? {
              isPublic: true,
              status: "READY" as const,
              ...(noteId ? { noteId } : {}),
            }
          : {
              OR: [{ userId: session.user.id }, { isPublic: true }],
              ...(noteId ? { noteId } : {}),
            };

    const quizzes = await prisma.quiz.findMany({
      where,
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
        isOwner: quiz.userId === session.user.id,
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
