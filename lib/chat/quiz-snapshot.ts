/**
 * Browser snapshot for one in chat quiz run. Session storage keeps the run
 * per tab, so concurrent tabs stay separate runs. Nothing reaches the
 * database mid run. A version mismatch or a missing quiz row drops the
 * snapshot with a plain message plus retry at the call site.
 */

export const QUIZ_SNAPSHOT_VERSION = 5;

export type QuizMark = {
  isCorrect: boolean;
  why: string;
  marksEarned: number;
  marksTotal: number;
  schemeMd: string;
  examinerNote: string;
};

export type QuizRunnerMode = "quiz" | "flashcards";

export type WizardLevelChoice = "GCE" | "HND" | "PROF" | "MIXED";
export type WizardDifficultyChoice = "STANDARD" | "HARD" | "MIXED";

export type WizardState = {
  topicText?: string;
  noteId?: string | null;
  noteTitle?: string | null;
  levelChoice?: WizardLevelChoice;
  formatChoice?: string;
  count?: number;
  difficulty?: WizardDifficultyChoice;
  totalMarks?: number;
  stepIndex?: number;
  wizardDone?: boolean;
  collapsed?: boolean;
};

export type QuizSnapshot = {
  version: number;
  quizId: string | null;
  answers: Record<string, string>;
  marks: Record<string, QuizMark>;
  currentIndex: number;
  count: number;
  clientRunId: string;
  updatedAt: number;
  mode?: QuizRunnerMode;
  hintOpen?: Record<string, boolean>;
  minimized?: boolean;
  handoff?: {
    noteId: string | null;
    noteTitle: string | null;
    topicText: string | null;
    formatChoice: string | null;
    retryWithCount: number | null;
  } | null;
} & WizardState;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function activeKey(conversationId: string): string {
  return `ticlearn:quiz:active:${conversationId}`;
}

export function snapshotKey(conversationId: string, runId: string): string {
  return `ticlearn:quiz:run:${conversationId}:${runId}`;
}

export function newQuizRunId(): string {
  try {
    return `ticlearn-chat-${crypto.randomUUID()}`;
  } catch {
    return `ticlearn-chat-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export function getActiveRunId(conversationId: string): string | null {
  const store = storage();
  if (!store || !conversationId) return null;
  try {
    return store.getItem(activeKey(conversationId));
  } catch {
    return null;
  }
}

export function setActiveRunId(conversationId: string, runId: string): void {
  const store = storage();
  if (!store || !conversationId || !runId) return;
  try {
    store.setItem(activeKey(conversationId), runId);
  } catch {
    return;
  }
}

export function clearActiveRunId(conversationId: string): void {
  const store = storage();
  if (!store || !conversationId) return;
  try {
    store.removeItem(activeKey(conversationId));
  } catch {
    return;
  }
}

export function saveQuizSnapshot(
  conversationId: string,
  snapshot: QuizSnapshot,
): void {
  const store = storage();
  if (!store || !conversationId || !snapshot.clientRunId) return;
  try {
    store.setItem(
      snapshotKey(conversationId, snapshot.clientRunId),
      JSON.stringify({ ...snapshot, version: QUIZ_SNAPSHOT_VERSION }),
    );
    store.setItem(activeKey(conversationId), snapshot.clientRunId);
  } catch {
    return;
  }
}

export function loadQuizSnapshot(
  conversationId: string,
  runId: string,
): QuizSnapshot | null {
  const store = storage();
  if (!store || !conversationId || !runId) return null;
  try {
    const raw = store.getItem(snapshotKey(conversationId, runId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizSnapshot>;
    if (
      parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3 &&
      parsed.version !== 4 &&
      parsed.version !== QUIZ_SNAPSHOT_VERSION
    )
      return null;
    if (!parsed.clientRunId) return null;
    const isWizardRun =
      parsed.version === QUIZ_SNAPSHOT_VERSION &&
      (parsed.stepIndex != null || parsed.wizardDone != null);
    if (!parsed.quizId && !isWizardRun) return null;
    const rawMarks = (parsed.marks ?? {}) as Record<string, Partial<QuizMark>>;
    const marks: Record<string, QuizMark> = {};
    for (const [key, value] of Object.entries(rawMarks)) {
      const total = Number(value?.marksTotal ?? 1) || 1;
      const earned = value?.isCorrect
        ? total
        : Number(value?.marksEarned ?? 0) || 0;
      marks[key] = {
        isCorrect: Boolean(value?.isCorrect),
        why: String(value?.why ?? ""),
        marksEarned: earned,
        marksTotal: total,
        schemeMd: String(value?.schemeMd ?? ""),
        examinerNote: String(value?.examinerNote ?? ""),
      };
    }
    return {
      version: QUIZ_SNAPSHOT_VERSION,
      quizId: (parsed.quizId as string | null) ?? null,
      answers: parsed.answers ?? {},
      marks,
      currentIndex: parsed.currentIndex ?? 0,
      count: parsed.count ?? 5,
      clientRunId: parsed.clientRunId,
      updatedAt: parsed.updatedAt ?? Date.now(),
      mode: parsed.mode === "flashcards" ? "flashcards" : "quiz",
      hintOpen: parsed.hintOpen ?? {},
      minimized: parsed.minimized ?? false,
      handoff: parsed.handoff ?? null,
      topicText: parsed.topicText,
      noteId: parsed.noteId,
      noteTitle: parsed.noteTitle,
      levelChoice: parsed.levelChoice,
      formatChoice: parsed.formatChoice,
      difficulty: parsed.difficulty,
      totalMarks: parsed.totalMarks,
      stepIndex: parsed.stepIndex ?? 1,
      wizardDone: parsed.wizardDone ?? false,
      collapsed: parsed.collapsed ?? false,
    };
  } catch {
    return null;
  }
}

export function clearQuizSnapshot(conversationId: string, runId: string): void {
  const store = storage();
  if (!store || !conversationId || !runId) return;
  try {
    store.removeItem(snapshotKey(conversationId, runId));
    if (store.getItem(activeKey(conversationId)) === runId) {
      store.removeItem(activeKey(conversationId));
    }
  } catch {
    return;
  }
}
