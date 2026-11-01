import type {
  WizardDifficultyChoice,
  WizardLevelChoice,
} from "@/lib/chat/quiz-snapshot";

export type WizardLevel = {
  value: WizardLevelChoice;
  title: string;
  subtitle: string;
  format: string;
};

export type WizardCount = {
  count: number;
  difficulty: WizardDifficultyChoice;
  title: string;
  subtitle: string;
  marks: number;
};

export const WIZARD_LEVELS: WizardLevel[] = [
  {
    value: "GCE",
    title: "GCE A Level",
    subtitle: "Cameroon GCE board style",
    format: "MCQ plus structured",
  },
  {
    value: "HND",
    title: "HND plus university",
    subtitle: "Higher diploma and degree style",
    format: "MCQ plus open",
  },
  {
    value: "PROF",
    title: "Professional plus certification",
    subtitle: "Career and exam board style",
    format: "Scenario plus MCQ",
  },
  {
    value: "MIXED",
    title: "Mixed",
    subtitle: "A blend that fits any course",
    format: "Mixed format",
  },
];

export const WIZARD_COUNTS: WizardCount[] = [
  {
    count: 5,
    difficulty: "STANDARD",
    title: "5 questions",
    subtitle: "Standard, around 20 marks",
    marks: 20,
  },
  {
    count: 5,
    difficulty: "HARD",
    title: "5 questions",
    subtitle: "Hard, around 25 marks",
    marks: 25,
  },
  {
    count: 10,
    difficulty: "STANDARD",
    title: "10 questions",
    subtitle: "Standard, around 40 marks",
    marks: 40,
  },
  {
    count: 10,
    difficulty: "MIXED",
    title: "10 questions",
    subtitle: "Mixed difficulty, around 45 marks",
    marks: 45,
  },
];

export function estimateMarks(
  count: number,
  difficulty: WizardDifficultyChoice,
): number {
  if (difficulty === "STANDARD") return count * 4;
  return count * 4 + 5;
}

export function defaultLevel(): WizardLevelChoice {
  return "MIXED";
}

export function defaultCount(): {
  count: number;
  difficulty: WizardDifficultyChoice;
} {
  return { count: 5, difficulty: "STANDARD" };
}

/**
 * Reads a clear ask like give me 10 hard HND questions and prefills the
 * steps for confirm. Returns the picks it understood and nothing more.
 */
export function prefillFromText(raw: string): {
  count?: number;
  difficulty?: WizardDifficultyChoice;
  level?: WizardLevelChoice;
} {
  const text = raw.toLowerCase();
  const out: {
    count?: number;
    difficulty?: WizardDifficultyChoice;
    level?: WizardLevelChoice;
  } = {};
  const countMatch = text.match(/\b(5|10)\b/);
  if (countMatch) out.count = Number(countMatch[1]);
  if (text.includes("hard")) out.difficulty = "HARD";
  else if (text.includes("mixed")) out.difficulty = "MIXED";
  else if (text.includes("standard") || text.includes("easy"))
    out.difficulty = "STANDARD";
  if (text.includes("hnd") || text.includes("university")) out.level = "HND";
  else if (text.includes("gce") || text.includes("a level")) out.level = "GCE";
  else if (text.includes("professional") || text.includes("certification"))
    out.level = "PROF";
  else if (text.includes("mixed")) out.level = "MIXED";
  return out;
}

export function resolveCountInput(
  count: number,
  difficulty: WizardDifficultyChoice,
): { count: number; difficulty: WizardDifficultyChoice; marks: number } {
  const safeCount = count === 5 || count === 10 ? count : 5;
  const marks = estimateMarks(safeCount, difficulty);
  return { count: safeCount, difficulty, marks };
}
