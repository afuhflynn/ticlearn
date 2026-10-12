/** Domain framing for Paper 3 tutor, revision guides, and grounded question generation. */
export const examSystemPreamble = `You are an expert tutor for Cameroon GCE Advanced Level Computer Science and ICT Paper 3.
The learner is preparing for the practical paper. Your scope is STRICTLY:
- Relational databases and Microsoft Access tasks at Paper 3 depth.
- SQL (SELECT/JOIN/GROUP BY/HAVING) for Computer Science Paper 3.
- Spreadsheets / Excel formulas and grids where relevant to ICT Paper 3.
- C and Pascal programming: control flow, arrays, strings, functions, tracing, and small coding tasks. Do NOT use pointers, pointer notation (*, &), dynamic allocation, or address arithmetic unless the user explicitly opts in.
- Web programming with HTML/CSS only (inline styling), no JavaScript.

Do not introduce topics outside this examination focus (for example generic web frameworks, Java, Python tutorials, or networking theory unrelated to the paper).

When past-paper extracts, approved question samples, or file references are provided, treat them as PRIMARY grounding: mirror phrasing style, mark allocation patterns, and topic mix. If extracts are thin, stay conservative and typical for GCE Paper 3 rather than inventing niche topics.

Tone: precise, exam-oriented, zero fluff. No emoji. Use clear Markdown headings (##, ###), dense paragraphs, and bullet lists where they aid memory.`;

export type RevisionGuideEmphasis =
  | "DATABASE"
  | "C_PROGRAMMING"
  | "MIXED"
  | "SPREADSHEET"
  | "PROGRAMMING"
  | "WEB_PROGRAMMING";

export function revisionGuideUserPrompt(params: {
  emphasis: RevisionGuideEmphasis;
  pastPaperContext: string;
  customNotes?: string;
}) {
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

  return `Produce a **super-detailed** revision guide suitable for export to a multi-page PDF (target well over three pages when rendered).

${focus}

**Past paper and question bank (PRIMARY CONTEXT):**
"""
${params.pastPaperContext || "No extracts uploaded yet — produce a conservative but detailed GCE Paper 3 guide."}
"""

${params.customNotes ? `**Additional instructor notes:**\n${params.customNotes}\n` : ""}

**Output rules:**
- Markdown only. No preamble ("Certainly").
- No emoji.
- Prioritise completeness and exam-style depth over brevity.`;
}

export function groundedQuestionBatchPrompt(params: {
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
}) {
  return `Create exactly ${params.count} **original** practice questions for GCE Paper 3.
Focus category: ${params.focusCategory}
Difficulty: ${params.difficulty}
${params.mockTitle ? `Mock title: ${params.mockTitle}` : ""}

Rules:
- Questions must be original variants, NOT copies of the bank below.
- Ground style, difficulty, command words, and mark patterns in the source bank.
- Prefer markdown-rich stems where tables, grids, or code blocks are natural.
- For programming items: no pointers, malloc/free, or pointer parameters.
- For web items: HTML/CSS only, inline styling, no JavaScript.

Past paper / approved question bank:
"""
${params.pastPaperContext || "None supplied — use typical GCE Paper 3 style."}
"""

${params.notes ? `Author notes: ${params.notes}` : ""}`;
}

export function tutorUserPrompt(
  latestUserMessage: string,
  pastPaperContext: string,
) {
  return `Past paper context (may be empty):
"""
${pastPaperContext}
"""

Student message:
${latestUserMessage}`;
}
