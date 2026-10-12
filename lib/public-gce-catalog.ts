/**
 * Shared serialization for marketing / public catalog endpoints
 * (landing page, etc.).
 */

import type {
  BlueprintSection,
  ExamBlueprint,
} from "@/lib/generated/prisma/client";

type ComponentForPublic = {
  name: string;
  code: string;
  program: { name: string };
};

export type PublicBlueprintCard = {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  durationMin: number;
  questionCount: number;
  paperStyle: "MCQ" | "Structured" | "Mixed";
  subjectLabel: string;
  componentName: string;
  programName: string;
  sections: Array<{
    name: string;
    questionCount: number;
    totalMarks: number;
    questionType: BlueprintSection["questionType"];
  }>;
};

export function summarizePaperStyle(questionTypes: string[]) {
  if (questionTypes.length === 0) return "Mixed" as const;
  const set = new Set(questionTypes);
  if (set.size === 1 && set.has("MCQ")) return "MCQ" as const;
  if (set.has("STRUCTURED") || set.has("ESSAY") || set.has("OPEN"))
    return "Structured" as const;
  return "Mixed" as const;
}

export function examBlueprintToPublic(
  bp: ExamBlueprint & {
    sections: BlueprintSection[];
    component: ComponentForPublic;
  },
): PublicBlueprintCard {
  const types = bp.sections.map((s) => s.questionType);
  const questionCount = bp.sections.reduce((n, s) => n + s.questionCount, 0);
  const paperStyle = summarizePaperStyle(types);
  const subjectLabel =
    bp.component.program.name.trim() ||
    bp.component.name.trim() ||
    "GCE subject";

  return {
    id: bp.id,
    name: bp.name,
    description: bp.description,
    totalMarks: bp.totalMarks,
    durationMin: bp.durationMin,
    questionCount,
    paperStyle,
    componentName: bp.component.name,
    programName: bp.component.program.name,
    subjectLabel,
    sections: bp.sections.map((s) => ({
      name: s.name,
      questionCount: s.questionCount,
      totalMarks: s.totalMarks,
      questionType: s.questionType,
    })),
  };
}
