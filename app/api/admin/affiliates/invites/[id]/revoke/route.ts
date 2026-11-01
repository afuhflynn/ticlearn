import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const revokeSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
});

export async function POST(req: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = revokeSchema.safeParse(body);

    const invite = await prisma.partnerInvite.findUnique({ where: { id } });
    if (!invite)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.status !== "PENDING")
      return NextResponse.json(
        { error: "Only a pending invite can be revoked" },
        { status: 409 },
      );

    await prisma.partnerInvite.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    console.log(
      JSON.stringify({
        event: "partner_invite_revoked",
        actorId: adminCheck.user.id,
        inviteId: id,
        reason: parsed.success ? (parsed.data.reason ?? "") : "",
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({ success: true, status: "REVOKED" });
  } catch (error) {
    console.error("Partner invite revoke error:", error);
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 },
    );
  }
}
