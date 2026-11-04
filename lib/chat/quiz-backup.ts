import { api } from "@/lib/api-client";
import {
  loadQuizSnapshot,
  setActiveRunId,
  snapshotKey,
  type QuizSnapshot,
} from "@/lib/chat/quiz-snapshot";

/**
 * The light server mirror of the browser quiz snapshot. Writes pace to at
 * most one per 2 seconds with last write wins per run id. A failed write
 * skips quietly and the browser copy stays the source of truth, then the
 * next mark or move retries.
 */
const BACKUP_PACE_MS = 2000;

let lastWriteAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let queued: { conversationId: string; snapshot: QuizSnapshot } | null = null;

async function writeNow(
  conversationId: string,
  snapshot: QuizSnapshot,
): Promise<void> {
  try {
    await api.mutations.chat?.saveRunBackup?.({
      conversationId,
      clientRunId: snapshot.clientRunId,
      snapshot,
    });
    lastWriteAt = Date.now();
  } catch {
    return;
  }
}

function flush(): void {
  timer = null;
  const next = queued;
  queued = null;
  if (next) void writeNow(next.conversationId, next.snapshot);
}

export function scheduleRunBackup(
  conversationId: string,
  snapshot: QuizSnapshot,
): void {
  if (typeof window === "undefined") return;
  if (!snapshot.quizId) return;
  if (!snapshot.clientRunId) return;
  queued = { conversationId, snapshot };
  const wait = BACKUP_PACE_MS - (Date.now() - lastWriteAt);
  if (wait <= 0) {
    flush();
    return;
  }
  if (timer === null) {
    timer = setTimeout(flush, wait);
  }
}

export function clearRunBackup(
  conversationId: string,
  clientRunId?: string,
): void {
  if (typeof window === "undefined") return;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  queued = null;
  api.mutations.chat
    ?.clearRunBackup?.(conversationId, clientRunId)
    .catch(() => null);
}

export async function readRunBackup(
  conversationId: string,
  clientRunId?: string,
): Promise<{ snapshot: string | null; clientRunId?: string }> {
  try {
    const res = await api.mutations.chat?.readRunBackup?.(
      conversationId,
      clientRunId,
    );
    if (!res || typeof res.snapshot === "undefined") {
      return { snapshot: null };
    }
    return res;
  } catch {
    return { snapshot: null };
  }
}

/**
 * New device resume. When this browser holds no run for the conversation,
 * the server backup is the only copy. It is validated through the same
 * snapshot loader the browser copy uses, then seeded into storage so the
 * runner below can hydrate from one source. Returns true when a runnable
 * run was found.
 */
export async function seedServerBackup(
  conversationId: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !conversationId) return false;
  try {
    const { snapshot: raw, clientRunId } =
      await readRunBackup(conversationId);
    if (typeof raw !== "string" || !raw || !clientRunId) return false;
    try {
      window.sessionStorage.setItem(
        snapshotKey(conversationId, clientRunId),
        raw,
      );
    } catch {
      return false;
    }
    const saved = loadQuizSnapshot(conversationId, clientRunId);
    if (!saved?.quizId) {
      try {
        window.sessionStorage.removeItem(
          snapshotKey(conversationId, clientRunId),
        );
      } catch {
        /* A stale copy that cannot be cleared is still unusable. */
      }
      return false;
    }
    setActiveRunId(conversationId, clientRunId);
    return true;
  } catch {
    return false;
  }
}
