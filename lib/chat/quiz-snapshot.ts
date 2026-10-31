/**
 * Browser snapshot for one in chat quiz run. Session storage keeps the run
 * per tab, so concurrent tabs stay separate runs. Nothing reaches the
 * database mid run. A version mismatch or a missing quiz row drops the
 * snapshot with a plain message plus retry at the call site.
 */

export const QUIZ_SNAPSHOT_VERSION = 1;

export type QuizMark = { isCorrect: boolean; why: string };

export type QuizSnapshot = {
  version: number;
  quizId: string;
  answers: Record<string, string>;
  marks: Record<string, QuizMark>;
  currentIndex: number;
  count: number;
  clientRunId: string;
  updatedAt: number;
};

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
    if (parsed.version !== QUIZ_SNAPSHOT_VERSION) return null;
    if (!parsed.quizId || !parsed.clientRunId) return null;
    return {
      version: QUIZ_SNAPSHOT_VERSION,
      quizId: parsed.quizId,
      answers: parsed.answers ?? {},
      marks: parsed.marks ?? {},
      currentIndex: parsed.currentIndex ?? 0,
      count: parsed.count ?? 5,
      clientRunId: parsed.clientRunId,
      updatedAt: parsed.updatedAt ?? Date.now(),
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
