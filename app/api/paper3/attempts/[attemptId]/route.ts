import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId, userId: session.user.id },
      include: {
        mock: {
          include: {
            questions: {
              include: {
                question: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Paper3 attempt GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
