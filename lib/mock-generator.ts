import { prisma } from "./prisma";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { extractMcqFromPlainText } from "./mcq-parse";
import { shuffleArrayCopy } from "./shuffle";

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

export type StudentPaperMode = "PAPER_1" | "PAPER_2";

export type StudentMockScope = "FULL_SYLLABUS" | "TOPICS";

export type MockMcqOption = { letter: string; label: string };

/** `text` is the stem; for MCQ, `options` + `correctOption` when known (AI or parsed bank). */
export type MockSessionQuestion = {
  questionId: string;
  text: string;
  type: string;
  marks: number;
  options?: MockMcqOption[];
  /** Letter A–D — stored for server-side grading; omit when sending to examinee UI if sanitized. */
  correctOption?: string;
  /**
   * Mark-scheme / model answer for structured long-form items — stored for post-submit review
   * only; stripped alongside `correctOption` in `sanitizeSessionPayloadForExaminee`.
   */
  modelAnswer?: string;
};

/** Stored on `mock_attempts.session_payload` for student-built sessions. */
export type MockSessionPayload = {
  displayName: string;
  durationMin: number;
  totalMarks: number;
  sections: Array<{
    name: string;
    questionCount: number;
    totalMarks: number;
    questionType: string;
    answerRule: string | null;
    marksPerQuestion: number | null;
    questions: MockSessionQuestion[];
  }>;
};

export const STUDENT_MOCK_PRESETS = {
  PAPER_1: {
    questionType: "MCQ" as const,
    baseQuestionCount: 50,
    baseDurationMin: 90,
    nominalTotalMarks: 50,
    marksPerQuestion: 1,
    sectionName: "Paper 1 · Multiple choice",
  },
  PAPER_2: {
    questionType: "STRUCTURED" as const,
    baseQuestionCount: 8,
    baseDurationMin: 120,
    nominalTotalMarks: 100,
    marksPerQuestion: null as number | null,
    sectionName: "Paper 2 · Structured",
  },
} as const;

type SelectedQuestion = {
  questionId: string;
  text: string;
  type: string;
  marks: number;
  source: "DATABASE" | "HYBRID" | "RESEARCH";
  options?: MockMcqOption[];
  correctOption?: string;
  /** From AI generation or future bank enrichment — never sent during a sitting. */
  modelAnswer?: string;
};

const MCQ_LETTERS = ["A", "B", "C", "D"] as const;

function selectedFromDbQuestion(
  row: {
    id: string;
    text: string;
    type: string;
    marks?: number | null;
  },
  section: SectionConfig,
  needed: number,
): SelectedQuestion {
  const base = {
    questionId: row.id,
    text: row.text,
    type: row.type,
    marks:
      section.marksPerQuestion ??
      row.marks ??
      Math.ceil(section.totalMarks / Math.max(needed, 1)),
    source: "DATABASE" as const,
  };

  if (row.type !== "MCQ") return base;

  const parsed = extractMcqFromPlainText(row.text);
  if (!parsed) return base;

  return {
    ...base,
    text: parsed.stem,
    options: parsed.options,
    ...(parsed.correctOption ? { correctOption: parsed.correctOption } : {}),
  };
}

function toSessionQuestionPayload(q: SelectedQuestion): MockSessionQuestion {
  const out: MockSessionQuestion = {
    questionId: q.questionId,
    text: q.text,
    type: q.type,
    marks: q.marks,
  };
  if (q.options?.length) out.options = q.options;
  if (q.correctOption) out.correctOption = q.correctOption;
  const model = q.modelAnswer?.trim();
  if (model) out.modelAnswer = model;
  return out;
}

export async function generateMockFromBlueprint(
  blueprintId: string,
  examProfileId: string,
) {
  const blueprint = await prisma.examBlueprint.findUnique({
    where: { id: blueprintId },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!blueprint) throw new Error("Blueprint not found");

  const sessionSections: MockSessionPayload["sections"] = [];
  const apiQuestionsBySection: SelectedQuestion[][] = [];
  let overallMode: "DATABASE" | "HYBRID" | "RESEARCH" = "DATABASE";

  for (const section of blueprint.sections) {
    const { questions, mode } = await generateSectionQuestions(
      blueprint.componentId,
      section,
    );

    if (questions.length === 0) {
      throw new Error(
        `No questions generated for section "${section.name}" — check the question bank or blueprint settings.`,
      );
    }

    if (mode === "RESEARCH") overallMode = "RESEARCH";
    else if (mode === "HYBRID" && overallMode === "DATABASE")
      overallMode = "HYBRID";

    const orderedQuestions = shuffleArrayCopy(questions);

    const sumMarks =
      orderedQuestions.reduce((s, q) => s + q.marks, 0) ||
      section.totalMarks;

    sessionSections.push({
      name: section.name,
      questionCount: orderedQuestions.length,
      totalMarks: sumMarks,
      questionType: section.questionType,
      answerRule: section.answerRule,
      marksPerQuestion: section.marksPerQuestion,
      questions: orderedQuestions.map((q) => toSessionQuestionPayload(q)),
    });
    apiQuestionsBySection.push(orderedQuestions);
  }

  const sessionPayload: MockSessionPayload = {
    displayName: blueprint.name,
    durationMin: blueprint.durationMin,
    totalMarks: blueprint.totalMarks,
    sections: sessionSections,
  };

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
      sessionPayload: sessionPayload as object,
      creationContext: "STUDENT",
    },
  });

  const responseSections = sessionPayload.sections.map((sec, i) => ({
    name: sec.name,
    questionCount: sec.questionCount,
    totalMarks: sec.totalMarks,
    questionType: sec.questionType,
    answerRule: sec.answerRule,
    marksPerQuestion: sec.marksPerQuestion,
    questions:
      apiQuestionsBySection[i]?.map((q) => ({
        questionId: q.questionId,
        text: q.text,
        type: q.type,
        marks: q.marks,
        source: q.source,
        ...(q.options?.length ? { options: q.options } : {}),
      })) ?? [],
  }));

  return {
    attemptId: mockAttempt.id,
    blueprint: {
      name: blueprint.name,
      totalMarks: blueprint.totalMarks,
      durationMin: blueprint.durationMin,
    },
    sections: responseSections,
    sourceMode: overallMode,
  };
}

async function generateSectionQuestions(
  componentId: string,
  section: SectionConfig,
  opts?: { topicIds?: string[] },
) {
  const topicClause =
    opts?.topicIds && opts.topicIds.length > 0
      ? { topicId: { in: opts.topicIds } }
      : {};

  const storedQuestions = await prisma.question.findMany({
    where: {
      componentId,
      type: section.questionType as
        | "MCQ"
        | "STRUCTURED"
        | "PRACTICAL"
        | "ESSAY",
      ...topicClause,
    },
    orderBy: { createdAt: "desc" },
  });

  const needed = section.questionCount;
  const available = storedQuestions.length;

  if (available >= needed * 1.2) {
    // DATABASE mode - use stored questions with balanced selection
    const selected = selectWithDifficultyBalance(storedQuestions, needed);
    return {
      questions: selected.map((q) =>
        selectedFromDbQuestion(q, section, needed),
      ),
      mode: "DATABASE" as const,
    };
  }

  if (available > 0) {
    // HYBRID mode - use stored + AI fill
    const takeStored = Math.min(available, Math.floor(needed * 0.6));
    const stored = selectWithDifficultyBalance(storedQuestions, takeStored);
    const aiNeeded = needed - takeStored;

    const aiQuestions = await generateAIQuestions(
      componentId,
      section,
      aiNeeded,
    );

    return {
      questions: [
        ...stored.map((q) =>
          selectedFromDbQuestion(q, section, needed),
        ),
        ...aiQuestions,
      ],
      mode: "HYBRID" as const,
    };
  }

  // RESEARCH mode - AI generates all
  const aiQuestions = await generateAIQuestions(componentId, section, needed);
  return { questions: aiQuestions, mode: "RESEARCH" as const };
}

function selectWithDifficultyBalance(
  questions: Array<{
    id: string;
    text: string;
    type: string;
    difficulty: number | null;
    marks: number | null;
  }>,
  count: number,
) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  const sorted = shuffled.sort(
    (a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3),
  );
  const easy = sorted.filter((q) => (q.difficulty ?? 3) <= 2);
  const medium = sorted.filter((q) => (q.difficulty ?? 3) === 3);
  const hard = sorted.filter((q) => (q.difficulty ?? 3) >= 4);

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

async function generateAIQuestions(
  componentId: string,
  section: SectionConfig,
  count: number,
) {
  const component = await prisma.component.findUnique({
    where: { id: componentId },
    include: { program: true },
  });

  const programName = component?.program.name ?? "the subject";
  const levelLabel = "Cameroon GCE A-Level";

  const marksEach =
    section.marksPerQuestion ?? Math.ceil(section.totalMarks / Math.max(count, 1));

  if (section.questionType === "MCQ") {
    const result = await generateObject({
      model: aiModel,
      schema: z.object({
        questions: z.array(
          z.object({
            stem: z
              .string()
              .describe(
                "The question stem only: clear, self-contained, no answer choices and no 'A.'/'B.' lines",
              ),
            choices: z
              .array(z.string())
              .length(4)
              .describe(
                "Exactly four strings: option texts for A, B, C, D (no prefixes)",
              ),
            correctLetter: z
              .enum(["A", "B", "C", "D"])
              .describe(
                "Which option is correct — must match one of the four choices exactly in meaning",
              ),
            difficulty: z.number().min(1).max(5),
          }),
        ),
      }),
      system: `You write multiple-choice items for ${levelLabel} ${programName}.
Section: "${section.name}".
Each item MUST have: (1) one clear stem, (2) exactly four distinct, plausible options labelled in order A–D by array position, (3) exactly one correctLetter (A, B, C, or D).
Options must not give away the answer; avoid "all of the above". Use syllabus-appropriate vocabulary.`,
      prompt: `Generate ${count} fresh MCQ exam questions for ${programName}. Each is worth ${marksEach} mark(s). Difficulty should vary slightly across items.`,
    });

    return result.object.questions.map((q, i) => {
      const choices = q.choices;
      const options: MockMcqOption[] = MCQ_LETTERS.map((letter, j) => ({
        letter,
        label: choices[j]?.trim() ?? "",
      }));
      return {
        questionId: `ai_${section.id}_${i}`,
        text: q.stem.trim(),
        type: "MCQ" as const,
        marks: marksEach,
        source: "RESEARCH" as const,
        options,
        correctOption: q.correctLetter,
      };
    });
  }

  const result = await generateObject({
    model: aiModel,
    schema: z.object({
      questions: z.array(
        z.object({
          text: z
            .string()
            .describe(
              "The exam paper question only — no solutions, rubric, or 'model answer' headings",
            ),
          modelAnswer: z
            .string()
            .describe(
              `Separate field: examiner model answer / key marking points for up to ${marksEach} marks. Bullet lists or short paragraphs. Must not repeat the question stem verbatim.`,
            ),
          difficulty: z.number().min(1).max(5),
        }),
      ),
    }),
    system: `You are an exam question generator for ${levelLabel} ${programName}.
Generate ${count} ${section.questionType} questions for section "${section.name}".
Each item is ONE object with TWO separate string fields — this is mandatory:
1) "text": only what the candidate reads on the paper (exam-quality, syllabus-aligned).
2) "modelAnswer": the official short answer / bullet mark-scheme the examiner uses (${marksEach} marks). Never copy the model answer into "text" and never put the question inside "modelAnswer".`,
    prompt: `Generate ${count} ${section.questionType} exam questions for ${programName}.
Each question is worth ${marksEach} mark(s). Difficulty should vary slightly across items.`,
  });

  return result.object.questions.map((q, i) => ({
    questionId: `ai_${section.id}_${i}`,
    text: q.text.trim(),
    type: section.questionType,
    marks: marksEach,
    source: "RESEARCH" as const,
    modelAnswer: q.modelAnswer.trim(),
  }));
}

export async function generateStudentPracticeMock(
  input: {
    examProfileId: string;
    componentId: string;
    paper: StudentPaperMode;
    scope: StudentMockScope;
    topicIds?: string[];
  },
  opts?: { creationContext?: "STUDENT" | "ADMIN_PREVIEW" },
) {
  const { examProfileId, componentId, paper, scope, topicIds } = input;
  const creationContext = opts?.creationContext ?? "STUDENT";

  const preset =
    paper === "PAPER_1"
      ? STUDENT_MOCK_PRESETS.PAPER_1
      : STUDENT_MOCK_PRESETS.PAPER_2;

  const topicFilter =
    scope === "TOPICS" && topicIds?.length ? { topicIds } : undefined;

  const sectionCfg: SectionConfig = {
    id: "student_custom",
    name: preset.sectionName,
    questionCount: preset.baseQuestionCount,
    marksPerQuestion: preset.marksPerQuestion,
    totalMarks: preset.nominalTotalMarks,
    questionType: preset.questionType,
    answerRule: null,
    order: 1,
  };

  const { questions, mode } = await generateSectionQuestions(
    componentId,
    sectionCfg,
    topicFilter,
  );

  if (questions.length === 0) {
    throw new Error(
      "Could not assemble any questions for this mock. Try another paper, widen to full syllabus, or add syllabus items to the question bank.",
    );
  }

  const questionsOrdered = shuffleArrayCopy(questions);
  const n = questionsOrdered.length;
  const sumMarks = Math.max(
    questionsOrdered.reduce((s, q) => s + q.marks, 0),
    1,
  );
  const durationMin = Math.round(
    Math.max(25, preset.baseDurationMin * (n / preset.baseQuestionCount)),
  );

  const component = await prisma.component.findUnique({
    where: { id: componentId },
    include: { program: true },
  });

  const scopeLabel =
    scope === "TOPICS" && topicIds?.length
      ? "topics you chose"
      : "full syllabus";

  const displayName = `${component?.program.name ?? "Subject"} · ${
    paper === "PAPER_1" ? "Paper 1" : "Paper 2"
  } (${scopeLabel})`;

  const sessionPayload: MockSessionPayload = {
    displayName,
    durationMin,
    totalMarks: sumMarks,
    sections: [
      {
        name: sectionCfg.name,
        questionCount: n,
        totalMarks: sumMarks,
        questionType: sectionCfg.questionType,
        answerRule: null,
        marksPerQuestion: sectionCfg.marksPerQuestion,
        questions: questionsOrdered.map((q) => toSessionQuestionPayload(q)),
      },
    ],
  };

  const mockAttempt = await prisma.mockAttempt.create({
    data: {
      examProfileId,
      componentId,
      blueprintId: null,
      score: null,
      totalMarks: sumMarks,
      sourceMode: mode,
      answers: {},
      results: [],
      sessionPayload: sessionPayload as object,
      creationContext,
    },
  });

  return {
    attemptId: mockAttempt.id,
    blueprint: {
      name: displayName,
      totalMarks: sumMarks,
      durationMin,
    },
    // Never leak keys to the browser JSON on creation — same fields stripped as examination GET.
    sections: sessionPayload.sections.map((sec) => ({
      ...sec,
      questions: sec.questions.map((q) => {
        const { correctOption: _c, modelAnswer: _m, ...rest } = q;
        return rest;
      }),
    })),
    sourceMode: mode,
  };
}