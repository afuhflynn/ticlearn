import { type GetStepTools, NonRetriableError } from "inngest";
import { z } from "zod";
import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromWord,
} from "@/lib/ai";
import { generate } from "@/lib/ai/orchestrator";
import type {
  Paper3Category,
  Paper3Language,
  Paper3PaperType,
  Paper3Section,
  Paper3SourceType,
  Paper3Subject,
  Paper3TaskType,
} from "@/lib/generated/prisma/client";
import { inngest } from "@/lib/inngest/client";
import { buildPaper3SourceContextBlock } from "@/lib/paper3/exam-context";
import { groundedQuestionBatchPrompt } from "@/lib/paper3/prompts";
import { prisma } from "@/lib/prisma";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

const SOURCE_TEXT_MIN_LENGTH = 100;

type Paper3StepTools = GetStepTools<typeof inngest>;

const skillTypeSchema = z.enum([
  "ALGORITHMIC_THINKING",
  "DATA_MODELING",
  "CALCULATION",
  "PROGRAMMING",
]);

const taskTypeSchema = z.enum([
  "EXCEL_FORMULA",
  "EXCEL_GRID",
  "ACCESS_TABLE",
  "ACCESS_RELATIONSHIP",
  "SQL_QUERY",
  "C_PROGRAM",
  "PASCAL_PROGRAM",
  "WEB_PROGRAMMING",
  "ALGORITHM_PSEUDOCODE",
  "INPUT_FIELD",
]);

const languageSchema = z.enum(["C", "PASCAL"]);

const markingCriterionSchema = z.object({
  criteria: z.string().min(1),
  description: z.string().min(1),
});
const visualCodeSchema = z.object({
  language: z.enum(["c", "pascal"]),
  code: z.string().min(1),
});

const taskItemSchema = z.object({
  part: z.string().min(1),
  contentMd: z.string(),
  subAnswer: z.string(),
});

const visualTableSchema = z.object({
  id: z.string().min(1),
  tableName: z.string().min(1),
  columns: z.array(z.string().min(1)),
  data: z.array(z.array(z.string())),
  primaryKey: z.string().nullable(),
  foreignKeys: z.array(z.string()),
});

const visualArraySchema = z.object({
  id: z.string().min(1),
  dimensions: z
    .object({
      rows: z.number(),
      cols: z.number(),
    })
    .nullable(),
  data: z.array(z.array(z.string())),
});

const visualElementsSchema = z.object({
  tables: z.array(visualTableSchema),
  arrays: z.array(visualArraySchema),
  codeBlocks: z.array(visualCodeSchema),
});

const generatedQuestionSchema = z.object({
  questionNumber: z.string().min(1),
  taskNumber: z.string().nullable(),
  subPart: z.string().nullable(),
  title: z.string().min(1),
  section: z.enum(["A", "B"]),
  skillType: skillTypeSchema,
  taskType: taskTypeSchema,
  programmingLanguage: languageSchema.nullable(),
  concepts: z.array(z.string().min(1)),
  content: z.string().min(1),
  contentMd: z.string().min(1),
  expectedAnswer: z.string().min(1),
  markingBreakdown: z.array(markingCriterionSchema),
  explanation: z.string().min(1),
  partialCredit: z.boolean(),
  taskItems: z.array(taskItemSchema),
  visualElements: visualElementsSchema,
});

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
type VisualElements = z.infer<typeof visualElementsSchema>;

type ProcessSourceEvent = {
  sourceId: string;
  fileUrl: string;
  fileName: string;
  uploadthingKey?: string;
  title: string;
  year: number;
  subject: Paper3Subject;
  section: Paper3Section;
  category: Paper3Category;
  paperType: Paper3PaperType;
  sourceType: Paper3SourceType;
};

type GenerateMockInput = {
  title: string;
  subject?: Paper3Subject;
  componentId?: string;
  section?: Paper3Section;
  focusCategory?:
    | "MIXED"
    | "DATABASE"
    | "SPREADSHEET"
    | "PROGRAMMING"
    | "WEB_PROGRAMMING";
  questionCount: number;
  markDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  timeLimit?: number;
  description?: string;
  createdBy: string;
  sourceIds?: string[];
  difficulty?: "foundation" | "standard" | "stretch";
  authorNotes?: string;
};

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replaceAll(String.fromCharCode(0), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""),
    )
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sourceTextToMarkdown(text: string) {
  const normalized = normalizeExtractedText(text);
  return normalized
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const looksLikeHeading =
        block.length < 90 &&
        !/[.?!]$/.test(block) &&
        block === block.toUpperCase();
      return looksLikeHeading ? `## ${block}` : block;
    })
    .join("\n\n");
}

function parseMarkdownTables(
  contentMd: string,
): VisualElements["tables"] | undefined {
  const tables: NonNullable<VisualElements["tables"]> = [];
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g;

  let match = tableRegex.exec(contentMd);
  while (match !== null) {
    const columns = match[1]
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    const data = match[2]
      .trim()
      .split("\n")
      .map((row) =>
        row
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
      )
      .filter((row) => row.length > 0);

    if (columns.length > 0 && data.length > 0) {
      tables.push({
        id: `md-table-${tables.length + 1}`,
        tableName: `Table ${tables.length + 1}`,
        columns,
        data,
        primaryKey: null,
        foreignKeys: [],
      });
    }

    match = tableRegex.exec(contentMd);
  }

  return tables;
}

function parseMarkdownCodeBlocks(
  contentMd: string,
): VisualElements["codeBlocks"] | undefined {
  const codeBlocks: NonNullable<VisualElements["codeBlocks"]> = [];
  const codeRegex = /```(c|pascal)\n([\s\S]*?)```/gi;

  let match = codeRegex.exec(contentMd);
  while (match !== null) {
    codeBlocks.push({
      language: match[1].toLowerCase() as "c" | "pascal",
      code: match[2].trim(),
    });

    match = codeRegex.exec(contentMd);
  }

  return codeBlocks;
}

function parseMarkdownArrays(
  contentMd: string,
): VisualElements["arrays"] | undefined {
  const arrays: NonNullable<VisualElements["arrays"]> = [];
  const gridRegex = /(?:^|\n)((?:\[[^\n]+\]\n?){2,})/g;

  let match = gridRegex.exec(contentMd);
  while (match !== null) {
    const data = match[1]
      .trim()
      .split("\n")
      .map((row) =>
        row
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((item) => item.trim()),
      )
      .filter((row) => row.length > 0);

    if (data.length > 0 && data.every((row) => row.length === data[0].length)) {
      arrays.push({
        id: `md-array-${arrays.length + 1}`,
        dimensions: { rows: data.length, cols: data[0].length },
        data,
      });
    }

    match = gridRegex.exec(contentMd);
  }

  return arrays;
}

function mergeVisualElements(
  base?: VisualElements,
  derived?: VisualElements,
): VisualElements | undefined {
  const merged: VisualElements = {
    tables: [...(base?.tables ?? []), ...(derived?.tables ?? [])],
    arrays: [...(base?.arrays ?? []), ...(derived?.arrays ?? [])],
    codeBlocks: [...(base?.codeBlocks ?? []), ...(derived?.codeBlocks ?? [])],
  };

  if (
    merged.tables.length === 0 &&
    merged.arrays.length === 0 &&
    merged.codeBlocks.length === 0
  ) {
    return undefined;
  }

  return merged;
}

function deriveVisualElements(contentMd: string, base?: VisualElements) {
  const tables = parseMarkdownTables(contentMd);
  const arrays = parseMarkdownArrays(contentMd);
  const codeBlocks = parseMarkdownCodeBlocks(contentMd);

  const merged = {
    tables: [...(base?.tables ?? []), ...(tables ?? [])],
    arrays: [...(base?.arrays ?? []), ...(arrays ?? [])],
    codeBlocks: [...(base?.codeBlocks ?? []), ...(codeBlocks ?? [])],
  };

  if (
    merged.tables.length === 0 &&
    merged.arrays.length === 0 &&
    merged.codeBlocks.length === 0
  ) {
    return undefined;
  }

  return merged;
}

function taskTypeNeedsVisuals(taskType: Paper3TaskType) {
  return (
    taskType === "EXCEL_GRID" ||
    taskType === "ACCESS_TABLE" ||
    taskType === "ACCESS_RELATIONSHIP" ||
    taskType === "C_PROGRAM" ||
    taskType === "PASCAL_PROGRAM"
  );
}

function hasRequiredVisuals(
  taskType: Paper3TaskType,
  visualElements?: VisualElements,
) {
  if (!taskTypeNeedsVisuals(taskType)) return true;
  if (!visualElements) return false;

  switch (taskType) {
    case "EXCEL_GRID":
      return (visualElements.arrays?.length ?? 0) > 0;
    case "ACCESS_TABLE":
    case "ACCESS_RELATIONSHIP":
      return (visualElements.tables?.length ?? 0) > 0;
    case "C_PROGRAM":
    case "PASCAL_PROGRAM":
      return (visualElements.codeBlocks?.length ?? 0) > 0;
    default:
      return true;
  }
}

function inferCategoryFromTaskType(taskType: Paper3TaskType): Paper3Category {
  if (taskType === "SQL_QUERY" || taskType.startsWith("ACCESS_")) {
    return "DATABASE";
  }

  if (taskType.startsWith("EXCEL_")) {
    return "SPREADSHEET";
  }

  return "PROGRAMMING";
}

function normalizeQuestion(
  question: GeneratedQuestion,
  sourceMarkdown: string,
) {
  const contentMd = question.contentMd.trim();
  const derivedVisuals = deriveVisualElements(
    contentMd,
    question.visualElements,
  );
  const content =
    stripMarkdown(contentMd) ||
    stripMarkdown(question.content) ||
    question.title;
  const programmingLanguage =
    question.taskType === "C_PROGRAM"
      ? "C"
      : question.taskType === "PASCAL_PROGRAM"
        ? "PASCAL"
        : null;

  // TaskTypes that DON'T require user input (student does work on computer/software)
  const taskTypesWithoutInput = [
    "EXCEL_GRID",
    "ACCESS_TABLE",
    "ACCESS_RELATIONSHIP",
  ];
  const requireAnswer = !taskTypesWithoutInput.includes(question.taskType);

  return {
    questionNumber: question.questionNumber.trim(),
    taskNumber: question.taskNumber ?? null,
    subPart: question.subPart ?? null,
    title: question.title.trim(),
    section: question.section,
    skillType: question.skillType,
    taskType: question.taskType,
    programmingLanguage,
    concepts: [
      ...new Set(question.concepts.map((item) => item.trim()).filter(Boolean)),
    ],
    content,
    contentMd,
    marks: 1,
    expectedAnswer: question.expectedAnswer.trim(),
    markingBreakdown: question.markingBreakdown.map((criterion) => ({
      criteria: criterion.criteria.trim(),
      marks: 1,
      description: criterion.description.trim(),
    })),
    explanation: question.explanation.trim(),
    partialCredit: Boolean(question.partialCredit),
    requireAnswer,
    // empty array from AI means no task items
    taskItems:
      (question.taskItems?.length ?? 0) > 0 ? question.taskItems : undefined,
    visualElements: derivedVisuals,
    sourceContentMarkdown: sourceMarkdown,
  };
}

async function repairVisualQuestion(
  question: GeneratedQuestion,
  step: any,
  stepName: string,
) {
  const currentVisuals = deriveVisualElements(
    question.contentMd,
    question.visualElements,
  );

  if (hasRequiredVisuals(question.taskType, currentVisuals)) {
    return question;
  }

  const repairSchema = z.object({
    contentMd: z.string().min(1),
    visualElements: visualElementsSchema,
  });

  const { text: prompt, settings } = await getPrompt(
    "paper3",
    "repair_question",
    {
      taskType: question.taskType,
      title: question.title,
      contentMd: question.contentMd,
    },
  );

  const result = await step.run(stepName, async () => {
    const { object } = await generate({
      task: "paper3_gen",
      schema: repairSchema,
      prompt,
      ...promptCallFields(settings),
    });

    return object;
  });

  return {
    ...question,
    contentMd: result.contentMd,
    visualElements: result.visualElements,
  };
}

async function structureQuestionsFromSource(
  extractedText: string,
  source: ProcessSourceEvent,
  step: any,
) {
  const responseSchema = z.object({
    sourceMarkdown: z.string().min(1),
    questions: z.array(generatedQuestionSchema),
  });

  const { text: prompt, settings } = await getPrompt(
    "paper3",
    "structure_source",
    {
      title: source.title,
      year: source.year,
      subject: source.subject,
      section: source.section,
      category: source.category,
      paperType: source.paperType,
      sourceType: source.sourceType,
      sourceText: extractedText.slice(0, 24000),
    },
  );

  const object = await step.run("structure-paper3-source", async () => {
    const result = await generate({
      task: "paper3_gen",
      schema: responseSchema,
      prompt,
      ...promptCallFields(settings),
    });

    return result.object;
  });

  const normalizedSourceMarkdown =
    object.sourceMarkdown.trim() || sourceTextToMarkdown(extractedText);
  const questions: Array<ReturnType<typeof normalizeQuestion>> = [];

  for (const [index, rawQuestion] of object.questions.entries()) {
    const repairedQuestion = await repairVisualQuestion(
      rawQuestion,
      step,
      `repair-paper3-source-question-${index + 1}`,
    );

    const normalized = normalizeQuestion(
      repairedQuestion,
      normalizedSourceMarkdown,
    );

    if (
      normalized.concepts.length === 0 ||
      normalized.markingBreakdown.length === 0 ||
      !hasRequiredVisuals(
        normalized.taskType,
        normalized.visualElements ?? undefined,
      )
    ) {
      continue;
    }

    questions.push(normalized);
  }

  if (questions.length === 0) {
    throw new Error(
      "Question structuring completed but produced no valid Paper 3 questions.",
    );
  }

  return {
    sourceMarkdown: normalizedSourceMarkdown,
    questions,
  };
}

async function extractSourceText(source: ProcessSourceEvent) {
  const lowerFileName = source.fileName.toLowerCase();

  if (lowerFileName.endsWith(".pdf")) {
    return extractTextFromPDF(source.uploadthingKey as string, "eng");
  }

  if (lowerFileName.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return extractTextFromImage(source.uploadthingKey, source.fileUrl);
  }

  if (lowerFileName.match(/\.(docx|doc)$/i)) {
    return extractTextFromWord(source.uploadthingKey, source.fileUrl);
  }

  if (source.uploadthingKey && !lowerFileName.includes(".")) {
    return extractTextFromPDF(source.uploadthingKey as string, "eng");
  }

  throw new NonRetriableError(
    `Unsupported source file type for ${source.fileName}`,
  );
}

async function loadApprovedQuestionBankBlock(params: {
  subject: Paper3Subject;
  limit?: number;
}): Promise<string> {
  const take = params.limit ?? 15;
  const rows = await prisma.paper3Question.findMany({
    where: {
      status: "APPROVED",
      source: { subject: params.subject },
    },
    select: {
      title: true,
      contentMd: true,
      taskType: true,
      marks: true,
      section: true,
      concepts: true,
    },
    orderBy: { updatedAt: "desc" },
    take,
  });
  if (rows.length === 0) {
    return "";
  }
  return rows
    .map((q, i) => {
      const body = (q.contentMd || "").slice(0, 2200);
      return `### Approved bank item ${i + 1} [${q.taskType}] (${q.marks} marks, section ${q.section})\n**${q.title}**\nConcepts: ${(q.concepts || []).join(", ")}\n${body}`;
    })
    .join("\n\n---\n\n");
}

async function generateNewQuestions(
  input: GenerateMockInput,
  step: Paper3StepTools,
): Promise<GeneratedQuestion[]> {
  const responseSchema = z.object({
    questions: z.array(generatedQuestionSchema),
  });

  const pastPaperContext = await step.run(
    "load-paper3-source-context",
    async () =>
      buildPaper3SourceContextBlock({
        sourceIds: input.sourceIds,
        subject: input.subject,
      }),
  );

  const bankBlock = await step.run("load-approved-question-bank", async () =>
    loadApprovedQuestionBankBlock({
      subject: (input.subject ?? "COMPUTER_SCIENCE") as Paper3Subject,
    }),
  );

  const combinedGrounding = [pastPaperContext.trim(), bankBlock.trim()]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const groundedPrompt = await groundedQuestionBatchPrompt({
    focusCategory: input.focusCategory ?? "MIXED",
    count: input.questionCount,
    difficulty: input.difficulty ?? "standard",
    pastPaperContext: combinedGrounding || pastPaperContext,
    notes: input.authorNotes,
    mockTitle: input.title,
  });

  const { text: preamble } = await getPrompt("paper3", "preamble");

  const { text: prompt, settings } = await getPrompt(
    "paper3",
    "generate_mock",
    {
      preamble,
      grounded: groundedPrompt,
      subject: input.subject ?? "COMPUTER_SCIENCE",
      section: input.section ?? "A",
      focusCategory: input.focusCategory ?? "MIXED",
      questionCount: input.questionCount,
      markDistribution: JSON.stringify(input.markDistribution ?? null),
    },
  );

  const object = await step.run("generate-paper3-mock-questions", async () => {
    const result = await generate({
      task: "paper3_gen",
      schema: responseSchema,
      prompt,
      ...promptCallFields(settings),
    });

    return result.object;
  });

  const repairedQuestions: GeneratedQuestion[] = [];

  for (const [index, rawQuestion] of object.questions.entries()) {
    const repaired = await repairVisualQuestion(
      rawQuestion,
      step,
      `repair-paper3-mock-question-${index + 1}`,
    );

    const derivedVisuals = deriveVisualElements(
      repaired.contentMd,
      repaired.visualElements,
    );

    if (hasRequiredVisuals(repaired.taskType, derivedVisuals)) {
      repairedQuestions.push(repaired);
    }
  }

  if (repairedQuestions.length === 0) {
    throw new Error(
      "Mock generation returned no valid questions with renderable markdown visuals.",
    );
  }

  return repairedQuestions;
}

export const processPaper3Source = inngest.createFunction(
  {
    name: "Process Paper 3 Source",
    id: "process-paper3-source",
    triggers: {
      event: "paper3/process-source",
    },
  },
  async ({ event, step }) => {
    const source = event.data as ProcessSourceEvent;

    try {
      const dbSource = await step.run("load-paper3-source", async () => {
        const found = await prisma.paper3Source.findUnique({
          where: { id: source.sourceId },
          select: {
            id: true,
            extractedText: true,
          },
        });

        if (!found) {
          throw new NonRetriableError(
            `Paper 3 source not found: ${source.sourceId}`,
          );
        }

        return found;
      });

      await step.run("mark-paper3-source-processing", async () => {
        await prisma.paper3Source.update({
          where: { id: source.sourceId },
          data: { status: "PROCESSING" },
        });
      });

      const extractedText = await step.run(
        "get-paper3-source-text",
        async () => {
          const cachedText = dbSource.extractedText?.trim();
          if (cachedText && cachedText.length >= SOURCE_TEXT_MIN_LENGTH) {
            return normalizeExtractedText(cachedText);
          }

          const rawText = await extractSourceText(source);
          const normalized = normalizeExtractedText(rawText);

          if (normalized.length < SOURCE_TEXT_MIN_LENGTH) {
            throw new Error(
              "Source extraction returned insufficient text for structuring.",
            );
          }

          return normalized;
        },
      );

      const structured = await structureQuestionsFromSource(
        extractedText,
        source,
        step,
      );

      await step.run("save-paper3-structured-source", async () => {
        await prisma.$transaction(async (tx) => {
          await tx.paper3Question.deleteMany({
            where: { sourceId: source.sourceId },
          });

          await tx.paper3Source.update({
            where: { id: source.sourceId },
            data: {
              extractedText,
              contentMarkdown: structured.sourceMarkdown,
              status: "READY",
            },
          });

          for (const question of structured.questions) {
            await tx.paper3Question.create({
              data: {
                sourceId: source.sourceId,
                questionNumber: question.questionNumber,
                taskNumber: question.taskNumber,
                subPart: question.subPart,
                title: question.title,
                section: question.section,
                skillType: question.skillType,
                taskType: question.taskType,
                programmingLanguage: question.programmingLanguage as any,
                concepts: question.concepts,
                content: question.content,
                contentMd: question.contentMd,
                marks: question.marks,
                expectedAnswer: question.expectedAnswer,
                markingBreakdown: question.markingBreakdown,
                explanation: question.explanation,
                partialCredit: question.partialCredit,
                sourceContentMarkdown: question.sourceContentMarkdown,
                taskItems: question.taskItems,
                visualElements: question.visualElements,
                status: "PENDING",
              },
            });
          }
        });
      });

      return {
        success: true,
        sourceId: source.sourceId,
        questionCount: structured.questions.length,
      };
    } catch (error) {
      try {
        await step.run("mark-paper3-source-error", async () => {
          await prisma.paper3Source.update({
            where: { id: source.sourceId },
            data: { status: "ERROR" },
          });
        });
      } catch {
        // Preserve the original failure. Error logging shouldn't become its own drama.
      }

      throw error;
    }
  },
);

export const generatePaper3Mock = inngest.createFunction(
  {
    name: "Generate Paper 3 Mock",
    id: "generate-paper3-mock",
    triggers: {
      event: "paper3/generate-mock",
    },
  },
  async ({ event, step }) => {
    const data = event.data as GenerateMockInput;

    try {
      const rawQuestions = await generateNewQuestions(data, step);
      const sourceMarkdown = `# ${data.title}\n\n${
        data.description ?? "AI-generated Paper 3 mock."
      }`;

      const normalizedQuestions = rawQuestions.map((question) =>
        normalizeQuestion(question, sourceMarkdown),
      );

      const totalMarks = normalizedQuestions.reduce(
        (sum, question) => sum + question.marks,
        0,
      );

      const dominantTaskType =
        normalizedQuestions[0]?.taskType ?? "INPUT_FIELD";

      const created = await step.run(
        "create-paper3-mock-and-questions",
        async () => {
          return prisma.$transaction(async (tx) => {
            const theSubject =
              data.subject ?? ("COMPUTER_SCIENCE" as Paper3Subject);

            const generatedSource = await tx.paper3Source.create({
              data: {
                title: `${data.title} Source`,
                year: new Date().getFullYear(),
                subject: theSubject,
                section: data.section ?? "A",
                category: inferCategoryFromTaskType(dominantTaskType),
                paperType: "QUESTION_PAPER",
                sourceType: "AI_GENERATED",
                fileUrl: `https://generated.ticlearn.local/paper3/${slugify(
                  data.title,
                )}`,
                fileName: `${slugify(data.title)}.md`,
                extractedText: stripMarkdown(sourceMarkdown),
                contentMarkdown: sourceMarkdown,
                status: "READY",
              },
            });

            const mock = await tx.paper3Mock.create({
              data: {
                title: data.title,
                description: data.description,
                subject: theSubject,
                focusCategory: data.focusCategory ?? "MIXED",
                timeLimit: data.timeLimit ?? 120,
                totalMarks,
                createdBy: data.createdBy,
                status: "DRAFT",
                visibleToAllStudents: true,
              },
            });

            for (const [index, question] of normalizedQuestions.entries()) {
              const createdQuestion = await tx.paper3Question.create({
                data: {
                  sourceId: generatedSource.id,
                  questionNumber: question.questionNumber || String(index + 1),
                  taskNumber: question.taskNumber,
                  subPart: question.subPart,
                  title: question.title,
                  section: question.section,
                  skillType: question.skillType,
                  taskType: question.taskType,
                  programmingLanguage:
                    question.programmingLanguage as Paper3Language | null,
                  concepts: question.concepts,
                  content: question.content,
                  contentMd: question.contentMd,
                  marks: question.marks,
                  expectedAnswer: question.expectedAnswer,
                  markingBreakdown: question.markingBreakdown,
                  explanation: question.explanation,
                  partialCredit: question.partialCredit,
                  requireAnswer: question.requireAnswer ?? true,
                  sourceContentMarkdown: question.sourceContentMarkdown,
                  taskItems: question.taskItems,
                  visualElements: question.visualElements,
                  status: "PENDING",
                },
              });

              await tx.paper3MockQuestion.create({
                data: {
                  mockId: mock.id,
                  questionId: createdQuestion.id,
                  order: index,
                  marks: question.marks,
                },
              });
            }

            return mock;
          });
        },
      );

      return {
        success: true,
        mockId: created.id,
        questionCount: normalizedQuestions.length,
        totalMarks,
      };
    } catch (error) {
      throw error;
    }
  },
);
