import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let settings = await prisma.paymentSettings.findUnique({
      where: { key: "global" },
    });

    if (!settings) {
      settings = await prisma.paymentSettings.create({
        data: { key: "global" },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Payment settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
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

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mtnNumber, mtnHolderName, orangeNumber, orangeHolderName } =
      await req.json();

    const settings = await prisma.paymentSettings.upsert({
      where: { key: "global" },
      create: {
        key: "global",
        mtnNumber: mtnNumber?.trim() || null,
        mtnHolderName: mtnHolderName?.trim() || null,
        orangeNumber: orangeNumber?.trim() || null,
        orangeHolderName: orangeHolderName?.trim() || null,
      },
      update: {
        mtnNumber: mtnNumber?.trim() || null,
        mtnHolderName: mtnHolderName?.trim() || null,
        orangeNumber: orangeNumber?.trim() || null,
        orangeHolderName: orangeHolderName?.trim() || null,
      },
    });

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error("Payment settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update payment settings" },
      { status: 500 },
    );
  }
}
