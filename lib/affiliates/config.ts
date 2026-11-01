export const AFFILIATE_COOKIE_NAME = "tic_aff";
export const AFFILIATE_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export function affiliateCommissionRate(): number {
  const raw = process.env.AFFILIATE_COMMISSION_PERCENT;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) return parsed;
  return 0.2;
}

export function affiliateInviteDays(): number {
  const raw = process.env.AFFILIATE_INVITE_DAYS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 30)
    return Math.floor(parsed);
  return 7;
}

export function affiliateSharePath(code: string): string {
  return `/sign-up?ref=${encodeURIComponent(code)}`;
}

export function affiliateShareUrl(origin: string, code: string): string {
  const clean = origin.replace(/\/$/, "");
  return `${clean}${affiliateSharePath(code)}`;
}

export function affiliateClaimUrl(origin: string, token: string): string {
  const clean = origin.replace(/\/$/, "");
  return `${clean}/affiliates/claim?token=${encodeURIComponent(token)}`;
}

export function commissionForAmount(amountXaf: number, rate?: number): number {
  const r = rate ?? affiliateCommissionRate();
  if (!Number.isFinite(amountXaf) || amountXaf <= 0) return 0;
  return Math.floor(amountXaf * r);
}
