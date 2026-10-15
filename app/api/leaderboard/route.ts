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
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const page =
      Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(100, Math.floor(rawLimit))
        : 20;

    const skip = (page - 1) * limit;

    const myStats = await prisma.userStats.findFirst({
      where: { userId: session.user.id },
      select: { totalPoints: true },
    });
    const myPoints = myStats?.totalPoints ?? 0;

    const [leaderboard, total, betterCount] = await Promise.all([
      prisma.userStats.findMany({
        orderBy: [{ totalPoints: "desc" }, { userId: "asc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true },
          },
        },
        where: {
          user: { role: { not: "ADMIN" } },
        },
      }),
      prisma.userStats.count({
        where: {
          user: { role: { not: "ADMIN" } },
        },
      }),
      prisma.userStats.count({
        where: {
          user: { role: { not: "ADMIN" } },
          totalPoints: { gt: myPoints },
        },
      }),
    ]);

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
      currentUserRank: betterCount + 1,
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
