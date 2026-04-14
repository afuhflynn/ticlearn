import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.paymentSettings.findUnique({
      where: { key: "global" },
    });

    if (!settings) {
      return NextResponse.json({
        mtnNumber: null,
        mtnHolderName: null,
        orangeNumber: null,
        orangeHolderName: null,
      });
    }

    return NextResponse.json({
      mtnNumber: settings.mtnNumber,
      mtnHolderName: settings.mtnHolderName,
      orangeNumber: settings.orangeNumber,
      orangeHolderName: settings.orangeHolderName,
    });
  } catch (error) {
    console.error("Payment settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 },
    );
  }
}
