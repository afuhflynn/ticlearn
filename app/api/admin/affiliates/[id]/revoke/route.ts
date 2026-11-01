import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const revokeSchema = z.object({ reason: z.string().trim().min(3).max(500) });

export async function POST(req: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Add a short reason for revoking this partner" },
        { status: 400 },
      );

    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate)
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    await prisma.affiliate.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    console.log(
      JSON.stringify({
        event: "partner_revoked",
        actorId: adminCheck.user.id,
        affiliateId: id,
        reason: parsed.data.reason,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({ success: true, status: "REVOKED" });
  } catch (error) {
    console.error("Partner revoke error:", error);
    return NextResponse.json(
      { error: "Failed to revoke partner" },
      { status: 500 },
    );
  }
}
