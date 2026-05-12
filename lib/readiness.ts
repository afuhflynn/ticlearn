import { prisma } from "./prisma";

export interface ReadinessResult {
  readiness: number;
  weakestTopic: string | null;
  needsAssessment: boolean;
}

export async function computeReadiness(examProfileId: string): Promise<ReadinessResult> {
  const baselines = await prisma.userTopicBaseline.findMany({
    where: { examProfileId },
    include: { topic: { select: { name: true } } },
  });

  if (baselines.length === 0) {
    return { readiness: 50, weakestTopic: null, needsAssessment: true };
  }

  const avg = baselines.reduce((sum, b) => sum + b.confidence, 0) / baselines.length;
  const readiness = Math.round((avg / 5) * 100);

  const weakest = baselines.reduce((min, b) => (b.confidence < min.confidence ? b : min));
  const weakestTopic = weakest.topic.name;

  return { readiness, weakestTopic, needsAssessment: false };
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
        program: { include: { examLevel: true } },
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
    examLevel: profile.program.examLevel.name,
    program: profile.program.name,
    examYear: profile.examYear,
    examDate: profile.examDate,
    daysRemaining,
    isRetaking: profile.isRetaking,
    studyHoursPerWeek: profile.studyHoursPerWeek,
    ...readiness,
  };
}
