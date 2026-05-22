import type {
  MockSessionPayload,
  MockSessionQuestion,
} from "@/lib/mock-generator";

function normMcqLetter(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim().toUpperCase();
  const m = s.match(/^([A-D])/);
  return m ? m[1] : "";
}

export type MockReviewPerQuestionRow = {
  sectionName: string;
  questionId: string;
  stem: string;
  userAnswer: string;
  correctOption: string | null;
  /** Mark-scheme / model answer for structured items — omitted when the bank/legacy item has none. */
  modelAnswer: string | null;
  earned: number;
  maxMarks: number;
  questionType: string;
  options?: MockSessionQuestion["options"];
};

/** Grade a saved practice session payload against submitted answers (MCQ keyed by letter). */
export function scorePracticePayload(
  payload: MockSessionPayload,
  answers: Record<string, unknown>,
): {
  score: number;
  sectionRows: Array<{
    sectionName: string;
    totalMarks: number;
    earned: number;
    questionCount: number;
  }>;
  perQuestion: MockReviewPerQuestionRow[];
} {
  const perQuestion: MockReviewPerQuestionRow[] = [];

  let earnedSum = 0;

  for (const sec of payload.sections) {
    const qt = sec.questionType;
    for (const q of sec.questions) {
      const userRaw = answers[q.questionId];
      const userStr = userRaw != null ? String(userRaw).trim() : "";

      let qEarned = 0;

      const isMcq = qt === "MCQ" || String(q.type).toUpperCase() === "MCQ";
      let correctLetter: string | null = null;
      if (
        typeof q.correctOption === "string" &&
        /^[ABCD]$/i.test(q.correctOption.trim())
      ) {
        correctLetter = q.correctOption.trim().toUpperCase().slice(0, 1);
      }

      if (isMcq) {
        const picked = normMcqLetter(userStr);
        if (correctLetter) {
          qEarned = picked === correctLetter ? q.marks : 0;
        } else {
          qEarned = picked ? q.marks : 0;
        }
      } else {
        qEarned = userStr.length > 0 ? q.marks : 0;
      }

      earnedSum += qEarned;

      const modelAns =
        !isMcq &&
        typeof q.modelAnswer === "string" &&
        q.modelAnswer.trim().length > 0
          ? q.modelAnswer.trim()
          : null;

      perQuestion.push({
        sectionName: sec.name,
        questionId: q.questionId,
        stem: q.text,
        userAnswer: userStr,
        correctOption: isMcq ? correctLetter : null,
        modelAnswer: modelAns,
        earned: qEarned,
        maxMarks: q.marks,
        questionType: String(q.type),
        ...(Array.isArray(q.options) ? { options: q.options } : {}),
      });
    }
  }

  const earnedRounded = Math.round(earnedSum);

  const sectionRows = payload.sections.map((sec) => ({
    sectionName: sec.name,
    totalMarks: sec.totalMarks,
    questionCount: sec.questionCount,
    earned: perQuestion
      .filter((row) => row.sectionName === sec.name)
      .reduce((acc, row) => acc + row.earned, 0),
  }));

  return { score: earnedRounded, sectionRows, perQuestion };
}
