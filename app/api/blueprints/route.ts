import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId) return NextResponse.json({ error: "No active profile" }, { status: 400 });

    // Get the profile's programs, then find blueprints for those programs' components
    const profilePrograms = await prisma.examProfileProgram.findMany({
      where: { examProfileId: profileId },
      include: {
        program: {
          include: {
            components: {
              include: {
                blueprints: { include: { sections: true } },
              },
            },
          },
        },
      },
    });

    const blueprints = profilePrograms.flatMap(pp =>
      pp.program.components.flatMap(c => c.blueprints),
    );

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("Blueprints GET error:", error);
    return NextResponse.json({ error: "Failed to fetch blueprints" }, { status: 500 });
  }
}
