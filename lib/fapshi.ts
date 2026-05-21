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
export async function getPaymentStatus(transId: string): Promise<unknown | null> {
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
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export interface PaymentPlanConfig {
  STARTER: { amount: number; fcfa: string };
  STANDARD: { amount: number; fcfa: string };
  PREMIUM: { amount: number; fcfa: string };
  PRO: { amount: number; fcfa: string };
}

export const PLAN_PRICES: PaymentPlanConfig = {
  STARTER: { amount: 3000, fcfa: "3,000" },
  STANDARD: { amount: 5000, fcfa: "5,000" },
  PREMIUM: { amount: 10000, fcfa: "10,000" },
  PRO: { amount: 3500, fcfa: "3,500" },
};

export function getPlanPrice(plan: keyof PaymentPlanConfig) {
  return PLAN_PRICES[plan];
}
