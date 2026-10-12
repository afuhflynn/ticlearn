import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { initiatePayment } from "@/lib/fapshi";
import { prisma } from "@/lib/prisma";
import {
  CREDIT_PURCHASE_EXTERNAL_ID_PREFIX,
  creditsFromXaf,
  ensurePlatformSettings,
  getPlatformSettings,
} from "@/lib/platform-settings";

const bodySchema = z.object({
  amountXaf: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensurePlatformSettings();
    const settings = await getPlatformSettings();

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body" },
        { status: 400 },
      );
    }

    const { amountXaf } = parsed.data;
    const minXaf = Math.max(100, settings.minCreditPurchaseXaf);
    const maxXaf = settings.maxCreditPurchaseXaf;

    if (amountXaf < minXaf) {
      return NextResponse.json(
        { error: `Minimum top-up is ${minXaf.toLocaleString()} XAF` },
        { status: 400 },
      );
    }
    if (amountXaf > maxXaf) {
      return NextResponse.json(
        { error: `Maximum single top-up is ${maxXaf.toLocaleString()} XAF` },
        { status: 400 },
      );
    }

    const creditsPromised = creditsFromXaf(
      amountXaf,
      settings.creditsPer1000Xaf,
    );
    if (creditsPromised < 1) {
      return NextResponse.json(
        {
          error:
            "That amount is too low to receive at least 1 credit at the current rate. Increase the amount or ask an admin to adjust credits per 1,000 XAF.",
        },
        { status: 400 },
      );
    }

    const order = await prisma.creditPurchaseOrder.create({
      data: {
        userId: session.user.id,
        amountXaf,
        creditsPromised,
        status: "PENDING",
      },
    });

    const externalId = `${CREDIT_PURCHASE_EXTERNAL_ID_PREFIX}${order.id}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";

    const result = await initiatePayment({
      amount: amountXaf,
      email: session.user.email,
      name: session.user.name || "Student",
      userId: session.user.id,
      externalId,
      message: `TiCLearn credits (${creditsPromised} cr.)`,
      redirectUrl: appUrl
        ? `${appUrl}/subscription?creditPurchase=return`
        : undefined,
    });

    if (!result.success) {
      await prisma.creditPurchaseOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json(
        { error: result.message || "Could not start payment" },
        { status: 400 },
      );
    }

    await prisma.creditPurchaseOrder.update({
      where: { id: order.id },
      data: { fapshiTransId: result.transId ?? undefined },
    });

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
