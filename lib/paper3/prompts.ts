import { getPrompt, type PromptSettings } from "@/lib/prompts/loader";

/** Domain framing for Paper 3 tutor, revision guides, and grounded question generation. */
export async function getExamSystemPreamble(): Promise<string> {
  const { text } = await getPrompt("paper3", "preamble");
  return text;
}

export type RevisionGuideEmphasis =
  | "DATABASE"
  | "C_PROGRAMMING"
  | "MIXED"
  | "SPREADSHEET"
  | "PROGRAMMING"
  | "WEB_PROGRAMMING";

export async function revisionGuideUserPrompt(params: {
  emphasis: RevisionGuideEmphasis;
  pastPaperContext: string;
  customNotes?: string;
}): Promise<{ text: string; settings: PromptSettings }> {
  const focus =
    params.emphasis === "MIXED"
      ? "Balance deep coverage across database/SQL, spreadsheet, programming, and web tasks with realistic Paper 3 weighting."
      : params.emphasis === "DATABASE"
        ? "This guide is database-heavy. Open with ER diagrams, relationships, and cardinalities before other database topics."
        : params.emphasis === "SPREADSHEET"
          ? "This guide is spreadsheet-heavy. Focus on Excel formulas, cell references, and grid interpretation."
          : params.emphasis === "WEB_PROGRAMMING"
            ? "This guide is web-heavy. HTML structure, inline CSS, forms, and tables only — no JavaScript."
            : params.emphasis === "PROGRAMMING" ||
                params.emphasis === "C_PROGRAMMING"
              ? "This guide is programming-heavy. C/Pascal control flow, arrays, strings, functions, tracing. No pointers."
              : "Produce a mixed practical guide aligned to GCE Paper 3.";

  const { text, settings } = await getPrompt("paper3", "revision_guide", {
    focus,
    pastPaperContext: params.pastPaperContext,
    instructorNotes: params.customNotes
      ? `**Additional instructor notes:**\n${params.customNotes}\n`
      : "",
  });
  return { text, settings };
}

export async function groundedQuestionBatchPrompt(params: {
  focusCategory:
    | "MIXED"
    | "DATABASE"
    | "SPREADSHEET"
    | "PROGRAMMING"
    | "WEB_PROGRAMMING";
  count: number;
  difficulty: "foundation" | "standard" | "stretch";
  pastPaperContext: string;
  notes?: string;
  mockTitle?: string;
}): Promise<string> {
  const { text } = await getPrompt("paper3", "grounded_question_batch", {
    count: params.count,
    focusCategory: params.focusCategory,
    difficulty: params.difficulty,
    mockTitle: params.mockTitle ? `Mock title: ${params.mockTitle}` : "",
    pastPaperContext:
      params.pastPaperContext ||
      "None supplied — use typical GCE Paper 3 style.",
    authorNotes: params.notes ? `Author notes: ${params.notes}` : "",
  });
  return text;
}

export async function tutorUserPrompt(
  latestUserMessage: string,
  pastPaperContext: string,
): Promise<string> {
  const { text } = await getPrompt("paper3", "tutor_user", {
    pastPaperContext,
    latestUserMessage,
  });
  return text;
}
