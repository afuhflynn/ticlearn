import { NextResponse } from "next/server";
import { z } from "zod";
import {
  affiliateClaimUrl,
  affiliateInviteDays,
} from "@/lib/affiliates/config";
import { newPartnerToken, normalizeEmail } from "@/lib/affiliates/invite";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-admin";

const inviteSchema = z.object({ email: z.string().email().max(255) });

async function adminRateLimit(request: Request): Promise<NextResponse | null> {
  const nextReq = new Request(request.url, {
    method: request.method,
    headers: request.headers,
  });
  return limit("admin", nextReq as never);
}

export async function GET(req: Request) {
  const rateLimitResponse = await adminRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      20,
      Math.max(
        1,
        Number(
          searchParams.get("limit") ?? searchParams.get("pageSize") ?? 20,
        ) || 20,
      ),
    );
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const status = (searchParams.get("status") ?? "").trim().toUpperCase();

    const where = {
      ...(search && {
        email: { contains: search, mode: "insensitive" as const },
      }),
      ...(status && { status: status as never }),
    };

    const [invites, total] = await Promise.all([
      prisma.partnerInvite.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.partnerInvite.count({ where }),
    ]);

    return NextResponse.json({
      invites,
      total,
      page,
      limit: pageSize,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin partner invites GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const rateLimitResponse = await adminRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    const email = normalizeEmail(parsed.data.email);

    const live = await prisma.partnerInvite.findFirst({
      where: { email, status: "PENDING" },
      select: { id: true, expiresAt: true },
    });
    if (live && live.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "A live invite already exists for this email" },
        { status: 409 },
      );
    }

    const token = newPartnerToken();
    const expiresAt = new Date(
      Date.now() + affiliateInviteDays() * 24 * 60 * 60 * 1000,
    );

    const invite = await prisma.partnerInvite.create({
      data: {
        email,
        token,
        invitedBy: adminCheck.user.id,
        status: "PENDING",
        expiresAt,
      },
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";
    const inviteLink = affiliateClaimUrl(origin, token);

    await inngest
      .send({
        name: "email.send.transactional",
        data: {
          template: "partner-invite",
          to: email,
          props: {
            email,
            inviteLink,
            expiresDate: expiresAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          },
        },
      })
      .catch((error) => console.error("Partner invite email failed:", error));

    console.log(
      JSON.stringify({
        event: "partner_invite_created",
        actorId: adminCheck.user.id,
        email,
        inviteId: invite.id,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        status: invite.status,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Admin partner invites POST error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 },
    );
  }
}
