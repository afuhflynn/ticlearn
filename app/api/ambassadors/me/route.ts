import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateReferralCode } from "@/lib/ambassadors/code";
import {
  AMBASSADOR_THRESHOLD,
  ambassadorShareUrl,
} from "@/lib/ambassadors/config";
import { lazyExpireReferrals } from "@/lib/ambassadors/attach";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = await getOrCreateReferralCode(session.user.id);
  await lazyExpireReferrals(session.user.id).catch(() => {});
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
  const [qualified, pending] = await Promise.all([
    prisma.ambassadorReferral.count({
      where: {
        referrerId: session.user.id,
        status: { in: ["QUALIFIED", "REWARDED"] },
      },
    }),
    prisma.ambassadorReferral.count({
      where: { referrerId: session.user.id, status: "PENDING" },
    }),
  ]);
  return NextResponse.json({
    code,
    link: ambassadorShareUrl(origin, code),
    qualified,
    pending,
    remaining: Math.max(0, AMBASSADOR_THRESHOLD - qualified),
    threshold: AMBASSADOR_THRESHOLD,
  });
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = await getOrCreateReferralCode(session.user.id);
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
  return NextResponse.json({ code, link: ambassadorShareUrl(origin, code) });
}
