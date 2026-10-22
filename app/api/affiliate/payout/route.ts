import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 },
      );
    }

    if (!affiliate.momoNumber || !affiliate.momoName) {
      return NextResponse.json(
        { error: "Please add your mobile money details first" },
        { status: 400 },
      );
    }

    const pendingEarnings = await prisma.affiliateEarning.findMany({
      where: {
        affiliateCode: affiliate.code,
        status: "PENDING",
      },
    });

    if (pendingEarnings.length === 0) {
      return NextResponse.json(
        { error: "No pending earnings to withdraw" },
        { status: 400 },
      );
    }

    const totalAmount = pendingEarnings.reduce(
      (sum, e) => sum + e.commission,
      0,
    );

    await prisma.affiliateEarning.updateMany({
      where: {
        affiliateCode: affiliate.code,
        status: "PENDING",
      },
      data: {
        status: "REQUESTED",
        requestedAt: new Date(),
      },
    });

    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        pendingEarnings: 0,
      },
    });

    console.log(
      `Payout requested: ${totalAmount} XFA for affiliate ${affiliate.code}`,
    );

    return NextResponse.json({
      success: true,
      message: `Payout of ${totalAmount} XFA requested successfully`,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Payout request error:", error);
    return NextResponse.json(
      { error: "Failed to request payout" },
      { status: 500 },
    );
  }
}
