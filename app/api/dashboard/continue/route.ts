import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardContinue } from "@/lib/dashboard-data";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await getDashboardContinue(session.user.id);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Dashboard continue GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch your dashboard" },
      { status: 500 },
    );
  }
}
