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

    if (user?.referredBy) {
      return NextResponse.json(
        { error: "Referral code already applied" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { referredBy: code, refApplied: true },
    });

    await prisma.affiliateClick.updateMany({
      where: {
        affiliateCode: code,
        referredUserEmail: session.user.email,
        converted: false,
      },
      data: { converted: true },
    });

    await prisma.affiliate.update({
      where: { code },
      data: { totalConversions: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully",
    });
  } catch (error) {
    console.error("Apply referral error:", error);
    return NextResponse.json(
      { error: "Failed to apply referral code" },
      { status: 500 },
    );
  }
}
