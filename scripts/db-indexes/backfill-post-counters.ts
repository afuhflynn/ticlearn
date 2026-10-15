import { prisma } from "@/lib/prisma";

const BATCH = 500;

async function main() {
  let cursor: string | undefined;
  let posts = 0;

  for (;;) {
    const rows: Array<{ id: string }> = await prisma.post.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const [likes, comments] = await Promise.all([
        prisma.postLike.count({ where: { postId: row.id } }),
        prisma.comment.count({ where: { postId: row.id } }),
      ]);
      await prisma.post.update({
        where: { id: row.id },
        data: { likeCount: likes, commentCount: comments },
      });
    }

    posts += rows.length;
    cursor = rows[rows.length - 1].id;
    console.log(`  Backfilled ${posts} posts...`);
    await new Promise((r) => setTimeout(r, 200));
    if (rows.length < BATCH) break;
  }

  // Notes search vector backfill, same batching.
  let noteCursor: string | undefined;
  let notes = 0;
  for (;;) {
    const rows: Array<{ id: string }> = await prisma.note.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(noteCursor ? { cursor: { id: noteCursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    await prisma.$executeRawUnsafe(
      `UPDATE "notes" SET "search_tsv" = to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("summary", '') || ' ' || coalesce("extracted_text", '')) WHERE "id" IN (${rows.map((_, i) => `$${i + 1}`).join(", ")})`,
      ...rows.map((r) => r.id),
    );
    notes += rows.length;
    noteCursor = rows[rows.length - 1].id;
    console.log(`  Backfilled ${notes} notes...`);
    await new Promise((r) => setTimeout(r, 200));
    if (rows.length < BATCH) break;
  }

  // Verify query: every post total matches a live count.
  const drift: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `SELECT p."id" FROM "posts" p WHERE p."like_count" != (SELECT COUNT(*) FROM "post_likes" l WHERE l."post_id" = p."id") OR p."comment_count" != (SELECT COUNT(*) FROM "comments" c WHERE c."post_id" = p."id") LIMIT 20`,
  );
  if (drift.length > 0) {
    console.error(`Drift found on ${drift.length} posts, sample: ${drift[0].id}`);
    process.exit(1);
  }

  console.log(`Backfill complete. ${posts} posts, ${notes} notes, no drift.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
