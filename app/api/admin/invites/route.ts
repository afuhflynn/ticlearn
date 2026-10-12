import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if invite already exists
    const existingInvite = await prisma.adminInvite.findUnique({
      where: { email },
    });

    if (existingInvite && existingInvite.status === "PENDING") {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 },
      );
    }

    // Create token and invite
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = await prisma.adminInvite.upsert({
      where: { email },
      create: {
        email,
        token,
        invitedBy: session.user.id,
        expiresAt,
        status: "PENDING",
      },
      update: {
        token,
        invitedBy: session.user.id,
        expiresAt,
        status: "PENDING",
      },
    });

    // Send email via Inngest
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/admin/accept-invite?token=${token}`;

    await inngest.send({
      name: "email.send.admin-invite",
      data: {
        email,
        inviterName: session.user.name || "A TiCLearn Admin",
        inviteLink,
      },
    });

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error("Admin invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invites = await prisma.adminInvite.findMany({
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Admin invites fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}
