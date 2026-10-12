import { generateObject } from "ai";
import { z } from "zod";
import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromWord,
} from "@/lib/ai";
import { generate } from "@/lib/ai/orchestrator";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

const parsedQuestionSchema = z.object({
  sections: z.array(
    z.object({
      name: z.string().nullable(),
      questions: z.array(
        z.object({
          number: z.string(),
          text: z.string(),
          marks: z.number().optional().default(1),
          type: z.enum(["MCQ", "STRUCTURED", "PRACTICAL", "ESSAY"]),
          options: z.array(z.string()).optional(),
        }),
      ),
    }),
  ),
});

async function extractText(fileUrl: string, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();
  const uploadthingKey = fileUrl.includes("ufs.sh/f/")
    ? fileUrl.split("ufs.sh/f/").pop()!.split("?")[0]
    : fileUrl.includes("utfs.io/f/")
      ? fileUrl.split("utfs.io/f/").pop()!.split("?")[0]
      : null;

  try {
    if (ext === "pdf") {
      return uploadthingKey
        ? await extractTextFromPDF(uploadthingKey)
        : await extractTextFromPDF(fileUrl);
    }
    if (ext === "docx" || ext === "doc") {
      return await extractTextFromWord(uploadthingKey || undefined, fileUrl);
    }
    if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
      return await extractTextFromImage(uploadthingKey || undefined, fileUrl);
    }
  } catch (err) {
    console.error(`[Ingest] Extraction failed:`, err);
    throw err;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export const ingestQuestions = inngest.createFunction(
  {
    name: "Ingest Questions",
    id: "ingest-questions",
    triggers: { event: "questions/ingest" },
  },
  async ({ event, step }) => {
    const { jobId, componentId, examSourceId, fileUrl, fileName } =
      event.data as {
        jobId: string;
        componentId: string;
        examSourceId?: string | null;
        fileUrl: string;
        fileName: string;
      };

    const rawText = await step.run("extract-text", () =>
      extractText(fileUrl, fileName),
    );
    if (!rawText || rawText.length < 50) {
      throw new Error("Extracted text too short or empty");
    }

    const parsed = await step.run("parse-questions", async () => {
      const { text: system } = await getPrompt(
        "ingest",
        "parse_questions_system",
      );
      const { text: prompt, settings } = await getPrompt(
        "ingest",
        "parse_questions",
        {
          paperText: rawText.substring(0, 50000),
        },
      );
      const result = await generate({
        task: "reasoning",
        schema: parsedQuestionSchema,
        system,
        prompt,
        ...promptCallFields(settings),
      });

      return result.object;
    });

    const questions = await step.run("save-questions", async () => {
      const saved: Array<{ id: string; number: string; type: string }> = [];

      for (const section of parsed.sections) {
        for (const q of section.questions) {
          const created = await prisma.question.create({
            data: {
              componentId,
              examSourceId: examSourceId || null,
              text: q.text,
              type: q.type,
              marks: q.marks ?? 1,
              section: section.name || undefined,
              sourceType: "AI_GENERATED",
            },
          });
          saved.push({ id: created.id, number: q.number, type: created.type });
        }
      }

      return saved;
    });

    return { success: true, jobId, questionCount: questions.length };
  },
);
