const FAPSHI_API_USER = process.env.FAPSHI_API_USER || "";
const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || "";
const FAPSHI_BASE =
  process.env.FAPSHI_SANDBOX === "true"
    ? "https://sandbox.fapshi.com"
    : "https://live.fapshi.com";

export interface FapshiPaymentRequest {
  amount: number;
  email: string;
  name: string;
  phone?: string;
  redirectUrl?: string;
  externalId?: string;
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
    // FIX 1: Change /direct-pay to /initiate-pay to get a link
    const response = await fetch(`${FAPSHI_BASE}/initiate-pay`, {
      method: "POST",
      headers: {
        apiuser: FAPSHI_API_USER, // FIX 2: String keys
        apikey: FAPSHI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: request.amount,
        email: request.email,
        name: request.name,
        externalId: request.externalId,
        redirectUrl: request.redirectUrl,
      }),
    });

    const data = await response.json();

    if (response.ok && data.link) {
      return { success: true, transId: data.transId, link: data.link };
    }

    return {
      success: false,
      message: data.message || "Fapshi initiation failed",
    };
  } catch (error) {
    return { success: false, message: "Gateway connection error" };
  }
}

export interface PaymentPlanConfig {
  STARTER: { amount: number; fcfa: string };
  STANDARD: { amount: number; fcfa: string };
  PREMIUM: { amount: number; fcfa: string };
}

export const PLAN_PRICES: PaymentPlanConfig = {
  STARTER: { amount: 3000, fcfa: "3,000" },
  STANDARD: { amount: 5000, fcfa: "5,000" },
  PREMIUM: { amount: 10000, fcfa: "10,000" },
};

export function getPlanPrice(plan: keyof PaymentPlanConfig) {
  return PLAN_PRICES[plan];
}
