/**
 * Browser snapshot for one in chat quiz run. Session storage keeps the run
 * per tab, so concurrent tabs stay separate runs. A light server backup
 * mirrors the same JSON so a new device can resume. A version mismatch or a
 * missing quiz row drops the snapshot with a plain message plus retry at the
 * call site.
 */

export const QUIZ_SNAPSHOT_VERSION = 6;

/** One dot in the shared order. Quiz dots score, diagram dots never do. */
export type QuizSnapshotItem = {
  kind: "quiz" | "diagram";
  /** Quiz item: the question id. Diagram item: the drawn artifact id. */
  ref: string;
  /** Diagram item only: the caption shown while art loads. */
  caption?: string;
};

const MAX_SNAPSHOT_ITEMS = 60;

function normalizeItems(raw: unknown): QuizSnapshotItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: QuizSnapshotItem[] = [];
  for (const entry of raw.slice(0, MAX_SNAPSHOT_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const kind = (entry as { kind?: unknown }).kind;
    const ref = (entry as { ref?: unknown }).ref;
    if (
      (kind === "quiz" || kind === "diagram") &&
      typeof ref === "string" &&
      ref.length > 0
    ) {
      const caption = (entry as { caption?: unknown }).caption;
      items.push(
        typeof caption === "string" && caption.length > 0
          ? { kind, ref, caption: caption.slice(0, 200) }
          : { kind, ref },
      );
    }
  }
  return items.length > 0 ? items : undefined;
}

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
  /** The shared dots order. Undefined means derive from questions plus art. */
  items?: QuizSnapshotItem[];
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

/** The largest snapshot the browser or the server backup will hold. */
export const MAX_SNAPSHOT_BYTES = 200 * 1024;

/** Dots order in, snapshot items out. Quiz dots score, diagram dots never do. */
export function toSnapshotItems(
  dots: Array<
    | { kind: "quiz"; questionId: string }
    | { kind: "diagram"; artifactId: string; caption?: string }
  >,
): QuizSnapshotItem[] {
  return dots.map((dot) =>
    dot.kind === "quiz"
      ? { kind: "quiz", ref: dot.questionId }
      : {
          kind: "diagram",
          ref: dot.artifactId,
          ...(dot.caption ? { caption: dot.caption.slice(0, 200) } : {}),
        },
  );
}

export function saveQuizSnapshot(
  conversationId: string,
  snapshot: QuizSnapshot,
): void {
  const store = storage();
  if (!store || !conversationId || !snapshot.clientRunId) return;
  try {
    const raw = JSON.stringify({ ...snapshot, version: QUIZ_SNAPSHOT_VERSION });
    if (raw.length > MAX_SNAPSHOT_BYTES) return;
    store.setItem(snapshotKey(conversationId, snapshot.clientRunId), raw);
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
      parsed.version !== 5 &&
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
      items: normalizeItems(parsed.items),
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
