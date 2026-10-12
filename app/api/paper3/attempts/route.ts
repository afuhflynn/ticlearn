import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileId = await getActiveProfileId(session.user.id);
    const whereFilter = profileId
      ? { examProfileId: profileId }
      : { userId: session.user.id };

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      prisma.paper3MockAttempt.findMany({
        where: { ...whereFilter, status: "COMPLETED" },
        skip,
        take: limit,
        orderBy: { completedAt: "desc" },
        include: {
          mock: {
            select: {
              id: true,
              title: true,
              subject: true,
              totalMarks: true,
              timeLimit: true,
            },
          },
        },
      }),
      prisma.paper3MockAttempt.count({
        where: { ...whereFilter, status: "COMPLETED" },
      }),
    ]);

    const groupedByMock: Record<
      string,
      {
        mockId: string;
        mockTitle: string;
        mockSubject: string;
        attempts: Array<{
          id: string;
          score: number;
          totalMarks: number;
          timeTaken: number | null;
          completedAt: Date | null;
        }>;
      }
    > = {};

    for (const attempt of attempts) {
      const mockId = attempt.mockId;
      if (!groupedByMock[mockId]) {
        groupedByMock[mockId] = {
          mockId: attempt.mock.id,
          mockTitle: attempt.mock.title,
          mockSubject: attempt.mock.subject,
          attempts: [],
        };
      }
      groupedByMock[mockId].attempts.push({
        id: attempt.id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
      });
    }

    const grouped = Object.values(groupedByMock);

    return NextResponse.json({
      attempts,
      grouped,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Paper3 my attempts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts" },
      { status: 500 },
    );
  }
}
