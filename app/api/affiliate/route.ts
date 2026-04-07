import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

function generateAffiliateCode(): string {
  return `TIC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });

    if (!affiliate) {
      affiliate = await prisma.affiliate.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || "User",
          code: generateAffiliateCode(),
          status: "ACTIVE",
          momoNumber: "",
          momoName: "",
        },
      });
    }

    return NextResponse.json({ affiliate });
  } catch (error) {
    console.error("Affiliate GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { momoNumber, momoName } = await req.json();

    if (!momoNumber || !momoName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const affiliate = await prisma.affiliate.upsert({
      where: { userId: session.user.id },
      update: { momoNumber, momoName },
      create: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name || "User",
        code: generateAffiliateCode(),
        status: "ACTIVE",
        momoNumber: momoNumber || "",
        momoName: momoName || "",
      },
    });

    return NextResponse.json({ affiliate, success: true });
  } catch (error) {
    console.error("Affiliate PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update affiliate" },
      { status: 500 },
    );
  }
}
