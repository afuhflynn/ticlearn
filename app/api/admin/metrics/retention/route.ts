import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeCohortRetention } from "@/lib/kpi";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const granularity = searchParams.get("granularity") || "weekly";

    const retention = await computeCohortRetention();

    return NextResponse.json({ retention, granularity });
  } catch (error) {
    console.error("Retention GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch retention data" },
      { status: 500 },
    );
  }
}
