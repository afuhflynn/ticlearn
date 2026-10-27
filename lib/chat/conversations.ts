/**
 * Conversation list shaping shared by the sidebar and the search modal, so
 * both surfaces read conversations under the same labels in the same order.
 * Date grouping has this shape because it moved out of `chat-sidebar.tsx`
 * when the sidebar filter became the search modal.
 */

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const groupLabels = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Older",
] as const;

function formatGroupLabel(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 30) return "This Month";
  return "Older";
}

export function groupConversationsByRecency(
  conversations: ConversationSummary[],
): Array<{ label: string; conversations: ConversationSummary[] }> {
  const groups: Record<string, ConversationSummary[]> = {};
  for (const conversation of conversations) {
    const label = formatGroupLabel(
      new Date(conversation.updatedAt || conversation.createdAt),
    );
    groups[label] = groups[label] ?? [];
    groups[label].push(conversation);
  }
  return groupLabels
    .filter((label) => groups[label])
    .map((label) => ({ label, conversations: groups[label] }));
}
