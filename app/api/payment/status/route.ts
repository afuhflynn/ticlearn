import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPaymentStatus,
  parseFapshiPaymentStatusPayload,
} from "@/lib/fapshi";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const limited = await limit("payment", request).catch(() => null);
    if (limited) return limited;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const transId = searchParams.get("transId")?.trim();
    if (!transId) {
      return NextResponse.json({ error: "Missing transId" }, { status: 400 });
    }

    const sub = await prisma.subscription.findFirst({
      where: { fapshiTransId: transId },
    });
    if (!sub) {
      return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    }
    if (sub.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sub.status === "ACTIVE") {
      return NextResponse.json({
        status: "ACTIVE",
        plan: sub.plan,
        transId,
        next: "Receipt is on the subscription page with the transaction id.",
      });
    }
    if (sub.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        plan: sub.plan,
        transId,
        next: "The request timed out or failed. Retry and a new PIN prompt is sent.",
      });
    }

    const raw = await getPaymentStatus(transId);
    const parsed = raw ? parseFapshiPaymentStatusPayload(raw) : null;
    const providerStatus = parsed?.status?.toUpperCase() ?? null;

    return NextResponse.json({
      status: "PENDING",
      plan: sub.plan,
      transId,
      providerStatus,
      next: "Still waiting on the phone prompt. Finish the PIN on your phone, then recheck. Webhook confirms the final state.",
      pollHint:
        "Recheck every 5 seconds up to 5 minutes, then contact support with the transaction id.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not check the payment" },
      { status: 500 },
    );
  }
}
