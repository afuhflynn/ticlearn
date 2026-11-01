import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateUniqueAffiliateCode,
  normalizeEmail,
} from "@/lib/affiliates/invite";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

const claimSchema = z.object({ token: z.string().min(10).max(128) });

export async function POST(req: Request) {
  const rateLimitResponse = await limit(
    "default",
    new Request(req.url, { method: req.method, headers: req.headers }) as never,
  ).catch(() => null);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json(
        { error: "Sign in to claim your partner link" },
        { status: 401 },
      );

    const body = await req.json().catch(() => ({}));
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "This invite link is not valid" },
        { status: 400 },
      );

    const invite = await prisma.partnerInvite.findUnique({
      where: { token: parsed.data.token },
    });
    if (!invite)
      return NextResponse.json(
        { error: "This invite link is not valid" },
        { status: 404 },
      );
    if (invite.status !== "PENDING")
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 409 },
      );
    if (invite.expiresAt <= new Date()) {
      await prisma.partnerInvite
        .update({ where: { id: invite.id }, data: { status: "EXPIRED" } })
        .catch(() => {});
      return NextResponse.json(
        { error: "This invite has expired. Ask the team for a fresh one." },
        { status: 410 },
      );
    }

    const userEmail = normalizeEmail(session.user.email);
    if (userEmail !== normalizeEmail(invite.email)) {
      return NextResponse.json(
        {
          error:
            "This invite was sent to a different email address. Sign in with the invited address, or ask support for help.",
        },
        { status: 403 },
      );
    }

    const existingAffiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });
    if (existingAffiliate)
      return NextResponse.json(
        { error: "This account is already a partner" },
        { status: 409 },
      );

    if (invite.acceptedUserId && invite.acceptedUserId !== session.user.id)
      return NextResponse.json(
        { error: "This invite was already claimed" },
        { status: 409 },
      );

    let affiliate = await prisma.affiliate
      .findUnique({ where: { userId: session.user.id } })
      .catch(() => null);
    if (!affiliate) {
      const code = await generateUniqueAffiliateCode();
      affiliate = await prisma.affiliate.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name,
          code,
          momoNumber: "",
          momoName: session.user.name,
          status: "PENDING",
        },
      });
    }

    await prisma.partnerInvite.update({
      where: { id: invite.id },
      data: { acceptedUserId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        status: affiliate.status,
        code: affiliate.code,
      },
    });
  } catch (error) {
    console.error("Partner claim error:", error);
    return NextResponse.json(
      { error: "Could not claim this invite" },
      { status: 500 },
    );
  }
}
