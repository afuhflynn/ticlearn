import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invite = await prisma.adminInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 400 },
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `This invitation has already been ${invite.status.toLowerCase()}`,
        },
        { status: 400 },
      );
    }

    if (invite.expiresAt < new Date()) {
      await prisma.adminInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 },
      );
    }

    if (invite.email !== session.user.email) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 400 },
      );
    }

    // Update user role to ADMIN
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "ADMIN" },
    });

    // Mark invite as ACCEPTED
    await prisma.adminInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}
