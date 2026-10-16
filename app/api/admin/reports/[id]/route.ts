import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReport } from "@/lib/reports/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const entry = getReport(id);
    if (!entry)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (entry.status === "COMPLETED" && entry.buffer) {
      return NextResponse.json({
        id,
        status: entry.status,
        downloadUrl: `data:application/pdf;base64,${entry.buffer}`,
      });
    }
    return NextResponse.json({ id, status: entry.status, error: entry.error });
  } catch (error) {
    console.error("Report status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 },
    );
  }
}
