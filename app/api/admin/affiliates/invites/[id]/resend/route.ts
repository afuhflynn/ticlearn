import { NextResponse } from "next/server";
import {
  affiliateClaimUrl,
  affiliateInviteDays,
} from "@/lib/affiliates/config";
import { newPartnerToken } from "@/lib/affiliates/invite";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_RESENDS_PER_DAY = 3;

export async function POST(_req: Request, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const invite = await prisma.partnerInvite.findUnique({ where: { id } });
    if (!invite)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.status !== "PENDING")
      return NextResponse.json(
        { error: "Only a pending invite can be resent" },
        { status: 409 },
      );

    const since = invite.lastResentAt ?? invite.createdAt;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const resendCount = since > dayAgo ? invite.resendCount : 0;
    if (resendCount >= MAX_RESENDS_PER_DAY)
      return NextResponse.json(
        { error: "Resend limit reached for today. Try again tomorrow." },
        { status: 429 },
      );

    const token = newPartnerToken();
    const expiresAt = new Date(
      Date.now() + affiliateInviteDays() * 24 * 60 * 60 * 1000,
    );
    const updated = await prisma.partnerInvite.update({
      where: { id },
      data: {
        token,
        expiresAt,
        resendCount: resendCount + 1,
        lastResentAt: new Date(),
      },
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
    await inngest
      .send({
        name: "email.send.transactional",
        data: {
          template: "partner-invite",
          to: invite.email,
          props: {
            email: invite.email,
            inviteLink: affiliateClaimUrl(origin, token),
            expiresDate: expiresAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          },
        },
      })
      .catch((error) => console.error("Partner invite resend failed:", error));

    return NextResponse.json({
      success: true,
      invite: { id: updated.id, expiresAt: updated.expiresAt },
    });
  } catch (error) {
    console.error("Partner invite resend error:", error);
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 },
    );
  }
}
