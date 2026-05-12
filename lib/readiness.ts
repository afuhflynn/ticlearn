import { prisma } from "./prisma";

export async function computeReadiness(examProfileId: string) {
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
