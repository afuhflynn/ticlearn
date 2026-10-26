/**
 * The title a conversation carries until the model writes one.
 *
 * A student should never see "New Chat" in the sidebar after they have asked
 * something, and the model's title arrives in the background a few seconds
 * later. The provisional title is the first line of their first message,
 * trimmed to a readable length, so the list reads sensibly even when the title
 * job is slow or the worker is not running at all.
 */
export function provisionalChatTitle(text: string, maxLength = 48): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  if (cleaned.length <= maxLength) return cleaned;

  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${head.trimEnd()}…`;
}

/**
 * Clean a title the model wrote. Models answer with quotes, a "Title:" label,
 * markdown or a trailing full stop, and none of those belong in a sidebar row.
 * An empty result means there is no title to keep, so the caller leaves the
 * existing one alone.
 */
export function cleanGeneratedTitle(text: string, maxLength = 60): string {
  const cleaned = text
    .replace(/^title\s*:\s*/i, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[.:;!\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;

  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/** The title a model would have to replace for its own title to be kept. */
export function isReplaceableTitle(
  current: string | null | undefined,
  provisional: string | null | undefined,
): boolean {
  if (!current) return false;
  return current === "New Chat" || current === provisional;
}
