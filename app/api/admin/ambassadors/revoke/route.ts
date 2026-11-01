import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const schema = z.object({ referrerId: z.string().min(1) });

export async function POST(req: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;
  const actor = adminCheck.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Referrer id is required" },
      { status: 400 },
    );
  }
  const { referrerId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: referrerId },
      data: { ambassadorGrantBlocked: true },
    });
    await tx.ambassadorReferral.updateMany({
      where: { referrerId, status: { in: ["QUALIFIED", "REWARDED"] } },
      data: { status: "FLAGGED" },
    });
    // End the ambassador granted pass now. Only provider ambassador rows are touched.
    await tx.subscription.updateMany({
      where: { userId: referrerId, status: "ACTIVE", provider: "ambassador" },
      data: { status: "FAILED" },
    });
  });

  await prisma.kpiEvent
    .create({
      data: {
        userId: actor.id,
        event: "ambassador_revoked",
        metadata: { referrerId },
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
