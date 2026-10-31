import { z } from "zod";
import { generate } from "@/lib/ai/orchestrator";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

export const retryOutputSchema = z.object({
  concept: z.string().min(1).max(80),
  sourcePages: z.array(z.number().int().positive()).default([]),
  feedbackMd: z.string().min(1).max(2000),
  retryQuestion: z.string().min(1),
  retryOptions: z
    .array(z.string().min(1))
    .length(4)
    .refine((options) => new Set(options).size === options.length, {
      message: "retry options must be four distinct choices",
    }),
  retryCorrectAnswer: z.string().min(1),
});

export type RetryOutput = z.infer<typeof retryOutputSchema>;

export const RETRY_TOTAL_BUDGET_MS = 15_000;

/**
 * Per-leg budget for the Muse call behind a retry. Shorter than the shared
 * Muse default so a slow leg rejects in time for the OpenRouter fallback to
 * run inside the 15 second total create budget (spec 0029 AC-5).
 */
export const RETRY_MUSE_LEG_TIMEOUT_MS = 8_000;

export interface RetryGenerateInput {
  missedQuestion: string;
  userAnswer: string;
  correctAnswer: string;
  conceptHint?: string;
  noteExcerpt: string;
  pageContext: string;
  userId?: string | null;
}

function withTotalBudget<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const onTimeout = () => {
    controller.abort(new Error("retry generation timed out"));
  };
  const timer = setTimeout(onTimeout, ms);
  return run(controller.signal).finally(() => {
    clearTimeout(timer);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Context-sensitive reveal check: the key merely appearing as a term is fine
 * (a good explanation names the idea), but phrasing that identifies it as the
 * answer to the fresh question leaks the retry. Whole-word matching would flag
 * honest teaching, so only reveal phrasing around the key counts.
 */
export function feedbackRevealsKey(
  feedbackMd: string,
  retryCorrectAnswer: string,
): boolean {
  const key = retryCorrectAnswer.trim().toLowerCase();
  if (!key) return false;
  const feedback = feedbackMd.toLowerCase().replace(/\s+/g, " ");
  const escaped = escapeRegExp(key);
  const patterns = [
    `(correct\\s+answer|the\\s+answer|answer|key)\\s*(is|:|\\u2014|-)\\s*["']?${escaped}`,
    `${escaped}\\s+is\\s+(the\\s+)?correct`,
    `(choose|pick|picking|select|selecting)\\s+(is\\s+|is:\\s+)?["']?${escaped}`,
    `you\\s+should\\s+(have\\s+)?(chosen|picked|selected)\\s+["']?${escaped}`,
  ];
  return patterns.some((source) => new RegExp(source, "i").test(feedback));
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

  const { object, modelId } = await withTotalBudget(
    RETRY_TOTAL_BUDGET_MS,
    (signal) =>
      generate({
        task: "retry_explain",
        schema: retryOutputSchema,
        prompt: promptBody,
        ...fields,
        cacheTtlMs: 0,
        userId: input.userId ?? null,
        museLegTimeoutMs: RETRY_MUSE_LEG_TIMEOUT_MS,
        signal,
      }),
  );

  if (!object.retryOptions.includes(object.retryCorrectAnswer)) {
    throw new Error("retry output key is not one of the options");
  }

  if (feedbackRevealsKey(object.feedbackMd, object.retryCorrectAnswer)) {
    throw new Error("retry feedback reveals the key");
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
