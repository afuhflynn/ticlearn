import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prisma.affiliate.count({ where }),
    ]);

    const affiliatesWithStats = await Promise.all(
      affiliates.map(async (a) => {
        const [clicksCount, conversionsCount, earnings] = await Promise.all([
          prisma.affiliateClick.count({
            where: { affiliateCode: a.code },
          }),
          prisma.affiliateClick.count({
            where: { affiliateCode: a.code, converted: true },
          }),
          prisma.affiliateEarning.aggregate({
            where: { affiliateCode: a.code },
            _sum: { amount: true },
          }),
        ]);
        return {
          ...a,
          referralsCount: conversionsCount,
          totalClicks: clicksCount,
          totalConversions: conversionsCount,
          totalEarnings: earnings._sum.amount || 0,
          pendingEarnings: earnings._sum.amount || 0,
          userName: a.userName,
          userEmail: a.userEmail,
          momoNumber: a.momoNumber,
          momoName: a.momoName,
        };
      }),
    );

    return NextResponse.json({
      affiliates: affiliatesWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin affiliates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliates" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, code, userEmail, userName, momoNumber, momoName, status } =
      await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existingAffiliate = await prisma.affiliate.findFirst({
      where: { userId },
    });

    if (existingAffiliate) {
      const updated = await prisma.affiliate.update({
        where: { id: existingAffiliate.id },
        data: {
          code,
          status: status as any,
          momoNumber,
          momoName,
          userEmail: user.email,
          userName: user.name,
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
      return NextResponse.json({ affiliate: updated, success: true });
    }

    const affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        userEmail: userEmail || user.email,
        userName: userName || user.name || "Unknown",
        code: code || `REF${Date.now()}`,
        status: status || "PENDING",
        momoNumber: momoNumber || "",
        momoName: momoName || "",
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ affiliate, success: true });
  } catch (error) {
    console.error("Admin affiliate create error:", error);
    return NextResponse.json(
      { error: "Failed to create affiliate" },
      { status: 500 },
    );
  }
}
