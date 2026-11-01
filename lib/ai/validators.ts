import { z } from "zod";

export const generatedQuestionSchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  question: z.string().min(1),
  options: z.array(z.string()),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  hint: z.string().max(200).optional().default(""),
  sourcePages: z.array(z.number().int().min(1)).optional().default([]),
  marks: z.number().int().min(1).max(10).optional().default(1),
  markSchemeMd: z.string().max(2000).optional().default(""),
  examinerNote: z.string().max(500).optional().default(""),
});

export const quizSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export const summarySchema = z.object({
  summary: z.string().min(1).max(500),
  topics: z.array(z.string().min(1)).min(3).max(5),
  keyPoints: z.array(z.string().min(1)).min(3).max(6),
});

export const gradingSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1),
  missedPoints: z.array(z.string()),
});

/** The longest hint that still reads well inside the docked runner card. */
export const HINT_MAX_CHARS = 140;

export function defaultSchemeFor(type: "MCQ" | "OPEN", marks: number): string {
  if (type === "MCQ") {
    return `Correct choice earns ${marks} mark${marks === 1 ? "" : "s"}.`;
  }
  const lines: string[] = [];
  for (let i = 1; i <= marks; i += 1) {
    lines.push(`Point ${i} earns 1 mark in your own words.`);
  }
  return lines.join("\n");
}

export function normalizeGeneratedQuestions(
  questions: z.input<typeof generatedQuestionSchema>[],
) {
  return questions
    .map((question) => {
      const rawMarks = Number(question.marks ?? 1);
      const safeMarks =
        Number.isFinite(rawMarks) && rawMarks >= 1 && rawMarks <= 10
          ? Math.floor(rawMarks)
          : 1;
      const explanationText = question.explanation.trim();
      const schemeText = (question.markSchemeMd ?? "").trim();
      const examinerText = (question.examinerNote ?? "").trim();
      const normalized = {
        ...question,
        question: question.question.trim(),
        correctAnswer: question.correctAnswer.trim(),
        explanation: explanationText,
        hint: (question.hint ?? "").trim().slice(0, HINT_MAX_CHARS),
        options: question.options.map((o) => o.trim()).filter(Boolean),
        sourcePages: Array.from(
          new Set(
            (question.sourcePages ?? [])
              .map((n) => Math.floor(Number(n)))
              .filter((n) => Number.isFinite(n) && n >= 1),
          ),
        ).slice(0, 10),
        marks: safeMarks,
        markSchemeMd: schemeText || defaultSchemeFor(question.type, safeMarks),
        examinerNote: examinerText || "",
      };
      if (normalized.type === "MCQ" && normalized.options.length !== 4)
        return null;
      if (normalized.type === "OPEN") normalized.options = [];
      if (
        !normalized.question ||
        !normalized.correctAnswer ||
        !normalized.explanation
      )
        return null;
      return normalized;
    })
    .filter((q): q is z.infer<typeof generatedQuestionSchema> => q !== null);
}

/** The longest suggestion that still fits one line on a 360 pixel screen. */
export const SUGGESTION_MAX_CHARS = 60;

/** Never more than three, never fewer than two when any survive. */
export const SUGGESTION_MAX_COUNT = 3;

/**
 * A suggestion is model output read from the open web, so it is treated as
 * untrusted: links keep only their words, markdown punctuation goes, the
 * length is capped and duplicates collapse. A chip sends its own short text
 * and nothing else, so a planted suggestion cannot become a link or a long
 * instruction.
 */
export function sanitizeSuggestions(input: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const text = raw
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[*_`~]/g, "")
      .replace(/^[#>\s]+/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length === 0 || text.length > SUGGESTION_MAX_CHARS) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    kept.push(text);
    if (kept.length === SUGGESTION_MAX_COUNT) break;
  }

  return kept.length >= 2 ? kept : [];
}

/**
 * Cutoff means the model stopped mid output because the answer grew too long.
 * The server checks the stop reason or a short validated set against the ask.
 */
export function isCutoffMessage(message: string): boolean {
  return /length|cutoff|truncat|too long|too big|max[_ ]?tokens|finish[_ ]?reason.*length/i.test(
    message ?? "",
  );
}

/**
 * One smaller retry count per spec. Half rounded down with a floor of 3.
 * At 3 or less no retry runs.
 */
export function smallerRetryCount(asked: number): number | null {
  if (!Number.isFinite(asked) || asked <= 3) return null;
  return Math.max(3, Math.floor(asked / 2));
}

/**
 * True cutoff when the stop says length or the parsed set is short.
 */
export function detectCutoff(input: {
  asked: number;
  got: number;
  stopReason?: string | null;
  errorMessage?: string | null;
}): boolean {
  if (input.errorMessage && isCutoffMessage(input.errorMessage)) return true;
  if (input.stopReason && /length/i.test(input.stopReason)) return true;
  return input.got < input.asked;
}
