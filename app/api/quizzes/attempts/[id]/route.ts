import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        answers: true,
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Attempt GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
