import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/readiness";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      examLevelId,
      programIds,
      examYear,
      examDate,
      baselines,
      isRetaking,
      studyHoursPerWeek,
      skipped,
    } = body;

    const data: {
      examYear?: number | null;
      examDate?: string | null;
      isRetaking?: boolean;
      studyHoursPerWeek?: number | null;
      onboardingCompleted?: boolean;
      onboardingSkipped?: boolean;
      onboardingStep?: number;
    } = {};

    if (examYear) data.examYear = examYear;
    if (examDate) data.examDate = examDate;
    if (typeof isRetaking === "boolean") data.isRetaking = isRetaking;
    if (studyHoursPerWeek) data.studyHoursPerWeek = studyHoursPerWeek;

    if (skipped) {
      data.onboardingSkipped = true;
      data.onboardingCompleted = false;
      data.onboardingStep = 6;
    } else {
      data.onboardingCompleted = true;
      data.onboardingSkipped = false;
      data.onboardingStep = 6;
    }

    const profile = await prisma.$transaction(async (tx) => {
      const existingProfileId = (
        await tx.user.findUnique({
          where: { id: session.user.id },
          select: { activeProfileId: true },
        })
      )?.activeProfileId;

      let profileId = existingProfileId;

      if (profileId) {
        await tx.examProfile.update({
          where: { id: profileId },
          data,
        });
      } else {
        const newProfile = await tx.examProfile.create({
          data: {
            userId: session.user.id,
            ...data,
          },
        });
        profileId = newProfile.id;
        await tx.user.update({
          where: { id: session.user.id },
          data: { activeProfileId: profileId },
        });
      }

      if (programIds?.length > 0) {
        for (const programId of programIds) {
          await tx.examProfileProgram.upsert({
            where: {
              examProfileId_programId: {
                examProfileId: profileId,
                programId,
              },
            },
            update: {},
            create: {
              examProfileId: profileId,
              programId,
            },
          });
        }
      }

      if (baselines?.length > 0) {
        for (const bl of baselines) {
          await tx.userTopicBaseline.upsert({
            where: {
              examProfileId_topicId: {
                examProfileId: profileId,
                topicId: bl.topicId,
              },
            },
            update: { confidence: bl.confidence },
            create: {
              examProfileId: profileId,
              topicId: bl.topicId,
              confidence: bl.confidence,
            },
          });
        }
      }

      return tx.examProfile.findUnique({
        where: { id: profileId },
        include: {
          programs: {
            include: {
              program: true,
            },
          },
        },
      });
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 500 });
    }

    if (skipped) {
      return NextResponse.json({ ok: true, profile });
    }

    const readiness = await computeReadiness(profile.id);
    return NextResponse.json({ ok: true, profile, readiness });
  } catch (error) {
    console.error("Onboarding finalize error:", error);
    return NextResponse.json(
      { error: "Failed to finalize onboarding" },
      { status: 500 },
    );
  }
}
