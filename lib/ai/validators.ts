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
