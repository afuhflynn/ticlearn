/**
 * The strict split between build chatter and teaching.
 *
 * Text parts carry both progress narration and the final answer. The activity
 * line owns the narration, the answer body owns the teaching. This filter
 * drops echoed build sentences from answer text before render, so the student
 * reads the teaching once.
 */

/** Progress phrasing that never reads as teaching. Matched case insensitive as substring. */
export const ECHO_PATTERNS = [
  "i will",
  "let me",
  "i am going to",
  "searching",
  "reading",
  "checking",
  "looking up",
  "working through",
  "let us",
  "i will now",
] as const;

/**
 * Split prose into sentences while keeping the delimiter. Newlines split first
 * so a pasted list never joins into one long sentence.
 */
function splitSentences(text: string): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed.trim()) {
      out.push("");
      continue;
    }
    const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z0-9("])/);
    for (const part of parts) out.push(part);
  }
  return out;
}

function isEcho(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return ECHO_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Drop echoed build sentences from answer text. Returns the cleaned text.
 * Teaching that happens to contain a progress word inside a longer
 * explanation stays, because only short progress shaped sentences go.
 * A sentence longer than 160 characters is never stripped, so a real
 * explanation that mentions searching still reads whole.
 */
export function filterEchoSentences(text: string): string {
  if (!text.trim()) return text;
  const sentences = splitSentences(text);
  const kept = sentences.filter((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return true;
    if (trimmed.length > 160) return true;
    return !isEcho(trimmed);
  });
  const cleaned = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

/**
 * True when the filter removed everything. The caller shows a short fallback
 * line plus expanded activity instead of a blank answer.
 */
export function isEchoOnly(text: string): boolean {
  if (!text.trim()) return false;
  return filterEchoSentences(text).trim().length === 0;
}
