import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const payoutSchema = z.object({
  payoutReference: z.string().trim().min(3).max(120),
});

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (
      !session?.user ||
      (session.user as { role?: string }).role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = payoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Add a Mobile Money reference for this payout" },
        { status: 400 },
      );
    }

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate)
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 },
      );

    const result = await prisma.$transaction(async (tx) => {
      const requested = await tx.affiliateEarning.findMany({
        where: { affiliateCode: affiliate.code, status: "REQUESTED" },
      });
      if (requested.length === 0) return { total: 0, count: 0 };
      const total = requested.reduce((sum, e) => sum + e.commission, 0);
      await tx.affiliateEarning.updateMany({
        where: { affiliateCode: affiliate.code, status: "REQUESTED" },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payoutReference: parsed.data.payoutReference,
        },
      });
      const current = await tx.affiliate.findUnique({
        where: { id },
        select: { pendingEarnings: true },
      });
      const nextPending = Math.max(
        0,
        (current?.pendingEarnings ?? total) - total,
      );
      await tx.affiliate.update({
        where: { id },
        data: { pendingEarnings: nextPending },
      });
      return { total, count: requested.length };
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "No requested earnings to pay" },
        { status: 400 },
      );
    }

    console.log(
      JSON.stringify({
        event: "partner_payout_paid",
        actorId: session.user.id,
        affiliateId: id,
        amount: result.total,
        reference: parsed.data.payoutReference,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({
      success: true,
      message: `Paid ${result.total.toLocaleString()} XAF to ${affiliate.userName}`,
      amountPaid: result.total,
    });
  } catch (error) {
    console.error("Admin affiliate payout error:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 },
    );
  }
}
