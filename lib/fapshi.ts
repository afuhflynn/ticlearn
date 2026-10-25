const FAPSHI_API_USER = process.env.FAPSHI_API_USER || "";
const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || "";
const FAPSHI_BASE =
  process.env.FAPSHI_BASE_URL?.trim() ||
  (process.env.FAPSHI_SANDBOX === "true"
    ? "https://sandbox.fapshi.com"
    : "https://live.fapshi.com");

export interface FapshiPaymentRequest {
  amount: number;
  email: string;
  name: string;
  phone?: string;
  userId: string;
  redirectUrl?: string;
  externalId?: string;
  /** Shown on the MoMo payment UI where supported */
  message?: string;
}

export interface FapshiPaymentResponse {
  success: boolean;
  transId?: string;
  link?: string;
  message?: string;
}

export async function initiatePayment(
  request: FapshiPaymentRequest,
): Promise<FapshiPaymentResponse> {
  if (!FAPSHI_API_USER || !FAPSHI_API_KEY) {
    return { success: false, message: "Payment system not configured" };
  }

  try {
    const response = await fetch(`${FAPSHI_BASE}/initiate-pay`, {
      method: "POST",
      headers: {
        apiuser: FAPSHI_API_USER,
        apikey: FAPSHI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: request.amount,
        email: request.email,
        name: request.name,
        userId: request.userId,
        externalId: request.externalId,
        redirectUrl: request.redirectUrl,
        message: request.message,
      }),
    });

    const data = (await response.json()) as {
      link?: string;
      transId?: string;
      message?: string;
    };

    if (response.ok && data.link) {
      return { success: true, transId: data.transId, link: data.link };
    }

    return {
      success: false,
      message: data.message || "Fapshi initiation failed",
    };
  } catch {
    return { success: false, message: "Gateway connection error" };
  }
}

/** Optional status check (e.g. return page) — matches ticportal `/payment-status/:transId`. */
export async function getPaymentStatus(
  transId: string,
): Promise<unknown | null> {
  if (!FAPSHI_API_USER || !FAPSHI_API_KEY || !transId) {
    return null;
  }

  try {
    const response = await fetch(
      `${FAPSHI_BASE}/payment-status/${encodeURIComponent(transId)}`,
      {
        method: "GET",
        headers: {
          apiuser: FAPSHI_API_USER,
          apikey: FAPSHI_API_KEY,
        },
      },
    );
    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Normalize Fapshi payment-status payloads (nested wrappers vary). */
export function parseFapshiPaymentStatusPayload(raw: unknown): {
  externalId: string;
  status: string;
  transId: string;
} | null {
  if (!raw || typeof raw !== "object") return null;

  const unwrap = (o: Record<string, unknown>): Record<string, unknown> => {
    if (typeof o.data === "object" && o.data !== null) {
      return unwrap(o.data as Record<string, unknown>);
    }
    if (typeof o.transaction === "object" && o.transaction !== null) {
      return unwrap(o.transaction as Record<string, unknown>);
    }
    return o;
  };

  const obj = unwrap(raw as Record<string, unknown>);
  const externalId = pickString(obj, ["externalId", "external_id"]);
  const status = pickString(obj, ["status", "paymentStatus", "payment_status"]);
  const transId = pickString(obj, ["transId", "trans_id"]);

  if (!externalId || !status) return null;
  return { externalId, status, transId };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * After redirect, Fapshi often needs a short delay before payment-status returns
 * full fields (`externalId`, `status`). Poll with backoff for reconcile flows.
 */
export async function pollPaymentStatusUntilReady(
  transId: string,
  opts?: { maxAttempts?: number },
): Promise<{ externalId: string; status: string; transId: string } | null> {
  const maxAttempts = opts?.maxAttempts ?? 10;
  /** ms — grows gently so total window ~25–35s */
  const delays = [300, 500, 700, 1000, 1200, 1500, 2000, 2500, 3000, 3500];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await getPaymentStatus(transId);
    const parsed = parseFapshiPaymentStatusPayload(raw);
    if (parsed) return parsed;

    if (attempt < maxAttempts - 1) {
      await sleep(delays[Math.min(attempt, delays.length - 1)] ?? 1500);
    }
  }

  return null;
}

import { planCatalog } from "@/constants/plans";

export interface PaymentPlanConfig {
  STARTER: { amount: number; fcfa: string };
  STANDARD: { amount: number; fcfa: string };
  PREMIUM: { amount: number; fcfa: string };
  PRO: { amount: number; fcfa: string };
}

export function getPlanPrice(plan: keyof PaymentPlanConfig) {
  const def = planCatalog[plan];
  if (!def) {
    return { amount: 0, fcfa: "0" };
  }
  return { amount: def.priceXaf, fcfa: def.priceXaf.toLocaleString() };
}
