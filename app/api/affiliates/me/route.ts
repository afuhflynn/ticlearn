import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { affiliateShareUrl } from "@/lib/affiliates/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });
    if (!affiliate)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (affiliate.status !== "ACTIVE")
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
    const [pendingAgg, lifetimeAgg, clickCount, conversionCount] =
      await Promise.all([
        prisma.affiliateEarning.aggregate({
          where: {
            affiliateCode: affiliate.code,
            status: { in: ["PENDING", "REQUESTED"] },
          },
          _sum: { commission: true },
        }),
        prisma.affiliateEarning.aggregate({
          where: { affiliateCode: affiliate.code },
          _sum: { commission: true },
        }),
        prisma.affiliateClick.count({
          where: { affiliateCode: affiliate.code },
        }),
        prisma.affiliateEarning.count({
          where: { affiliateCode: affiliate.code },
        }),
      ]);

    return NextResponse.json({
      code: affiliate.code,
      link: affiliateShareUrl(origin, affiliate.code),
      clicks: clickCount,
      conversions: conversionCount,
      pending: pendingAgg._sum.commission ?? 0,
      lifetime: lifetimeAgg._sum.commission ?? 0,
      status: affiliate.status,
    });
  } catch (error) {
    console.error("Partner stats error:", error);
    return NextResponse.json(
      { error: "Failed to load partner stats" },
      { status: 500 },
    );
  }
}
