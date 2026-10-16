import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { randomUUID } from "node:crypto";

const REPORT_TYPES = {
  users: "users",
  feedback: "feedback",
  subscriptions: "subscriptions",
  affiliates: "affiliates",
} as const;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await req.json();
    if (!type || !REPORT_TYPES[type as keyof typeof REPORT_TYPES]) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    const reportId = randomUUID();
    try {
      await inngest.send({
        name: "admin/report.generate",
        data: { reportId, type },
      });
    } catch (e) {
      console.error("Inngest send error:", e);
    }

    return NextResponse.json({ reportId, status: "PROCESSING" });
  } catch (error) {
    console.error("Report request error:", error);
    return NextResponse.json(
      { error: "Failed to request report" },
      { status: 500 },
    );
  }
}
