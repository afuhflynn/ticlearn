const FAPSHI_API_URL =
  process.env.FAPSHI_BASE_URL || "https://sandbox.fapshi.com";
const FAPSHI_API_USER = process.env.FAPSHI_API_USER || "";
const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || "";

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
    console.warn("Fapshi API credentials not configured");
    return { success: false, message: "Payment system not configured" };
  }

  try {
    const auth = Buffer.from(`${FAPSHI_API_USER}:${FAPSHI_API_KEY}`).toString(
      "base64",
    );

    const response = await fetch(`${FAPSHI_API_URL}/initiate-pay`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: request.amount,
        email: request.email,
        name: request.name,
        phone: request.phone,
        redirectUrl: request.redirectUrl,
        externalId: request.externalId || `TICLEARN-${Date.now()}`,
        webhookUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/payment/webhook",
      }),
    });

    const data = await response.json();

    if (response.ok && data.transId) {
      return {
        success: true,
        transId: data.transId,
        link: data.link || `${FAPSHI_API_URL}/pay/${data.transId}`,
      };
    }

    return {
      success: false,
      message: data.message || "Failed to initiate payment",
    };
  } catch (error) {
    console.error("Fapshi payment error:", error);
    return {
      success: false,
      message: "Payment initiation failed",
    };
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
