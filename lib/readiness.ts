import { prisma } from "./prisma";

export interface ReadinessResult {
  readiness: number;
  weakestTopic: { name: string; score: number } | null;
  strongestTopic: { name: string; score: number } | null;
  topicReadiness: Array<{ topic: string; score: number; notes: number }>;
  needsAssessment: boolean;
}

const PERFORMANCE_WEIGHT = 0.75;
const RECENCY_WEIGHT = 0.25;
const RECENCY_FLOOR_DAYS = 14;

function performanceScore(row: {
  masteryScore: number;
  totalAttempts: number;
  correctAttempts: number;
}): number {
  if (row.totalAttempts <= 0) return row.masteryScore;
  const accuracy = (row.correctAttempts / row.totalAttempts) * 100;
  return accuracy * 0.6 + row.masteryScore * 0.4;
}

function recencyScore(score: number, lastPracticedAt: Date | null): number {
  if (!lastPracticedAt) return score;
  const daysSince =
    (Date.now() - lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= RECENCY_FLOOR_DAYS) return score;
  const decay = Math.max(1.0 - (daysSince - RECENCY_FLOOR_DAYS) * 0.005, 0.7);
  return score * decay;
}

function clamp(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Readiness is measured from what the student actually practised: the topics
 * extracted from their own notes. Mastery is tracked per note, so a topic that
 * appears in two notes is averaged here rather than merged into one record.
 */
export async function computeReadiness(
  userId: string,
): Promise<ReadinessResult> {
  const performances = await prisma.topicPerformance.findMany({
    where: { note: { userId } },
    select: {
      noteId: true,
      masteryScore: true,
      totalAttempts: true,
      correctAttempts: true,
      lastPracticedAt: true,
      topic: { select: { name: true } },
    },
  });

  if (performances.length === 0) {
    return {
      readiness: 50,
      weakestTopic: null,
      strongestTopic: null,
      topicReadiness: [],
      needsAssessment: true,
    };
  }

  const byTopic = new Map<string, { scores: number[]; notes: Set<string> }>();

  for (const row of performances) {
    const performance = performanceScore(row);
    const score =
      performance * PERFORMANCE_WEIGHT +
      recencyScore(performance, row.lastPracticedAt) * RECENCY_WEIGHT;

    const bucket = byTopic.get(row.topic.name) ?? {
      scores: [],
      notes: new Set<string>(),
    };
    bucket.scores.push(score);
    bucket.notes.add(row.noteId);
    byTopic.set(row.topic.name, bucket);
  }

  const topicReadiness = [...byTopic.entries()]
    .map(([topic, bucket]) => ({
      topic,
      score: clamp(
        bucket.scores.reduce((sum, s) => sum + s, 0) / bucket.scores.length,
      ),
      notes: bucket.notes.size,
    }))
    .sort((a, b) => a.score - b.score);

  const readiness = clamp(
    topicReadiness.reduce((sum, t) => sum + t.score, 0) / topicReadiness.length,
  );

  const strongest = topicReadiness[topicReadiness.length - 1] ?? null;
  const weakest = topicReadiness[0] ?? null;

  return {
    readiness,
    weakestTopic: weakest
      ? { name: weakest.topic, score: weakest.score }
      : null,
    strongestTopic: strongest
      ? { name: strongest.topic, score: strongest.score }
      : null,
    topicReadiness,
    needsAssessment: false,
  };
}
