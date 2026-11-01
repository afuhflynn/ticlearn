import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lazyExpireReferrals } from "@/lib/ambassadors/attach";
import { prisma } from "@/lib/prisma";

function displayName(email: string | null, userId: string): string {
  if (!email) return `Friend ${userId.slice(0, 4)}`;
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : email;
  if (local.length <= 2) return `${local[0] ?? "F"}…`;
  return `${local[0].toUpperCase()}${local.slice(1, 2)}…`;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await lazyExpireReferrals(session.user.id).catch(() => {});
  const { searchParams } = new URL(req.url);
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );
  const per = 20;
  const [rows, total] = await Promise.all([
    prisma.ambassadorReferral.findMany({
      where: { referrerId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        status: true,
        qualifiedAt: true,
        expiresAt: true,
        createdAt: true,
        referredUserId: true,
      },
    }),
    prisma.ambassadorReferral.count({ where: { referrerId: session.user.id } }),
  ]);
  const userIds = rows
    .map((r) => r.referredUserId)
    .filter((v): v is string => Boolean(v));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      status: r.status,
      qualifiedAt: r.qualifiedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt.toISOString(),
      display: r.referredUserId
        ? (names.get(r.referredUserId) ?? displayName(null, r.referredUserId))
        : "Invited friend",
    })),
    total,
    page,
    totalPages: Math.ceil(total / per),
  });
}
