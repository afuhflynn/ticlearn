import { NextResponse } from "next/server";
import { findReferrerByCode } from "@/lib/ambassadors/code";
import {
  AMBASSADOR_COOKIE_MAX_AGE,
  AMBASSADOR_COOKIE_NAME,
} from "@/lib/ambassadors/config";
import { signAmbassadorCode } from "@/lib/ambassadors/cookie";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const clean = code.trim().toUpperCase();
  const referrer = await findReferrerByCode(clean).catch(() => null);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
  const signup = new URL("/sign-up", appUrl);
  if (referrer?.referralCode) {
    signup.searchParams.set("ref", referrer.referralCode);
  }

  const res = NextResponse.redirect(signup, 302);
  if (referrer?.referralCode) {
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
  }
  return res;
}
