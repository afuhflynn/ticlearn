import { createHmac, timingSafeEqual } from "node:crypto";

function cookieSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "ticlearn-affiliate-dev-secret"
  );
}

export function signAffiliateCode(code: string): string {
  const secret = cookieSecret();
  const sig = createHmac("sha256", secret)
    .update(`aff:${code}`)
    .digest("hex")
    .slice(0, 32);
  return `${code}.${sig}`;
}

export function verifyAffiliateCookie(
  value: string | undefined,
): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const code = value.slice(0, dot).toUpperCase().trim();
  const sig = value.slice(dot + 1);
  if (!code || !sig) return null;
  const expected = signAffiliateCode(code).split(".")[1];
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return code;
}
