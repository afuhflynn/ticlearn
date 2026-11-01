import { NextResponse } from "next/server";
import { z } from "zod";
import { findReferrerByCode } from "@/lib/ambassadors/code";
import { limit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ code: z.string().min(1).max(32) });

export async function POST(req: Request) {
  const limited = await limit("default", req);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }
  const referrer = await findReferrerByCode(parsed.data.code).catch(() => null);
  if (!referrer) return NextResponse.json({ ok: true });
  await prisma.user
    .update({
      where: { id: referrer.id },
      data: {},
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
