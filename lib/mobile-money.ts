/**
 * The one place Mobile Money rules live for spec 0034.
 * Static MTN first then Orange pair, typed credit bounds, Cameroon phone shape.
 * Money is XAF in whole units. Credits are a separate balance.
 */

/** Static provider pair, MTN first always. No live fetch. */
export const MOMO_PROVIDERS = [
  { code: "MTN", label: "MTN Mobile Money" },
  { code: "ORANGE", label: "Orange Money" },
] as const;

export type MomoProviderCode = (typeof MOMO_PROVIDERS)[number]["code"];

/** Typed credit buys: fixed server rate, bounds and step from the spec. */
export const CREDIT_XAF_RATE = 5;
export const CREDIT_MIN_XAF = 500;
export const CREDIT_MAX_XAF = 20_000;
export const CREDIT_STEP_XAF = 100;

/** Credits promised for a typed amount. Whole XAF only. */
export function creditsForXaf(amountXaf: number): number {
  if (!Number.isInteger(amountXaf) || amountXaf <= 0) return 0;
  return amountXaf * CREDIT_XAF_RATE;
}

/** Uppercase MTN or ORANGE, anything else is null. */
export function normalizeProvider(value: unknown): MomoProviderCode | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (upper === "MTN" || upper === "ORANGE") return upper;
  return null;
}

/**
 * Cameroon phone shape: digits only, 9 digits starting with 6.
 * Accepts 9 digit local, 12 digit 237 prefix, or +237 prefix with
 * spaces and dashes. Returns the 9 digit local form or null.
 */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("237") && digits.length === 12) {
    digits = digits.slice(3);
  }
  if (digits.length !== 9) return null;
  if (!digits.startsWith("6")) return null;
  return digits;
}
