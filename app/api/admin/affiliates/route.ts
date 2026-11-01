import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-admin";

async function adminRateLimit(request: Request): Promise<NextResponse | null> {
  const nextReq = new Request(request.url, {
    method: request.method,
    headers: request.headers,
  });
  return limit("admin", nextReq as any);
}

export async function GET(req: Request) {
  const rateLimitResponse = await adminRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where = {
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { userName: { contains: search, mode: "insensitive" as const } },
          { userEmail: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: status as any }),
    };

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          earnings: {
            select: {
              commission: true,
              status: true,
            },
          },
        },
      }),
      prisma.affiliate.count({ where }),
    ]);

    const affiliatesWithStats = affiliates.map((aff) => {
      const earningsByStatus = aff.earnings.reduce(
        (acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + e.commission;
          return acc;
        },
        {} as Record<string, number>,
      );
      return {
        id: aff.id,
        code: aff.code,
        status: aff.status,
        userName: aff.userName,
        userEmail: aff.userEmail,
        momoNumber: aff.momoNumber,
        momoName: aff.momoName,
        totalClicks: aff.totalClicks,
        totalConversions: aff.totalConversions,
        totalEarnings: aff.totalEarnings,
        pendingEarnings:
          (earningsByStatus.PENDING || 0) + (earningsByStatus.REQUESTED || 0),
        createdAt: aff.createdAt,
        updatedAt: aff.updatedAt,
      };
    });

    return NextResponse.json({
      affiliates: affiliatesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin affiliates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliates" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const rateLimitResponse = await adminRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  return NextResponse.json(
    {
      error:
        "Direct partner creation is retired. Invite the person by email, let them claim the link, then approve them.",
    },
    { status: 410 },
  );
}
