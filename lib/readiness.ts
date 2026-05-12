import { prisma } from "./prisma";

export interface ReadinessResult {
  readiness: number;
  weakestTopic: { name: string; score: number } | null;
  weakestProgram: string | null;
  strongestTopic: { name: string; score: number } | null;
  programReadiness: Array<{ program: string; readiness: number }>;
  topicReadiness: Array<{ topic: string; score: number; program: string }>;
  needsAssessment: boolean;
  highRisk: boolean;
  daysUntilExam: number | null;
}

export async function computeReadiness(examProfileId: string): Promise<ReadinessResult> {
  const [profilePrograms, performances, profile] = await Promise.all([
    prisma.examProfileProgram.findMany({
      where: { examProfileId },
      include: { program: true },
    }),
    prisma.topicPerformance.findMany({
      where: { examProfileId },
      include: { topic: { select: { name: true, component: { select: { programId: true } } } } },
    }),
    prisma.examProfile.findUnique({
      where: { id: examProfileId },
      select: { examDate: true },
    }),
  ]);

  if (profilePrograms.length === 0) {
    return {
      readiness: 50, weakestTopic: null, weakestProgram: null, strongestTopic: null,
      programReadiness: [], topicReadiness: [], needsAssessment: true,
      highRisk: false, daysUntilExam: null,
    };
  }

  const daysUntilExam = profile?.examDate
    ? Math.ceil((profile.examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const topicReadiness: Array<{ topic: string; score: number; program: string }> = [];

  for (const pp of profilePrograms) {
    const baselines = await prisma.userTopicBaseline.findMany({
      where: { examProfileId, topic: { component: { programId: pp.programId } } },
      include: { topic: { select: { name: true } } },
    });

    const programTopics = performances.filter(p =>
      p.topic.component.programId === pp.programId
    );

    const allTopicNames = [...new Set([
      ...baselines.map(b => b.topic.name),
      ...programTopics.map(p => p.topic.name),
    ])];

    for (const topicName of allTopicNames) {
      const baseline = baselines.find(b => b.topic.name === topicName);
      const perf = programTopics.find(p => p.topic.name === topicName);

      // Pillar 1: Baseline confidence (35%)
      const baselineScore = baseline
        ? (Math.min(Math.max(baseline.confidence, 0), 5) / 5) * 100
        : 50;

      // Pillar 2: Performance score (45%)
      let performanceScore = 50;
      if (perf && perf.totalAttempts > 0) {
        performanceScore = (perf.correctAttempts / perf.totalAttempts) * 100;
        // Blend with mastery score for partial data
        performanceScore = (performanceScore * 0.6) + (perf.masteryScore * 0.4);
      } else if (perf) {
        performanceScore = perf.masteryScore;
      }

      // Pillar 3: Recency weighting (20%)
      let recencyScore = performanceScore;
      if (perf?.lastPracticedAt) {
        const daysSince = (Date.now() - perf.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 14) {
          const decayFactor = Math.max(1.0 - ((daysSince - 14) * 0.005), 0.7);
          recencyScore = performanceScore * decayFactor;
        }
      }

      const combined = Math.round(
        (baselineScore * 0.35) + (performanceScore * 0.45) + (recencyScore * 0.20)
      );

      topicReadiness.push({
        topic: topicName,
        score: Math.min(100, Math.max(0, combined)),
        program: pp.program.name,
      });
    }
  }

  // Program readiness
  const programReadiness = profilePrograms.map(pp => {
    const progTopics = topicReadiness.filter(t => t.program === pp.program.name);
    const avg = progTopics.length > 0
      ? Math.round(progTopics.reduce((s, t) => s + t.score, 0) / progTopics.length)
      : 50;
    return { program: pp.program.name, readiness: avg };
  });

  const overall = programReadiness.length > 0
    ? Math.round(programReadiness.reduce((s, p) => s + p.readiness, 0) / programReadiness.length)
    : 50;

  const sortedByScore = [...topicReadiness].sort((a, b) => a.score - b.score);
  const weakest = sortedByScore[0] ?? null;
  const strongest = sortedByScore[sortedByScore.length - 1] ?? null;

  const weakestProgram = programReadiness.reduce((min, p) =>
    p.readiness < min.readiness ? p : min
  );

  return {
    readiness: overall,
    weakestTopic: weakest ? { name: weakest.topic, score: weakest.score } : null,
    weakestProgram: weakestProgram.program,
    strongestTopic: strongest ? { name: strongest.topic, score: strongest.score } : null,
    programReadiness,
    topicReadiness,
    needsAssessment: false,
    highRisk: daysUntilExam !== null && daysUntilExam < 30 && overall < 50,
    daysUntilExam,
  };
}
