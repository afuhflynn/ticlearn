import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { attachAmbassadorReferral } from "@/lib/ambassadors/attach";
import { verifyAmbassadorCookie } from "@/lib/ambassadors/cookie";
import { AMBASSADOR_COOKIE_NAME } from "@/lib/ambassadors/config";

const schema = z.object({ ref: z.string().min(1).max(32).optional() });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let ref: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (parsed.success && parsed.data.ref) ref = parsed.data.ref;
  } catch {
    // Body is optional; the cookie is the primary source.
  }
  if (!ref) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AMBASSADOR_COOKIE_NAME}=`));
    const raw = match?.slice(AMBASSADOR_COOKIE_NAME.length + 1);
    ref = verifyAmbassadorCookie(raw ? decodeURIComponent(raw) : undefined);
  }
  if (!ref) {
    return NextResponse.json({ attached: false, reason: "no_code" });
  }
  const result = await attachAmbassadorReferral({
    newUserId: session.user.id,
    newUserEmail: session.user.email,
    code: ref,
  });
  return NextResponse.json(result);
}
