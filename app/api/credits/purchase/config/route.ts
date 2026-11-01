import { NextResponse } from "next/server";
import {
  CREDIT_MAX_XAF,
  CREDIT_MIN_XAF,
  CREDIT_STEP_XAF,
  CREDIT_XAF_RATE,
  creditsForXaf,
} from "@/lib/mobile-money";

/**
 * Public pricing for typed credit buys (no auth).
 * Mirrors the server calculation used at purchase time:
 * credits equal amount times 5, 500 to 20000 in 100 steps.
 */
export async function GET() {
  try {
    return NextResponse.json({
      rate: CREDIT_XAF_RATE,
      minXaf: CREDIT_MIN_XAF,
      maxXaf: CREDIT_MAX_XAF,
      stepXaf: CREDIT_STEP_XAF,
      examples: {
        at500Xaf: creditsForXaf(500),
        at3000Xaf: creditsForXaf(3000),
      },
    });
  } catch (error) {
    console.error("Credits purchase config GET error:", error);
    return NextResponse.json(
      { error: "Failed to load credit purchase settings" },
      { status: 500 },
    );
  }
}
