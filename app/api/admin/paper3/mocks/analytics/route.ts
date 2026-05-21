import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session.user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mocks = await prisma.paper3Mock.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        subject: true,
        visibleToAllStudents: true,
        createdAt: true,
        module: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const completedStats = await prisma.paper3MockAttempt.groupBy({
      by: ["mockId"],
      where: { status: "COMPLETED" },
      _count: true,
      _avg: { score: true },
      _sum: { timeTaken: true },
    });

    const startedStats = await prisma.paper3MockAttempt.groupBy({
      by: ["mockId"],
      _count: true,
    });

    const completedMap = new Map(
      completedStats.map((r) => [
        r.mockId,
        {
          completions: r._count,
          avgScore: r._avg.score,
          sumTime: r._sum.timeTaken,
        },
      ]),
    );
    const startedMap = new Map(startedStats.map((r) => [r.mockId, r._count]));

    const rows = mocks.map((m) => {
      const c = completedMap.get(m.id);
      const starts = startedMap.get(m.id) ?? 0;
      return {
        mockId: m.id,
        title: m.title,
        status: m.status,
        subject: m.subject,
        catalogVisible: m.visibleToAllStudents,
        module: m.module,
        createdAt: m.createdAt,
        attemptsStarted: starts,
        attemptsCompleted: c?.completions ?? 0,
        avgScoreCompleted:
          c?.avgScore != null ? Math.round(c.avgScore * 100) / 100 : null,
        completionRate:
          starts > 0
            ? Math.round(((c?.completions ?? 0) / starts) * 1000) / 10
            : null,
      };
    });

    return NextResponse.json({ mocks: rows });
  } catch (error) {
    console.error("Admin paper3 analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
