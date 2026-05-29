import { z } from "zod";
import { generate } from "@/lib/ai/orchestrator";

const resultSchema = z.object({
  marks_awarded: z.number().int(),
  feedback: z.string(),
});

export async function gradeShortAnswer(params: {
  prompt: string;
  modelAnswer: string;
  studentAnswer: string;
  maxMarks: number;
}): Promise<{ marksAwarded: number; feedback: string }> {
  const { prompt, modelAnswer, studentAnswer, maxMarks } = params;

  try {
    const { object } = await generate({
      task: "grading",
      schema: resultSchema,
      system: `You mark GCE Computer Science / ICT Paper 3 short answers. Be fair: minor spelling or spacing differences should not reduce marks if the idea is correct. Award partial credit when appropriate. Maximum marks for this item is ${maxMarks}. marks_awarded must be an integer from 0 to ${maxMarks}.`,
      prompt: `Question:\n${prompt}\n\nOfficial model answer (guideline):\n${modelAnswer}\n\nStudent answer:\n${studentAnswer || "(empty)"}`,
      modelOptions: { temperature: 0.2 },
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
