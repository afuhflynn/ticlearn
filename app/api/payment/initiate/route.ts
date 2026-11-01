import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { payablePlans } from "@/constants/plans";
import { auth } from "@/lib/auth";
import { initiatePayment } from "@/lib/fapshi";
import { EVENTS, trackEvent } from "@/lib/kpi";
import { normalizePhone, normalizeProvider } from "@/lib/mobile-money";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { getResolvedTier, isSubscriptionExpired } from "@/lib/resolved-plans";

const bodySchema = z.object({
  plan: z.enum(["WEEKLY", "PRO"]),
  phone: z.string().min(1).max(20),
  provider: z.string().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const limited = await limit("payment-initiate", request).catch(() => null);
    if (limited) return limited;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || !payablePlans.includes(parsed.data.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const provider = normalizeProvider(parsed.data.provider);
    if (!provider) {
      return NextResponse.json(
        { error: "Choose MTN Mobile Money or Orange Money." },
        { status: 400 },
      );
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Enter a valid Cameroon phone number, 9 digits starting with 6.",
        },
        { status: 400 },
      );
    }

    const { plan } = parsed.data;

    const resolved = await getResolvedTier(plan);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const amount = resolved.priceXaf;

    const existing = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (
      existing?.status === "ACTIVE" &&
      existing.activatedAt &&
      !isSubscriptionExpired(existing.plan, existing.activatedAt)
    ) {
      return NextResponse.json(
        {
          error:
            "You already have an active pass. It runs to its end date and does not renew by itself.",
        },
        { status: 400 },
      );
    }

    let subscription = existing;
    if (subscription) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: plan as "WEEKLY" | "PRO",
          amount,
          provider,
          phone,
          status: "PENDING",
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || "User",
          plan: plan as "WEEKLY" | "PRO",
          status: "PENDING",
          amount,
          provider,
          phone,
        },
      });
    }

    const result = await initiatePayment({
      amount,
      email: session.user.email,
      name: session.user.name || "User",
      phone,
      userId: session.user.id,
      message: `TiCLearn ${plan} subscription`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      externalId: subscription.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { fapshiTransId: result.transId },
    });

    trackEvent(session.user.id, EVENTS.PAYMENT_INITIATED, {
      plan,
      amount,
      provider,
    }).catch(() => {});
    trackEvent(session.user.id, EVENTS.UPGRADE_START, {
      plan,
      amount,
      provider,
    }).catch(() => {});

    return NextResponse.json({
      link: result.link,
      transId: result.transId,
      status: "PENDING",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
