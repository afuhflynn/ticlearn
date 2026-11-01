import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const limited = await limit("admin", req);
  if (limited) return limited;
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  const { searchParams } = new URL(req.url);
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );
  const per = 20;
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim().toUpperCase();

  const where = {
    ...(search
      ? {
          OR: [
            { codeUsed: { contains: search, mode: "insensitive" as const } },
            {
              invitedEmail: { contains: search, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.ambassadorReferral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      select: {
        id: true,
        referrerId: true,
        codeUsed: true,
        status: true,
        qualifiedAt: true,
        rewardedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.ambassadorReferral.count({ where }),
  ]);

  const referrerIds = [...new Set(rows.map((r) => r.referrerId))];
  const referrers = referrerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, name: true, email: true, referralCode: true },
      })
    : [];
  const byId = new Map(referrers.map((u) => [u.id, u]));

  return NextResponse.json({
    rows: rows.map((r) => ({ ...r, referrer: byId.get(r.referrerId) ?? null })),
    total,
    page,
    totalPages: Math.ceil(total / per),
  });
}
