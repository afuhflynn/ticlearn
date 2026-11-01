import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

const clickSchema = z.object({ code: z.string().min(3).max(32) });

export async function POST(req: Request) {
  const rateLimitResponse = await limit(
    "default",
    new Request(req.url, { method: req.method, headers: req.headers }) as never,
  ).catch(() => null);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = clickSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    const code = parsed.data.code.trim().toUpperCase();

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      select: { code: true, userEmail: true, status: true },
    });
    if (!affiliate || affiliate.status !== "ACTIVE")
      return NextResponse.json({ success: true });

    await prisma.affiliateClick
      .create({
        data: {
          affiliateCode: code,
          affiliateEmail: affiliate.userEmail,
          converted: false,
        },
      })
      .catch(() => {});
    await prisma.affiliate
      .update({ where: { code }, data: { totalClicks: { increment: 1 } } })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affiliate click error:", error);
    return NextResponse.json({ success: true });
  }
}
