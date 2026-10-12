import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackEvent, EVENTS } from "@/lib/kpi";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Referral code required" },
        { status: 400 },
      );
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
    });

    if (!affiliate || affiliate.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 },
      );
    }

    await prisma.affiliateClick.create({
      data: {
        affiliateCode: code,
        affiliateEmail: affiliate.userEmail,
      },
    });

    await prisma.affiliate.update({
      where: { code },
      data: { totalClicks: { increment: 1 } },
    });

    trackEvent(affiliate.userId, EVENTS.REFERRAL_CLICK, { code }).catch(
      () => {},
    );

    return NextResponse.json({
      success: true,
      redirectUrl: "/sign-up?ref__=" + code,
    });
  } catch (error) {
    console.error("Referral tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track referral" },
      { status: 500 },
    );
  }
}
