import { auth } from "@/lib/auth";
import { getPlanPrice, initiatePayment, PaymentPlanConfig } from "@/lib/fapshi";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await request.json();
    if (!["STARTER", "STANDARD", "PREMIUM"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const price = getPlanPrice(plan as keyof PaymentPlanConfig);

    let subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (subscription) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan,
          amount: price.amount,
          status: "PENDING", // Reset status for re-attempts
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || "User",
          plan,
          status: "PENDING",
          amount: price.amount,
        },
      });
    }

    const result = await initiatePayment({
      amount: price.amount,
      email: session.user.email,
      name: session.user.name || "User",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      externalId: subscription.id, // Passing your DB ID as externalId
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Save the actual Fapshi ID returned from their server
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { fapshiTransId: result.transId },
    });

    return NextResponse.json({ link: result.link, transId: result.transId });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
