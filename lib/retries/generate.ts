import { z } from "zod";
import { generate } from "@/lib/ai/orchestrator";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

export const retryOutputSchema = z.object({
  concept: z.string().min(1).max(80),
  sourcePages: z.array(z.number().int().positive()).default([]),
  feedbackMd: z.string().min(1).max(2000),
  retryQuestion: z.string().min(1),
  retryOptions: z.array(z.string().min(1)).length(4),
  retryCorrectAnswer: z.string().min(1),
});

export type RetryOutput = z.infer<typeof retryOutputSchema>;

export const RETRY_TOTAL_BUDGET_MS = 15_000;

export interface RetryGenerateInput {
  missedQuestion: string;
  userAnswer: string;
  correctAnswer: string;
  conceptHint?: string;
  noteExcerpt: string;
  pageContext: string;
  userId?: string | null;
}

function withTotalBudget<T>(ms: number, run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("retry generation timed out")),
      ms,
    );
  });
  return Promise.race([run(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function generateRetryContent(input: RetryGenerateInput): Promise<{
  output: RetryOutput;
  modelId: string;
  latencyMs: number;
}> {
  const started = Date.now();
  const { text: promptBody, settings } = await getPrompt(
    "retry",
    "explain_and_retry",
    {
      conceptHint:
        input.conceptHint ?? "Use the missed question to name the idea.",
      missedQuestion: input.missedQuestion.slice(0, 4000),
      userAnswer: input.userAnswer.slice(0, 2000),
      correctAnswer: input.correctAnswer.slice(0, 2000),
      noteExcerpt: input.noteExcerpt.slice(0, 6000),
      pageContext: input.pageContext.slice(0, 4000),
    },
  );
  const fields = promptCallFields(settings);

  const { object, modelId } = await withTotalBudget(RETRY_TOTAL_BUDGET_MS, () =>
    generate({
      task: "retry_explain",
      schema: retryOutputSchema,
      prompt: promptBody,
      ...fields,
      cacheTtlMs: 0,
      userId: input.userId ?? null,
    }),
  );

  if (!object.retryOptions.includes(object.retryCorrectAnswer)) {
    throw new Error("retry output key is not one of the options");
  }

  return {
    output: {
      ...object,
      concept: object.concept.slice(0, 80),
      feedbackMd: object.feedbackMd.slice(0, 2000),
    },
    modelId,
    latencyMs: Date.now() - started,
  };
}
