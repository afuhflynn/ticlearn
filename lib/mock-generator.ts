import { prisma } from "./prisma";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const aiModel = openai("gpt-5.4");

type SectionConfig = {
  id: string;
  name: string;
  questionCount: number;
  marksPerQuestion: number | null;
  totalMarks: number;
  questionType: string;
  answerRule: string | null;
  order: number;
};

type SelectedQuestion = {
  questionId: string;
  text: string;
  type: string;
  marks: number;
  source: "DATABASE" | "HYBRID" | "RESEARCH";
};

export async function generateMockFromBlueprint(blueprintId: string, examProfileId: string) {
  const blueprint = await prisma.examBlueprint.findUnique({
    where: { id: blueprintId },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!blueprint) throw new Error("Blueprint not found");

  const allSectionQuestions: SelectedQuestion[] = [];
  let overallMode: "DATABASE" | "HYBRID" | "RESEARCH" = "DATABASE";

  for (const section of blueprint.sections) {
    const { questions, mode } = await generateSectionQuestions(blueprint.componentId, section);
    allSectionQuestions.push(...questions);
    if (mode === "RESEARCH") overallMode = "RESEARCH";
    else if (mode === "HYBRID" && overallMode === "DATABASE") overallMode = "HYBRID";
  }

  const mockAttempt = await prisma.mockAttempt.create({
    data: {
      examProfileId,
      componentId: blueprint.componentId,
      blueprintId,
      score: null,
      totalMarks: blueprint.totalMarks,
      sourceMode: overallMode,
      answers: {},
      results: [],
    },
  });

  return {
    attemptId: mockAttempt.id,
    blueprint: { name: blueprint.name, totalMarks: blueprint.totalMarks, durationMin: blueprint.durationMin },
    sections: blueprint.sections.map(s => ({
      name: s.name,
      questionCount: s.questionCount,
      totalMarks: s.totalMarks,
      questionType: s.questionType,
      answerRule: s.answerRule,
      questions: allSectionQuestions.filter(q => q.marks === s.marksPerQuestion || s.marksPerQuestion === null),
    })),
    sourceMode: overallMode,
  };
}

async function generateSectionQuestions(componentId: string, section: SectionConfig) {
  const storedQuestions = await prisma.question.findMany({
    where: {
      componentId,
      type: section.questionType as "MCQ" | "STRUCTURED" | "PRACTICAL" | "ESSAY",
    },
    orderBy: { createdAt: "desc" },
  });

  const needed = section.questionCount;
  const available = storedQuestions.length;

  if (available >= needed * 1.2) {
    // DATABASE mode — use stored questions with balanced selection
    const selected = selectWithDifficultyBalance(storedQuestions, needed);
    return {
      questions: selected.map(q => ({
        questionId: q.id,
        text: q.text,
        type: q.type,
        marks: section.marksPerQuestion ?? Math.ceil(section.totalMarks / needed),
        source: "DATABASE" as const,
      })),
      mode: "DATABASE" as const,
    };
  }

  if (available > 0) {
    // HYBRID mode — use stored + AI fill
    const takeStored = Math.min(available, Math.floor(needed * 0.6));
    const stored = selectWithDifficultyBalance(storedQuestions, takeStored);
    const aiNeeded = needed - takeStored;

    const aiQuestions = await generateAIQuestions(componentId, section, aiNeeded);

    return {
      questions: [
        ...stored.map(q => ({
          questionId: q.id,
          text: q.text,
          type: q.type,
          marks: section.marksPerQuestion ?? Math.ceil(section.totalMarks / needed),
          source: "DATABASE" as const,
        })),
        ...aiQuestions,
      ],
      mode: "HYBRID" as const,
    };
  }

  // RESEARCH mode — AI generates all
  const aiQuestions = await generateAIQuestions(componentId, section, needed);
  return { questions: aiQuestions, mode: "RESEARCH" as const };
}

function selectWithDifficultyBalance(questions: Array<{ id: string; text: string; type: string; difficulty: number | null; marks: number | null }>, count: number) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  const sorted = shuffled.sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
  const easy = sorted.filter(q => (q.difficulty ?? 3) <= 2);
  const medium = sorted.filter(q => (q.difficulty ?? 3) === 3);
  const hard = sorted.filter(q => (q.difficulty ?? 3) >= 4);

  const result = [
    ...pickNRandom(easy, Math.ceil(count * 0.3)),
    ...pickNRandom(medium, Math.ceil(count * 0.5)),
    ...pickNRandom(hard, Math.ceil(count * 0.2)),
  ];

  return result.slice(0, count).sort(() => Math.random() - 0.5);
}

function pickNRandom<T>(arr: T[], n: number): T[] {
  return arr.sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

async function generateAIQuestions(componentId: string, section: SectionConfig, count: number) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    include: { program: true },
  });

  const result = await generateObject({
    model: aiModel,
    schema: z.object({
      questions: z.array(z.object({
        text: z.string(),
        type: z.enum(["MCQ", "STRUCTURED", "PRACTICAL", "ESSAY"]),
        difficulty: z.number().min(1).max(5),
      })),
    }),
    system: `You are an exam question generator for Cameroon GCE A-Level ${component?.program.name ?? "Computer Science"}.
Generate ${count} ${section.questionType} questions for a section named "${section.name}".
Each question should be exam-quality, aligned with the official syllabus.
Do not include answers.`,
    prompt: `Generate ${count} ${section.questionType} exam questions for ${component?.program.name ?? "Computer Science"} component. Each question ${section.marksPerQuestion ? `should be worth ${section.marksPerQuestion} marks` : "should be clearly marked with its point value"}.`,
  });

  return result.object.questions.map((q, i) => ({
    questionId: `ai_${section.id}_${i}`,
    text: q.text,
    type: q.type,
    marks: section.marksPerQuestion ?? Math.ceil(section.totalMarks / count),
    source: "RESEARCH" as const,
  }));
}
