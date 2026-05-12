import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export const harvestNoteKnowledge = inngest.createFunction(
  {
    name: "Harvest Note Knowledge",
    id: "harvest-note-knowledge",
    triggers: {
      event: "note/harvest-knowledge",
    },
  },
  async ({ event }) => {
    const { noteId } = event.data as { noteId: string };

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        title: true,
        summary: true,
        topics: true,
        keyPoints: true,
        extractedText: true,
        subject: true,
      },
    });

    if (!note || !note.summary) {
      console.log(`[Harvest] Note ${noteId} has no summary, skipping.`);
      return { success: false, reason: "no_summary" };
    }

    let chunksCreated = 0;

    for (const topicName of note.topics) {
      const topics = await prisma.topic.findMany({
        where: {
          name: { contains: topicName, mode: "insensitive" },
          component: { program: { name: { contains: note.subject, mode: "insensitive" } } },
        },
        take: 1,
      });

      if (topics.length === 0) continue;

      const topic = topics[0];

      // Summary chunk
      await prisma.knowledgeChunk.upsert({
        where: {
          id: `note_summary_${note.id}_${topic.id}`,
        },
        update: { content: note.summary },
        create: {
          id: `note_summary_${note.id}_${topic.id}`,
          topicId: topic.id,
          sourceType: "NOTE",
          sourceId: note.id,
          title: `${note.title} — Summary`,
          content: note.summary,
          contentType: "SUMMARY",
        },
      });
      chunksCreated++;

      // Key points chunks
      for (let i = 0; i < note.keyPoints.length; i++) {
        const point = note.keyPoints[i];
        await prisma.knowledgeChunk.upsert({
          where: { id: `note_kp_${note.id}_${topic.id}_${i}` },
          update: { content: point },
          create: {
            id: `note_kp_${note.id}_${topic.id}_${i}`,
            topicId: topic.id,
            sourceType: "NOTE",
            sourceId: note.id,
            title: `${note.title} — Key Point ${i + 1}`,
            content: point,
            contentType: "TOPIC_EXPLANATION",
          },
        });
        chunksCreated++;
      }
    }

    console.log(`[Harvest] Created ${chunksCreated} knowledge chunks from note ${noteId}`);
    return { success: true, chunksCreated };
  },
);

export const harvestPaper3Knowledge = inngest.createFunction(
  {
    name: "Harvest Paper 3 Knowledge",
    id: "harvest-paper3-knowledge",
    triggers: {
      event: "paper3/harvest-knowledge",
    },
  },
  async ({ event }) => {
    const { sourceId } = event.data as { sourceId: string };

    const questions = await prisma.paper3Question.findMany({
      where: { sourceId },
      select: {
        id: true,
        title: true,
        explanation: true,
        content: true,
        contentMd: true,
        expectedAnswer: true,
        concepts: true,
      },
    });

    let chunksCreated = 0;

    for (const question of questions) {
      const explanation = question.explanation || question.expectedAnswer;
      if (!explanation) continue;

      for (const conceptName of question.concepts) {
        const topics = await prisma.topic.findMany({
          where: {
            name: { contains: conceptName, mode: "insensitive" },
          },
          take: 1,
        });

        if (topics.length === 0) continue;

        const topic = topics[0];

        await prisma.knowledgeChunk.upsert({
          where: { id: `p3_${question.id}_${topic.id}` },
          update: { content: explanation },
          create: {
            id: `p3_${question.id}_${topic.id}`,
            topicId: topic.id,
            sourceType: "PAPER3_QUESTION",
            sourceId: question.id,
            title: question.title,
            content: explanation,
            contentType: "TOPIC_EXPLANATION",
          },
        });
        chunksCreated++;
      }
    }

    console.log(`[Harvest] Created ${chunksCreated} knowledge chunks from Paper3 source ${sourceId}`);
    return { success: true, chunksCreated };
  },
);
