import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rateLimitResponse = await limit(
    "default",
    new Request(req.url, { method: req.method, headers: req.headers }) as never,
  ).catch(() => null);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });
    if (!affiliate || affiliate.status !== "ACTIVE")
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const openRequest = await prisma.affiliateEarning.findFirst({
      where: { affiliateCode: affiliate.code, status: "REQUESTED" },
      select: { id: true },
    });
    if (openRequest)
      return NextResponse.json(
        {
          error:
            "A payout request is already open. Wait for it to be paid first.",
        },
        { status: 409 },
      );

    const pending = await prisma.affiliateEarning.findMany({
      where: { affiliateCode: affiliate.code, status: "PENDING" },
      select: { id: true },
    });
    if (pending.length === 0)
      return NextResponse.json(
        { error: "No pending earnings to request yet" },
        { status: 400 },
      );

    await prisma.affiliateEarning.updateMany({
      where: { affiliateCode: affiliate.code, status: "PENDING" },
      data: { status: "REQUESTED", requestedAt: new Date() },
    });

    return NextResponse.json({ success: true, requested: pending.length });
  } catch (error) {
    console.error("Payout request error:", error);
    return NextResponse.json(
      { error: "Could not request payout" },
      { status: 500 },
    );
  }
}
