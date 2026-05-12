import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    const profileFilter = { examProfileId: { not: null } };

    const [leaderboard, total] = await Promise.all([
      prisma.userStats.findMany({
        orderBy: { totalPoints: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true },
          },
        },
        where: {
          ...profileFilter,
          user: { role: { not: "ADMIN" } },
        },
      }),
      prisma.userStats.count({
        where: {
          ...profileFilter,
          user: { role: { not: "ADMIN" } },
        },
      }),
    ]);

    const currentUserRank = await prisma.userStats.count({
      where: {
        ...profileFilter,
        user: { role: { not: "ADMIN" } },
        totalPoints: {
          gt: (
            await prisma.userStats.findUnique({
              where: { userId: session.user.id },
              select: { totalPoints: true },
            })
          )?.totalPoints || 0,
        },
      },
    });

    return NextResponse.json({
      leaderboard: leaderboard.map((entry, index) => ({
        rank: skip + index + 1,
        userId: entry.user.id,
        userName: entry.user.name,
        userImage: entry.user.image,
        totalPoints: entry.totalPoints,
        quizzesTaken: entry.quizzesTaken,
        currentStreak: entry.currentStreak,
      })),
      currentUserRank: currentUserRank + 1,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
