import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { initiatePayment, getPlanPrice } from "@/lib/fapshi";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body as { plan: "STARTER" | "STANDARD" | "PREMIUM" };

    if (!plan || !["STARTER", "STANDARD", "PREMIUM"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const price = getPlanPrice(plan);

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name || "TiCLearn User",
        plan,
        status: "PENDING",
        fapshiTransId: `TICLEARN-${session.user.id}-${Date.now()}`,
        amount: price.amount,
      },
    });

    const result = await initiatePayment({
      amount: price.amount,
      email: session.user.email,
      name: session.user.name || "TiCLearn User",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      externalId: subscription.id,
    });

    if (!result.success) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { fapshiTransId: result.transId },
    });

    return NextResponse.json({
      link: result.link,
      transId: result.transId,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
