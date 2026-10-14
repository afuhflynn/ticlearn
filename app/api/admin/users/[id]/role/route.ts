import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    if (!role || (role !== "ADMIN" && role !== "USER")) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { id } = await params;
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    // Send notification email via Inngest
    await inngest.send({
      name: "email.send.role-update",
      data: {
        email: user.email,
        name: user.name,
        newRole: role,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 },
    );
  }
}
