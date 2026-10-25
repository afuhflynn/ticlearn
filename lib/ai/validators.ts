import { z } from "zod";

export const generatedQuestionSchema = z.object({
  type: z.enum(["MCQ", "OPEN"]),
  question: z.string().min(1),
  options: z.array(z.string()),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
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

export function normalizeGeneratedQuestions(
  questions: z.infer<typeof generatedQuestionSchema>[],
) {
  return questions
    .map((question) => {
      const normalized = {
        ...question,
        question: question.question.trim(),
        correctAnswer: question.correctAnswer.trim(),
        explanation: question.explanation.trim(),
        options: question.options.map((o) => o.trim()).filter(Boolean),
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
