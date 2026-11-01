import { NextResponse } from "next/server";
import {
  AFFILIATE_COOKIE_MAX_AGE,
  AFFILIATE_COOKIE_NAME,
} from "@/lib/affiliates/config";
import { signAffiliateCode } from "@/lib/affiliates/cookie";
import { findReferrerByCode } from "@/lib/ambassadors/code";
import {
  AMBASSADOR_COOKIE_MAX_AGE,
  AMBASSADOR_COOKIE_NAME,
} from "@/lib/ambassadors/config";
import { signAmbassadorCode } from "@/lib/ambassadors/cookie";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const clean = code.trim().toUpperCase();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
  const signup = new URL("/sign-up", appUrl);
  signup.searchParams.set("ref", clean);

  const affiliate = await prisma.affiliate
    .findUnique({
      where: { code: clean },
      select: { code: true, status: true, userEmail: true },
    })
    .catch(() => null);
  if (affiliate && affiliate.status === "ACTIVE") {
    await prisma.affiliateClick
      .create({
        data: {
          affiliateCode: clean,
          affiliateEmail: affiliate.userEmail,
          converted: false,
        },
      })
      .catch(() => {});
    await prisma.affiliate
      .update({
        where: { code: clean },
        data: { totalClicks: { increment: 1 } },
      })
      .catch(() => {});
    const res = NextResponse.redirect(signup, 302);
    res.cookies.set(AFFILIATE_COOKIE_NAME, signAffiliateCode(clean), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AFFILIATE_COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  const referrer = await findReferrerByCode(clean).catch(() => null);
  if (referrer?.referralCode) {
    const res = NextResponse.redirect(signup, 302);
    res.cookies.set(
      AMBASSADOR_COOKIE_NAME,
      signAmbassadorCode(referrer.referralCode),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: AMBASSADOR_COOKIE_MAX_AGE,
        path: "/",
      },
    );
    return res;
  }

  return NextResponse.redirect(signup, 302);
}
