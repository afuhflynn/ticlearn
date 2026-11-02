import { z } from "zod";
import { LEVEL_VALUES } from "@/constants/levels";

export const GOAL_VALUES = [
  "Semester & Final Exams",
  "Higher National Diploma (HND)",
  "Professional Certifications",
  "General Academic Revision",
] as const;

export const goalSchema = z.enum(GOAL_VALUES);

export const levelStepSchema = z.object({
  levelOfStudy: z.enum(LEVEL_VALUES as [string, ...string[]], {
    error: "Pick one of the study years shown.",
  }),
});

export const goalStepSchema = z.object({
  targetGoal: goalSchema,
});

export const schoolStepSchema = z.object({
  institution: z
    .string()
    .trim()
    .min(2, {
      message: "Tell me your school in a few letters.",
    })
    .max(120),
  program: z
    .string()
    .trim()
    .min(2, {
      message: "Tell me your program in a few letters.",
    })
    .max(120),
  faculty: z.string().trim().max(120).optional(),
});

export const finishSchema = z.object({
  levelOfStudy: z.enum(LEVEL_VALUES as [string, ...string[]]),
  targetGoal: goalSchema,
  institution: z.string().trim().min(2).max(120).optional(),
  faculty: z.string().trim().max(120).optional(),
  program: z.string().trim().min(2).max(120).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
});

export type FinishInput = z.infer<typeof finishSchema>;

export const STEP_KEYS = ["level", "goal", "school", "confirm"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const TOTAL_STEPS = STEP_KEYS.length;
