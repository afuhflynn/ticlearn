import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateAffiliateCode(): string {
  return `TIC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: {
        earnings: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    let createdNew = false;
    if (!affiliate) {
      affiliate = await prisma.affiliate.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || "User",
          code: generateAffiliateCode(),
          status: "ACTIVE",
          momoNumber: "",
          momoName: "",
        },
        include: {
          earnings: true,
        },
      });
      createdNew = true;
    }

    const referredUsers = await prisma.user.findMany({
      where: { referredBy: affiliate.code },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const earningsByStatus = affiliate.earnings.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + e.commission;
        return acc;
      },
      {} as Record<string, number>,
    );

    const pendingEarnings =
      (earningsByStatus.PENDING || 0) + (earningsByStatus.REQUESTED || 0);
    const paidEarnings = earningsByStatus.PAID || 0;

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        status: affiliate.status,
        momoNumber: affiliate.momoNumber,
        momoName: affiliate.momoName,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings,
        paidEarnings,
        referredUsers: referredUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          joinedAt: u.createdAt,
          emailVerified: u.emailVerified,
        })),
        earnings: affiliate.earnings.map((e) => ({
          id: e.id,
          referredUserEmail: e.referredUserEmail,
          plan: e.plan,
          amount: e.amount,
          commission: e.commission,
          status: e.status,
          createdAt: e.createdAt,
          requestedAt: e.requestedAt,
          paidAt: e.paidAt,
        })),
      },
    });
  } catch (error) {
    console.error("Affiliate GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { momoNumber, momoName } = await req.json();

    if (!momoNumber || !momoName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const affiliate = await prisma.affiliate.upsert({
      where: { userId: session.user.id },
      update: { momoNumber, momoName },
      create: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name || "User",
        code: generateAffiliateCode(),
        status: "ACTIVE",
        momoNumber: momoNumber || "",
        momoName: momoName || "",
      },
    });

    return NextResponse.json({ affiliate, success: true });
  } catch (error) {
    console.error("Affiliate PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update affiliate" },
      { status: 500 },
    );
  }
}
