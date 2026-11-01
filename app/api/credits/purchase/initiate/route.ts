import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { initiatePayment } from "@/lib/fapshi";
import { EVENTS, trackEvent } from "@/lib/kpi";
import {
  CREDIT_MAX_XAF,
  CREDIT_MIN_XAF,
  CREDIT_STEP_XAF,
  creditsForXaf,
  normalizePhone,
  normalizeProvider,
} from "@/lib/mobile-money";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

const bodySchema = z.object({
  amountXaf: z.number().int(),
  phone: z.string().min(1).max(20),
  provider: z.string().min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const limited = await limit("payment-initiate", request).catch(() => null);
    if (limited) return limited;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body" },
        { status: 400 },
      );
    }

    const { amountXaf } = parsed.data;

    if (
      !Number.isInteger(amountXaf) ||
      amountXaf < CREDIT_MIN_XAF ||
      amountXaf > CREDIT_MAX_XAF ||
      amountXaf % CREDIT_STEP_XAF !== 0
    ) {
      return NextResponse.json(
        {
          error: `Type an amount from ${CREDIT_MIN_XAF.toLocaleString()} XAF to ${CREDIT_MAX_XAF.toLocaleString()} XAF in ${CREDIT_STEP_XAF} XAF steps.`,
        },
        { status: 400 },
      );
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

    const creditsPromised = creditsForXaf(amountXaf);
    if (creditsPromised < 1) {
      return NextResponse.json(
        { error: "That amount gives no credits. Type a larger amount." },
        { status: 400 },
      );
    }

    // A double tap within 15 minutes reuses the same pending row.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const reusable = await prisma.creditPurchaseOrder.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
        amountXaf,
        createdAt: { gte: fifteenMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    let order = reusable;
    if (order) {
      order = await prisma.creditPurchaseOrder.update({
        where: { id: order.id },
        data: { provider, phone },
      });
    } else {
      order = await prisma.creditPurchaseOrder.create({
        data: {
          userId: session.user.id,
          amountXaf,
          creditsPromised,
          status: "PENDING",
          provider,
          phone,
        },
      });
    }

    const externalId = `${CREDIT_PURCHASE_EXTERNAL_ID_PREFIX}${order.id}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";

    const result = await initiatePayment({
      amount: amountXaf,
      email: session.user.email,
      name: session.user.name || "Student",
      phone,
      userId: session.user.id,
      externalId,
      message: `TiCLearn credits (${creditsPromised} cr.)`,
      redirectUrl: appUrl
        ? `${appUrl}/subscription?creditPurchase=return`
        : undefined,
    });

    if (!result.success) {
      if (!reusable) {
        await prisma.creditPurchaseOrder.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
      }
      return NextResponse.json(
        { error: result.message || "Could not start payment" },
        { status: 400 },
      );
    }

    await prisma.creditPurchaseOrder.update({
      where: { id: order.id },
      data: { fapshiTransId: result.transId ?? undefined },
    });

    trackEvent(session.user.id, EVENTS.PAYMENT_INITIATED, {
      kind: "credits",
      amount: amountXaf,
      credits: creditsPromised,
      provider,
    }).catch(() => {});

    return NextResponse.json({
      link: result.link,
      transId: result.transId,
      orderId: order.id,
      creditsPromised,
      amountXaf,
    });
  } catch (error) {
    console.error("Credits purchase initiate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
