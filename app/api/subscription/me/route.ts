import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ subscription: null }, { status: 401 });
    }

    // The active pass first; else the most recent pending or failed row so
    // the pending panel and the receipt can read the transaction id.
    const [active, recent] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      subscription: active ?? recent ?? null,
      previousPlan: recent?.plan || null,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json({ subscription: null });
  }
}
