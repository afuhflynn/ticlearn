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

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
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

    const {
      emailNotifications,
      pushNotifications,
      darkMode,
      language,
      timezone,
    } = await req.json();

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        emailNotifications,
        pushNotifications,
        darkMode,
        language,
        timezone,
      },
      create: {
        userId: session.user.id,
        emailNotifications: emailNotifications ?? true,
        pushNotifications: pushNotifications ?? true,
        darkMode: darkMode ?? false,
        language: language ?? "en",
        timezone: timezone ?? "Africa/Douala",
      },
    });

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
