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
      paidUsers,
      freeUsers,
      proSubscriptions,
      recentRegistrations,
      mocksCompleted,
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
      prisma.subscription.count({ where: { status: "ACTIVE", plan: "PRO" } }),
      prisma.user.count({
        where: { subscriptions: { none: { status: "ACTIVE" } } },
      }),
      prisma.subscription.count({ where: { plan: "PRO" } }),
      prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.mockAttempt.count(),
    ]);

    const conversionRate =
      totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : "0";

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
        // Monetization metrics
        paidUsers,
        freeUsers,
        proSubscriptions,
        conversionRate: `${conversionRate}%`,
        recentRegistrations,
        mocksCompleted,
        revenueThisMonth: totalRevenue._sum.amount || 0,
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
