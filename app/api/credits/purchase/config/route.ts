import { NextResponse } from "next/server";
import {
  creditsFromXaf,
  ensurePlatformSettings,
  getPlatformSettings,
} from "@/lib/platform-settings";

/**
 * Public pricing for pay-as-you-go credits (no auth).
 * Mirrors the server calculation used at purchase time.
 */
export async function GET() {
  try {
    await ensurePlatformSettings();
    const s = await getPlatformSettings();

    const minXafEffective = Math.max(100, s.minCreditPurchaseXaf);
    const example500 = creditsFromXaf(500, s.creditsPer1000Xaf);
    const example5000 = creditsFromXaf(5000, s.creditsPer1000Xaf);

    return NextResponse.json({
      creditsPer1000Xaf: s.creditsPer1000Xaf,
      minCreditPurchaseXaf: s.minCreditPurchaseXaf,
      maxCreditPurchaseXaf: s.maxCreditPurchaseXaf,
      /** Fapshi minimum is 100 XAF; we expose the effective lower bound. */
      minXafEffective,
      examples: {
        at500Xaf: example500,
        at5000Xaf: example5000,
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
