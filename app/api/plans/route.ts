import { NextResponse } from "next/server";
import { getResolvedPlans } from "@/lib/resolved-plans";

export async function GET() {
  try {
    const tiers = await getResolvedPlans();
    return NextResponse.json({
      tiers: tiers.map((t) => ({
        key: t.key,
        label: t.label,
        priceXaf: t.priceXaf,
        period: t.period,
        periodDays: t.periodDays ?? null,
        semesterMonths: t.semesterMonths ?? null,
        credits: t.credits,
        features: t.features,
        cta: t.cta,
        popular: t.popular ?? false,
        notForSale: t.notForSale ?? false,
        limits: t.limits,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the catalogue" },
      { status: 500 },
    );
  }
}
