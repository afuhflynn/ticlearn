import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 },
      );
    }

    const pendingEarnings = await prisma.affiliateEarning.findMany({
      where: {
        affiliateCode: affiliate.code,
        status: "REQUESTED",
      },
    });

    if (pendingEarnings.length === 0) {
      return NextResponse.json(
        { error: "No pending earnings to pay" },
        { status: 400 },
      );
    }

    const totalToPay = pendingEarnings.reduce(
      (sum, e) => sum + e.commission,
      0,
    );

    await prisma.$transaction([
      prisma.affiliateEarning.updateMany({
        where: {
          affiliateCode: affiliate.code,
          status: "REQUESTED",
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      }),
      prisma.affiliate.update({
        where: { id },
        data: {
          pendingEarnings: 0,
          totalEarnings: {
            decrement: totalToPay,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Paid ${totalToPay.toLocaleString()} XAF to ${affiliate.userName}`,
      amountPaid: totalToPay,
    });
  } catch (error) {
    console.error("Admin affiliate payout error:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 },
    );
  }
}
