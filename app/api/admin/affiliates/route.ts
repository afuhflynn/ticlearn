import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, code, momoNumber, momoName } = await req.json();

    if (!userId || !code || !momoNumber || !momoName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already an affiliate
    const existingAffiliate = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existingAffiliate) {
      return NextResponse.json(
        { error: "User is already an affiliate" },
        { status: 400 },
      );
    }

    // Check if code is unique
    const existingCode = await prisma.affiliate.findUnique({
      where: { code },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Affiliate code already in use" },
        { status: 400 },
      );
    }

    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        userEmail: user.email,
        userName: user.name,
        code,
        momoNumber,
        momoName,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, affiliate });
  } catch (error) {
    console.error("Create affiliate error:", error);
    return NextResponse.json(
      { error: "Failed to create affiliate" },
      { status: 500 },
    );
  }
}
