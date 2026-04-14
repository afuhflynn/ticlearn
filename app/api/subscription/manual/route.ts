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

    const { plan, transactionId, paymentMethod } = await req.json();

    if (!plan || !transactionId || !paymentMethod) {
      return NextResponse.json(
        {
          error: "Missing required fields: plan, transactionId, paymentMethod",
        },
        { status: 400 },
      );
    }

    if (!["STARTER", "STANDARD", "PREMIUM"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["MTN", "ORANGE"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }

    const planAmounts: Record<string, number> = {
      STARTER: 3000,
      STANDARD: 5000,
      PREMIUM: 10000,
    };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        userEmail: user.email,
        userName: user.name,
        plan: plan as any,
        status: "PENDING",
        amount: planAmounts[plan],
        fapshiTransId: transactionId,
      },
      update: {
        plan: plan as any,
        status: "PENDING",
        amount: planAmounts[plan],
        fapshiTransId: transactionId,
        activatedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        transactionId: subscription.fapshiTransId,
        createdAt: subscription.createdAt,
      },
    });
  } catch (error) {
    console.error("Manual subscription POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit manual payment" },
      { status: 500 },
    );
  }
}
