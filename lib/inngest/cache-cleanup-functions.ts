import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

/**
 * Keeps the shared cache table flat, from spec 0010.
 *
 * Two things have to happen. Rows past their expiry are deleted, and the table
 * is trimmed down to its row ceiling by oldest creation, so a namespace with a
 * long time to live cannot grow without bound. Both run in batches, because a
 * single statement that deletes a large slice holds locks and slows everything
 * else sharing the database.
 */

/** Rows touched per statement, so no single delete locks the table for long. */
const BATCH_SIZE = 500;

/** How often the sweep runs. */
const CRON = "0 3 * * *";

/** Search rows are student authored content, so they do not live forever. */
const WEB_SEARCH_RETENTION_DAYS = 90;

async function deleteExpired(): Promise<number> {
  let removed = 0;
  for (;;) {
    const expired = await prisma.appCache.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { key: true },
      take: BATCH_SIZE,
    });
    if (expired.length === 0) break;
    await prisma.appCache.deleteMany({
      where: { key: { in: expired.map((row) => row.key) } },
    });
    removed += expired.length;
    if (expired.length < BATCH_SIZE) break;
  }
  return removed;
}

async function trimToCeiling(ceiling: number): Promise<number> {
  let removed = 0;
  for (;;) {
    const overflow = await prisma.appCache.count();
    if (overflow <= ceiling) break;

    // Oldest first, and never a live row, so a hot key is not deleted while it
    // is still being served.
    const oldest = await prisma.appCache.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: { key: true },
      take: Math.min(BATCH_SIZE, overflow - ceiling),
    });
    if (oldest.length === 0) break;
    await prisma.appCache.deleteMany({
      where: { key: { in: oldest.map((row) => row.key) } },
    });
    removed += oldest.length;
  }
  return removed;
}

/**
 * Search events are student authored content, so they expire. Rows are deleted
 * in batches for the same reason the cache is: one big delete holds locks.
 */
async function deleteOldWebSearchEvents(): Promise<number> {
  const cutoff = new Date(
    Date.now() - WEB_SEARCH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  let removed = 0;
  for (;;) {
    const old = await prisma.webSearchEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (old.length === 0) break;
    await prisma.webSearchEvent.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    removed += old.length;
    if (old.length < BATCH_SIZE) break;
  }
  return removed;
}

export const pruneAppCache = inngest.createFunction(
  {
    name: "Prune App Cache",
    id: "prune-app-cache",
    triggers: { cron: CRON },
  },
  async () => {
    const ceiling = Number(process.env.CACHE_MAX_ROWS ?? 50_000);
    const expired = await deleteExpired();
    const trimmed = await trimToCeiling(ceiling);
    const searchEvents = await deleteOldWebSearchEvents();
    console.log(
      `[cache] pruned ${expired} expired, ${trimmed} over ceiling ${ceiling}, and ${searchEvents} web search events past ${WEB_SEARCH_RETENTION_DAYS} days`,
    );
    return { expired, trimmed, ceiling, searchEvents };
  },
);
