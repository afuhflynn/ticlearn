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
  async ({ event, step }) => {
    const { noteId } = event.data as { noteId: string };

    const note = await step.run("load-note", async () => {
      return prisma.note.findUnique({
        where: { id: noteId },
        select: {
          id: true,
          title: true,
          summary: true,
          topics: true,
          keyPoints: true,
          subject: true,
        },
      });
    });

    if (!note || !note.summary) {
      console.log(`[Harvest] Note ${noteId} has no summary, skipping.`);
      return { success: false, reason: "no_summary" };
    }

    const result = await step.run("harvest-note-chunks", async () => {
      const topicNames = [...new Set(note.topics)];
      if (topicNames.length === 0) return { chunksCreated: 0 };

      const topics = await prisma.topic.findMany({
        where: {
          OR: topicNames.map((name) => ({
            name: { contains: name, mode: "insensitive" as const },
            component: {
              program: {
                name: {
                  contains: note.subject ?? "",
                  mode: "insensitive" as const,
                },
              },
            },
          })),
        },
        take: topicNames.length,
      });

      const topicMap = new Map<string, string>();
      for (const topic of topics) {
        topicMap.set(topic.name.toLowerCase(), topic.id);
      }

      const chunks: Array<{
        id: string;
        topicId: string;
        sourceType: string;
        sourceId: string;
        title: string;
        content: string;
        contentType: string;
      }> = [];

      for (const topicName of note.topics) {
        const lowerName = topicName.toLowerCase();
        const topicId = topicMap.get(lowerName);
        if (!topicId) continue;

        chunks.push({
          id: `note_summary_${note.id}_${topicId}`,
          topicId,
          sourceType: "NOTE",
          sourceId: note.id,
          title: `${note.title} - Summary`,
          content: note.summary ?? "",
          contentType: "SUMMARY",
        });

        for (let i = 0; i < note.keyPoints.length; i++) {
          chunks.push({
            id: `note_kp_${note.id}_${topicId}_${i}`,
            topicId,
            sourceType: "NOTE",
            sourceId: note.id,
            title: `${note.title} - Key Point ${i + 1}`,
            content: note.keyPoints[i],
            contentType: "TOPIC_EXPLANATION",
          });
        }
      }

      if (chunks.length === 0) return { chunksCreated: 0 };

      await prisma.$transaction(
        chunks.map((chunk) =>
          prisma.knowledgeChunk.upsert({
            where: { id: chunk.id },
            update: { content: chunk.content },
            create: chunk,
          }),
        ),
      );

      return { chunksCreated: chunks.length };
    });

    console.log(
      `[Harvest] Created ${result.chunksCreated} knowledge chunks from note ${noteId}`,
    );
    return { success: true, ...result };
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
  async ({ event, step }) => {
    const { sourceId } = event.data as { sourceId: string };

    const result = await step.run("harvest-paper3-chunks", async () => {
      const questions = await prisma.paper3Question.findMany({
        where: { sourceId },
        select: {
          id: true,
          title: true,
          explanation: true,
          content: true,
          expectedAnswer: true,
          concepts: true,
        },
      });

      const allConcepts = [...new Set(questions.flatMap((q) => q.concepts))];
      if (allConcepts.length === 0) return { chunksCreated: 0 };

      const topics = await prisma.topic.findMany({
        where: { name: { in: allConcepts, mode: "insensitive" } },
      });
      const topicMap = new Map(topics.map((t) => [t.name.toLowerCase(), t.id]));

      const chunks: Array<{
        id: string;
        topicId: string;
        sourceType: string;
        sourceId: string;
        title: string;
        content: string;
        contentType: string;
      }> = [];

      for (const question of questions) {
        const explanation = question.explanation || question.expectedAnswer;
        if (!explanation) continue;

        for (const conceptName of question.concepts) {
          const topicId = topicMap.get(conceptName.toLowerCase());
          if (!topicId) continue;

          chunks.push({
            id: `p3_${question.id}_${topicId}`,
            topicId,
            sourceType: "PAPER3_QUESTION",
            sourceId: question.id,
            title: question.title,
            content: explanation,
            contentType: "TOPIC_EXPLANATION",
          });
        }
      }

      if (chunks.length === 0) return { chunksCreated: 0 };

      await prisma.$transaction(
        chunks.map((chunk) =>
          prisma.knowledgeChunk.upsert({
            where: { id: chunk.id },
            update: { content: chunk.content },
            create: chunk,
          }),
        ),
      );

      return { chunksCreated: chunks.length };
    });

    console.log(
      `[Harvest] Created ${result.chunksCreated} knowledge chunks from Paper3 source ${sourceId}`,
    );
    return { success: true, ...result };
  },
);
