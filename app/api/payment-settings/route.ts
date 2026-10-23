import { NextResponse } from "next/server";
import { withReadCache } from "@/lib/cache/reads";
import { prisma } from "@/lib/prisma";

/**
 * The mobile money details a payer needs. Public, so no session check runs
 * before the cache read, and the cached value is the four field payload rather
 * than the Prisma row, including the all null shape for a database with no row.
 */
async function loadPaymentDetails() {
  const settings = await prisma.paymentSettings.findUnique({
    where: { key: "global" },
  });

  if (!settings) {
    return {
      mtnNumber: null,
      mtnHolderName: null,
      orangeNumber: null,
      orangeHolderName: null,
    };
  }

  return {
    mtnNumber: settings.mtnNumber,
    mtnHolderName: settings.mtnHolderName,
    orangeNumber: settings.orangeNumber,
    orangeHolderName: settings.orangeHolderName,
  };
}

export async function GET() {
  try {
    const details = await withReadCache(
      "read:payment-settings",
      { kind: "global" },
      loadPaymentDetails,
    );

    return NextResponse.json(details);
  } catch (error) {
    console.error("Payment settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 },
    );
  }
}
