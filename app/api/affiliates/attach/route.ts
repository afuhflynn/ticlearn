import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { attachAffiliateReferral } from "@/lib/affiliates/attach";
import { AFFILIATE_COOKIE_NAME } from "@/lib/affiliates/config";
import { verifyAffiliateCookie } from "@/lib/affiliates/cookie";
import { attachAmbassadorReferral } from "@/lib/ambassadors/attach";
import { auth } from "@/lib/auth";

const schema = z.object({ ref: z.string().min(1).max(32).optional() });

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  const raw = match?.slice(name.length + 1);
  return raw ? decodeURIComponent(raw) : undefined;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ref: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (parsed.success && parsed.data.ref) ref = parsed.data.ref;
  } catch {
    // Body is optional; the cookie is the primary source.
  }
  if (!ref) {
    ref = verifyAffiliateCookie(
      cookieValue(req.headers.get("cookie"), AFFILIATE_COOKIE_NAME),
    );
  }
  if (ref) {
    const result = await attachAffiliateReferral({
      newUserId: session.user.id,
      newUserEmail: session.user.email,
      code: ref,
    });
    if (result.attached)
      return NextResponse.json({ ...result, loop: "affiliate" });
  }

  const { verifyAmbassadorCookie } = await import("@/lib/ambassadors/cookie");
  const { AMBASSADOR_COOKIE_NAME } = await import("@/lib/ambassadors/config");
  const ambassadorCode = verifyAmbassadorCookie(
    cookieValue(req.headers.get("cookie"), AMBASSADOR_COOKIE_NAME),
  );
  if (ambassadorCode) {
    const result = await attachAmbassadorReferral({
      newUserId: session.user.id,
      newUserEmail: session.user.email,
      code: ambassadorCode,
    });
    return NextResponse.json({ ...result, loop: "ambassador" });
  }

  return NextResponse.json({ attached: false, reason: "no_code" });
}
