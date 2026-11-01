import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const schema = z.object({ id: z.string().min(1) });

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
      { error: "Referral id is required" },
      { status: 400 },
    );
  }
  await prisma.ambassadorReferral.updateMany({
    where: { id: parsed.data.id },
    data: { status: "FLAGGED" },
  });
  await prisma.kpiEvent
    .create({
      data: {
        userId: actor.id,
        event: "ambassador_flagged",
        metadata: { referralId: parsed.data.id },
      },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
