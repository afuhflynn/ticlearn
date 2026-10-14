import { prisma } from "@/lib/prisma";

export function topicNameSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Creates the canonical topics for a set of names and joins them to the note.
 * A topic is keyed on its normalized name so the same idea across two notes is
 * one topic, while mastery stays per note.
 */
export async function attachTopicsToNote(
  noteId: string,
  names: string[],
): Promise<string[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const topicIds: string[] = [];

  for (const name of unique) {
    const nameSlug = topicNameSlug(name);
    if (!nameSlug) continue;

    const topic = await prisma.topic.upsert({
      where: { nameSlug },
      update: {},
      create: { name, nameSlug },
      select: { id: true },
    });

    await prisma.topicNote.upsert({
      where: { topicId_noteId: { topicId: topic.id, noteId } },
      update: {},
      create: { topicId: topic.id, noteId },
    });

    topicIds.push(topic.id);
  }

  return topicIds;
}

/**
 * Removes the canonical topic rows that nothing links to any more, which is
 * what deleting the last note that mentioned a topic leaves behind. A topic
 * another note still uses is left alone.
 */
export async function pruneOrphanTopics(topicIds: string[]): Promise<number> {
  if (topicIds.length === 0) return 0;

  const { count } = await prisma.topic.deleteMany({
    where: { id: { in: topicIds }, notes: { none: {} } },
  });

  return count;
}
