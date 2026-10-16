import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardReadiness } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await getDashboardReadiness(session.user.id);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Readiness GET error:", error);
    return NextResponse.json(
      { error: "Failed to compute readiness" },
      { status: 500 },
    );
  }
}
