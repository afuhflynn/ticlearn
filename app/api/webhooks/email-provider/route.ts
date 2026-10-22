import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REASON_MAP: Record<string, "BOUNCED" | "COMPLAINED" | "UNSUBSCRIBED"> = {
  bounced: "BOUNCED",
  bounce: "BOUNCED",
  complained: "COMPLAINED",
  complaint: "COMPLAINED",
  unsubscribed: "UNSUBSCRIBED",
  unsubscribe: "UNSUBSCRIBED",
};

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getSecret(): string | undefined {
  return process.env.EMAIL_WEBHOOK_SECRET;
}

export async function POST(req: Request) {
  try {
    const secret = getSecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }
    const rawBody = await req.text();
    const headersList = req.headers;
    const signature =
      headersList.get("x-webhook-signature") ||
      headersList.get("svix-signature") ||
      headersList.get("x-signature");
    const authHeader = headersList.get("Authorization");
    let verified = false;
    if (signature) {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");
      const cleaned = signature.replace(/^sha256=/, "");
      verified = constantTimeCompare(cleaned, expected);
    } else if (authHeader) {
      verified = constantTimeCompare(authHeader, `Bearer ${secret}`);
    }
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const events = Array.isArray(body) ? body : [body];
    let processed = 0;
    for (const evt of events as Record<string, unknown>[]) {
      const type = String(
        evt.type || evt.event || evt.eventType || "",
      ).toLowerCase();
      const reason = REASON_MAP[type];
      if (!reason) continue;
      const email =
        (evt.email as string) ||
        (evt.to as string) ||
        ((evt.data as Record<string, unknown>)?.email as string) ||
        ((evt.data as Record<string, unknown>)?.to as string);
      if (!email) continue;
      const providerMessageId =
        (evt.messageId as string) ||
        (evt.id as string) ||
        ((evt.data as Record<string, unknown>)?.messageId as string);
      const userId = (evt.userId as string) || undefined;
      await prisma.emailSuppression.upsert({
        where: { email },
        create: {
          email,
          reason,
          userId: userId ?? null,
          providerMessageId: providerMessageId ?? null,
        },
        update: {
          reason,
          providerMessageId: providerMessageId ?? undefined,
          userId: userId ?? undefined,
        },
      });
      processed++;
    }
    return NextResponse.json({ success: true, processed }, { status: 200 });
  } catch (error) {
    console.error("Email provider webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
