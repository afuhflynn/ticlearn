import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transId, status, amount, phone } = body;

    if (!transId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { fapshiTransId: transId },
      include: { user: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if (status === "SUCCESS") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });

      await prisma.userStats.upsert({
        where: { userId: subscription.userId },
        update: {},
        create: {
          userId: subscription.userId,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          quizzesTaken: 0,
          avgScore: 0,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "FAILED",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fapshi webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
