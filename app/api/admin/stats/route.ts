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

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalUsers,
      totalNotes,
      totalQuizzes,
      totalExams,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      avgRating,
      recentFeedback,
      pendingAffiliates,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.note.count(),
      prisma.quiz.count(),
      prisma.examSession.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.aggregate({ _sum: { amount: true } }),
      prisma.rating.aggregate({ _avg: { score: true } }),
      prisma.feedback.count({ where: { status: "OPEN" } }),
      prisma.affiliate.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalNotes,
        totalQuizzes,
        totalExams,
        totalSubscriptions,
        activeSubscriptions,
        totalRevenue: totalRevenue._sum.amount || 0,
        avgRating: avgRating._avg.score || 0,
        recentFeedback,
        pendingAffiliates,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
