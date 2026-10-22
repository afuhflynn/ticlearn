import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/readiness";
import { attachTopicsToNote, pruneOrphanTopics } from "@/lib/topics";

async function main() {
  const email = `verify-m1-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: { name: "M1 Verify", email, emailVerified: true },
  });

  const noteA = await prisma.note.create({
    data: {
      userId: user.id,
      title: "Photosynthesis A",
      fileUrl: "https://example.com/a.pdf",
      fileName: "a.pdf",
      fileType: "PDF",
      keyPoints: [],
    },
  });
  const noteB = await prisma.note.create({
    data: {
      userId: user.id,
      title: "Photosynthesis B",
      fileUrl: "https://example.com/b.pdf",
      fileName: "b.pdf",
      fileType: "PDF",
      keyPoints: [],
    },
  });

  const idsA = await attachTopicsToNote(noteA.id, [
    "Photosynthesis",
    "Chlorophyll",
  ]);
  await attachTopicsToNote(noteB.id, ["Photosynthesis", "Light Reaction"]);

  const joins = await prisma.topicNote.count({
    where: { note: { userId: user.id } },
  });
  const photosynthesis = await prisma.topic.findFirst({
    where: { nameSlug: "photosynthesis" },
  });
  if (!photosynthesis || !idsA[0]) {
    throw new Error(
      "Expected seeded photosynthesis topic and attached topic IDs",
    );
  }
  console.log("topic joins:", joins, "(expect 4)");
  console.log(
    "one shared topic row:",
    photosynthesis?.id,
    "count:",
    await prisma.topic.count({ where: { nameSlug: "photosynthesis" } }),
  );

  const otherUsers = await prisma.user.count({
    where: { id: { not: user.id } },
  });
  const isolation = await prisma.topicNote.findUnique({
    where: {
      topicId_noteId: { topicId: idsA[0], noteId: noteA.id },
    },
    select: { note: { select: { userId: true } } },
  });
  console.log(
    "join resolves to owner:",
    isolation?.note.userId === user.id,
    "| users in db:",
    otherUsers + 1,
  );

  await prisma.topicPerformance.create({
    data: {
      noteId: noteA.id,
      topicId: idsA[0],
      masteryScore: 30,
      totalAttempts: 4,
      correctAttempts: 1,
      lastPracticedAt: new Date(),
    },
  });
  await prisma.topicPerformance.create({
    data: {
      noteId: noteB.id,
      topicId: photosynthesis?.id,
      masteryScore: 90,
      totalAttempts: 4,
      correctAttempts: 4,
      lastPracticedAt: new Date(),
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      noteId: noteA.id,
      noteTitle: noteA.title,
      title: "Quiz from A",
      questionCount: 1,
    },
  });
  const question = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      type: "MCQ",
      question: "What is chlorophyll?",
      options: ["A pigment", "A sugar"],
      correctAnswer: "A pigment",
      order: 1,
    },
  });
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      quizTitle: quiz.title,
      noteTitle: noteA.title,
      score: 100,
      totalQuestions: 1,
      correctAnswers: 1,
    },
  });
  await prisma.quizAttemptAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: question.id,
      question: question.question,
      userAnswer: "A pigment",
      correctAnswer: question.correctAnswer,
      isCorrect: true,
    },
  });

  const before = await computeReadiness(user.id);
  console.log(
    "readiness before delete:",
    before.readiness,
    "topics:",
    before.topicReadiness.map((t) => `${t.topic}=${t.score} notes:${t.notes}`),
  );

  await prisma.note.delete({ where: { id: noteA.id } });
  await pruneOrphanTopics(idsA);

  const afterJoins = await prisma.topicNote.count({
    where: { noteId: noteA.id },
  });
  const afterPerf = await prisma.topicPerformance.count({
    where: { noteId: noteA.id },
  });
  const keptAttempt = await prisma.quizAttempt.findUnique({
    where: { id: attempt.id },
    include: { answers: true },
  });
  const siblingPerf = await prisma.topicPerformance.count({
    where: { noteId: noteB.id },
  });
  console.log(
    "after deleting note A -> joins:",
    afterJoins,
    "performances:",
    afterPerf,
    "quiz gone:",
    (await prisma.quiz.count({ where: { id: quiz.id } })) === 0,
  );
  console.log(
    "attempt kept:",
    keptAttempt !== null,
    "| quizId nulled:",
    keptAttempt?.quizId === null,
    "| answers readable:",
    keptAttempt?.answers[0]?.question,
    "=>",
    keptAttempt?.answers[0]?.correctAnswer,
  );
  console.log("sibling note B untouched, performances:", siblingPerf);

  const after = await computeReadiness(user.id);
  console.log("readiness after delete:", after.readiness, after.topicReadiness);

  const fresh = await computeReadiness("no-such-user");
  console.log("readiness for a user with no practice:", fresh.needsAssessment);

  const orphansForUser = await prisma.topic.count({
    where: { notes: { none: {} } },
  });
  console.log("note rooted topics with no note left:", orphansForUser);

  await prisma.user.delete({ where: { id: user.id } });
  await pruneOrphanTopics([...idsA, photosynthesis?.id]);
  console.log(
    "scratch rows removed, user exists:",
    await prisma.user.count({ where: { id: user.id } }),
  );
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
