import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ subscription: null }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    const previousSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      subscription,
      previousPlan: previousSubscription?.plan || null,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json({ subscription: null });
  }
}
