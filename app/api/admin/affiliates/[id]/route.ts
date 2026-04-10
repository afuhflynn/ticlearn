import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!affiliate)
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 },
      );

    const clicks = await prisma.affiliateClick.findMany({
      where: { affiliateCode: affiliate.code, converted: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const earnings = await prisma.affiliateEarning.findMany({
      where: { affiliateCode: affiliate.code },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalEarnings = await prisma.affiliateEarning.aggregate({
      where: { affiliateCode: affiliate.code, status: "PAID" },
      _sum: { amount: true },
    });

    return NextResponse.json({
      affiliate: { ...affiliate, referralsCount: clicks.length },
      totalEarnings: totalEarnings._sum.amount || 0,
      referrals: clicks,
      earnings,
    });
  } catch (error) {
    console.error("Admin affiliate get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { status, momoNumber, momoName } = await req.json();

    const affiliate = await prisma.affiliate.update({
      where: { id },
      data: {
        ...(status && { status: status as any }),
        ...(momoNumber && { momoNumber }),
        ...(momoName && { momoName }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ affiliate, success: true });
  } catch (error) {
    console.error("Admin affiliate update error:", error);
    return NextResponse.json(
      { error: "Failed to update affiliate" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.affiliate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin affiliate delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete affiliate" },
      { status: 500 },
    );
  }
}
