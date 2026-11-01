import { NextResponse } from "next/server";
import { generateUniqueAffiliateCode } from "@/lib/affiliates/invite";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const rateLimitResponse = await limit(
    "admin",
    new Request("https://ticlearn.local/admin", { method: "POST" }) as never,
  ).catch(() => null);
  if (rateLimitResponse) return rateLimitResponse;
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const invite = await prisma.partnerInvite.findUnique({ where: { id } });
    if (!invite)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.status !== "PENDING")
      return NextResponse.json(
        { error: "Only a pending invite can be approved" },
        { status: 409 },
      );
    if (invite.expiresAt <= new Date()) {
      await prisma.partnerInvite.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 },
      );
    }
    if (!invite.acceptedUserId)
      return NextResponse.json(
        { error: "The invited person has not claimed this link yet" },
        { status: 409 },
      );

    const user = await prisma.user.findUnique({
      where: { id: invite.acceptedUserId },
    });
    if (!user)
      return NextResponse.json(
        { error: "Claimed account not found" },
        { status: 404 },
      );

    const existing = await prisma.affiliate.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      if (existing.status !== "ACTIVE") {
        const approved = await prisma.affiliate.update({
          where: { id: existing.id },
          data: { status: "ACTIVE" },
        });
        await prisma.partnerInvite.update({
          where: { id },
          data: { status: "ACCEPTED" },
        });
        return NextResponse.json({
          success: true,
          affiliate: { id: approved.id, status: approved.status },
        });
      }
      return NextResponse.json(
        { error: "This person is already an active partner" },
        { status: 409 },
      );
    }

    const code = await generateUniqueAffiliateCode();
    const affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        code,
        momoNumber: "",
        momoName: user.name,
        status: "ACTIVE",
      },
    });
    await prisma.partnerInvite.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    console.log(
      JSON.stringify({
        event: "partner_invite_approved",
        actorId: adminCheck.user.id,
        inviteId: id,
        affiliateId: affiliate.id,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({
      success: true,
      affiliate: { id: affiliate.id, status: affiliate.status },
    });
  } catch (error) {
    console.error("Partner invite approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve invite" },
      { status: 500 },
    );
  }
}
