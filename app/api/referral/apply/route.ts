import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

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

    if (affiliate.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot refer yourself" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.referredBy || !user) {
      return NextResponse.json(
        { error: "Referral code already applied" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { referredBy: code, refApplied: true },
    });

    // create a new affilate_click
    const affiliateClick = await prisma.affiliateClick.create({
      data: {
        affiliateEmail: affiliate.userEmail,
        affiliateCode: code,
        converted: true,
        referredUserEmail: session.user.email,
      },
    });

    if (!affiliateClick) {
      return NextResponse.json(
        { error: "Failed to apply affiliate code" },
        { status: 500 },
      );
    }

    await prisma.affiliate.update({
      where: { code },
      data: { totalConversions: { increment: 1 } },
    });

    // Award 500 credits to the referrer
    const CREDITS_PER_REFERRAL = 500;

    await prisma.$transaction([
      // Update referrer's credits
      prisma.user.update({
        where: { id: affiliate.userId },
        data: {
          credits: { increment: CREDITS_PER_REFERRAL },
          totalCreditsEarned: { increment: CREDITS_PER_REFERRAL },
        },
      }),
      // Create credit transaction for referrer
      prisma.creditTransaction.create({
        data: {
          userId: affiliate.userId,
          amount: CREDITS_PER_REFERRAL,
          type: "REFERRAL_BONUS",
          description: `Referral bonus: ${session.user.email} signed up`,
        },
      }),
      // Create referral bonus record
      prisma.referralBonus.create({
        data: {
          referrerId: affiliate.userId,
          refereeId: session.user.id,
          creditsAwarded: CREDITS_PER_REFERRAL,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully",
      creditsEarned: CREDITS_PER_REFERRAL,
    });
  } catch (error) {
    console.error("Apply referral error:", error);
    return NextResponse.json(
      { error: "Failed to apply referral code" },
      { status: 500 },
    );
  }
}
