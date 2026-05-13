import { prisma } from "./prisma";

export interface ReadinessResult {
  readiness: number;
  weakestTopic: string | null;
  weakestProgram: string | null;
  programReadiness: Array<{ program: string; readiness: number }>;
  needsAssessment: boolean;
}

export async function computeReadiness(
  examProfileId: string,
): Promise<ReadinessResult> {
  const [profilePrograms, performances] = await Promise.all([
    prisma.examProfileProgram.findMany({
      where: { examProfileId },
      include: { program: true },
    }),
    prisma.topicPerformance.findMany({
      where: { examProfileId },
      include: { topic: { select: { name: true } } },
    }),
  ]);

  if (profilePrograms.length === 0) {
    return {
      readiness: 50,
      weakestTopic: null,
      weakestProgram: null,
      programReadiness: [],
      needsAssessment: true,
    };
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

    // Base readiness from baselines (60% weight)
    const baselineAvg =
      baselines.length > 0
        ? baselines.reduce(
            (s, b) => s + Math.min(Math.max(b.confidence, 0), 5),
            0,
          ) / baselines.length
        : 3;
    const baselineReadiness = (baselineAvg / 5) * 100;

    // Topic performance adjustment (40% weight)
    const topicPerformances = performances.filter((p) =>
      baselines.some((b) => b.topicId === p.topicId),
    );
    const masteryAvg =
      topicPerformances.length > 0
        ? topicPerformances.reduce((s, p) => s + p.masteryScore, 0) /
          topicPerformances.length
        : 50;

    // Combined: 60% baseline, 40% mastery
    const combined = baselineReadiness * 0.6 + masteryAvg * 0.4;
    const ppConfidence = pp.confidence ?? 3;
    const subjectReadiness = (ppConfidence / 5) * 100;

    // If no baselines at all, fall back to subject-level confidence
    const readiness =
      baselines.length > 0
        ? Math.round(combined)
        : topicPerformances.length > 0
          ? Math.round(masteryAvg)
          : Math.round(subjectReadiness);

    programReadiness.push({ program: pp.program.name, readiness });
  }

  const overall = Math.round(
    programReadiness.reduce((s, p) => s + p.readiness, 0) /
      programReadiness.length,
  );
  const weakest = programReadiness.reduce((min, p) =>
    p.readiness < min.readiness ? p : min,
  );

  const weakestPerf = [...performances].sort(
    (a, b) => a.masteryScore - b.masteryScore,
  )[0];

  return {
    readiness: Math.min(100, Math.max(0, overall)),
    weakestTopic: weakestPerf?.topic.name ?? null,
    weakestProgram: weakest.program,
    programReadiness,
    needsAssessment: false,
  };
}
