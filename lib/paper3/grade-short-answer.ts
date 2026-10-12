import { z } from "zod";
import { generate } from "@/lib/ai/orchestrator";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

const resultSchema = z.object({
  marks_awarded: z.number().int(),
  feedback: z.string(),
});

export async function gradeShortAnswer(params: {
  prompt: string;
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  userId?: string | null;
}): Promise<{ marksAwarded: number; feedback: string }> {
  const { prompt, modelAnswer, studentAnswer, maxMarks, userId } = params;

  try {
    const { text: system } = await getPrompt(
      "paper3",
      "grade_short_answer_system",
      { maxMarks },
    );
    const { text: userPrompt, settings } = await getPrompt(
      "paper3",
      "grade_short_answer",
      {
        question: prompt,
        modelAnswer,
        studentAnswer: studentAnswer || "(empty)",
      },
    );
    const { object } = await generate({
      task: "grading",
      schema: resultSchema,
      system,
      prompt: userPrompt,
      userId,
      ...promptCallFields(settings),
    });

    let marks = object.marks_awarded;
    if (marks < 0) marks = 0;
    if (marks > maxMarks) marks = maxMarks;

    return { marksAwarded: marks, feedback: object.feedback };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[gradeShortAnswer] AI grading failed: ${msg}`);
    return { marksAwarded: 0, feedback: "AI grading unavailable." };
  }
}
