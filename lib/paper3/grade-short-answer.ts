import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const gradingModel = openai(process.env.OPENAI_GRADING_MODEL ?? "gpt-4o-mini");

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

  const { object } = await generateObject({
    model: gradingModel,
    schema: resultSchema,
    temperature: 0.2,
    system: `You mark GCE Computer Science / ICT Paper 3 short answers. Be fair: minor spelling or spacing differences should not reduce marks if the idea is correct. Award partial credit when appropriate. Maximum marks for this item is ${maxMarks}. marks_awarded must be an integer from 0 to ${maxMarks}.`,
    prompt: `Question:\n${prompt}\n\nOfficial model answer (guideline):\n${modelAnswer}\n\nStudent answer:\n${studentAnswer || "(empty)"}`,
  });

  let marks = object.marks_awarded;
  if (marks < 0) marks = 0;
  if (marks > maxMarks) marks = maxMarks;

  return { marksAwarded: marks, feedback: object.feedback };
}
