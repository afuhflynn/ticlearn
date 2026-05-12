import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    image: z.string().url().optional(),
  })
  .strict();

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    const stats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    });

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let examLevel: string | null = null;
    let program: string | null = null;
    let examYear: number | null = null;
    let daysRemaining: number | null = null;
    let isRetaking = false;
    let studyHoursPerWeek: number | null = null;

    if (user.id) {
      const profileUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { activeProfileId: true },
      });
      if (profileUser?.activeProfileId) {
        const ep = await prisma.examProfile.findUnique({
          where: { id: profileUser.activeProfileId },
          include: { program: { include: { examLevel: true } } },
        });
        if (ep) {
          examLevel = ep.program.examLevel.name;
          program = ep.program.name;
          examYear = ep.examYear;
          daysRemaining = ep.examDate
            ? Math.ceil((ep.examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          isRetaking = ep.isRetaking;
          studyHoursPerWeek = ep.studyHoursPerWeek;
        }
      }
    }

    return NextResponse.json({
      user,
      settings,
      stats,
      affiliate,
      examLevel,
      program,
      examYear,
      daysRemaining,
      isRetaking,
      studyHoursPerWeek,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    const body = await req.json();
    const { name, image } = updateProfileSchema.parse(body);

    const updateData: { name?: string; image?: string } = {};
    if (name) updateData.name = name;
    if (image) updateData.image = image;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("Profile PUT error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
