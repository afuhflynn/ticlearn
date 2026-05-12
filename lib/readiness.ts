import { prisma } from "./prisma";

export interface ReadinessResult {
  readiness: number;
  weakestTopic: string | null;
  weakestProgram: string | null;
  programReadiness: Array<{ program: string; readiness: number }>;
  needsAssessment: boolean;
}

export async function computeReadiness(examProfileId: string): Promise<ReadinessResult> {
  const profilePrograms = await prisma.examProfileProgram.findMany({
    where: { examProfileId },
    include: { program: true },
  });

  if (profilePrograms.length === 0) {
    return { readiness: 50, weakestTopic: null, weakestProgram: null, programReadiness: [], needsAssessment: true };
  }

  const programReadiness: Array<{ program: string; readiness: number }> = [];

  for (const pp of profilePrograms) {
    const baselines = await prisma.userTopicBaseline.findMany({
      where: {
        examProfileId,
        topic: { component: { programId: pp.programId } },
      },
      include: { topic: { select: { name: true } } },
    });

    let readiness: number;
    if (baselines.length > 0) {
      const avg = baselines.reduce((s, b) => s + Math.min(Math.max(b.confidence, 0), 5), 0) / baselines.length;
      readiness = Math.round((avg / 5) * 100);
    } else if (pp.confidence) {
      readiness = Math.round((pp.confidence / 5) * 100);
    } else {
      readiness = 60;
    }

    programReadiness.push({ program: pp.program.name, readiness });
  }

  const overall = Math.round(programReadiness.reduce((s, p) => s + p.readiness, 0) / programReadiness.length);
  const weakest = programReadiness.reduce((min, p) => (p.readiness < min.readiness ? p : min));

  const weakestBaseline = await prisma.userTopicBaseline.findFirst({
    where: { examProfileId },
    orderBy: { confidence: "asc" },
    include: { topic: { select: { name: true } } },
  });

  return {
    readiness: Math.min(100, Math.max(0, overall)),
    weakestTopic: weakestBaseline?.topic.name ?? null,
    weakestProgram: weakest.program,
    programReadiness,
    needsAssessment: false,
  };
}

export async function getProfileDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) return null;

  const [profile, readiness] = await Promise.all([
    prisma.examProfile.findUnique({
      where: { id: user.activeProfileId },
      include: {
        programs: {
          include: { program: { include: { examLevel: true } } },
        },
        topicBaselines: { include: { topic: true } },
      },
    }),
    computeReadiness(user.activeProfileId),
  ]);

  if (!profile) return null;

  const daysRemaining = profile.examDate
    ? Math.ceil((profile.examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    id: profile.id,
    examLevel: profile.programs[0]?.program.examLevel.name ?? null,
    programs: profile.programs.map((p) => ({
      id: p.programId,
      name: p.program.name,
      confidence: p.confidence ?? 3,
    })),
    examYear: profile.examYear,
    examDate: profile.examDate,
    daysRemaining,
    isRetaking: profile.isRetaking,
    studyHoursPerWeek: profile.studyHoursPerWeek,
    ...readiness,
  };
}
