/**
 * The bounded in process layer in front of the shared store, from spec 0010.
 *
 * It is a plain Map with least recently used eviction and a time to live. The
 * Map keeps insertion order, so reading a key by deleting and reinserting it
 * moves it to the end, and the first key in the map is always the least
 * recently used one. That is the whole mechanism, and it needs no dependency.
 *
 * The ceiling is hard. A long lived instance used to grow an unbounded map until
 * the function was recycled, so this one evicts instead of leaking.
 */

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
  /** The family the entry belongs to, so one can be purged on its own. */
  tag?: string;
}

export class LruCache {
  private entries = new Map<string, MemoryEntry>();

  constructor(private readonly maxEntries: number) {
    if (maxEntries < 1) {
      throw new Error("An LRU cache needs at least one entry.");
    }
  }

  get(key: string): unknown | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Touch: move to the end so it survives the next trim.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: unknown, ttlMs: number, tag?: string): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs, tag });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  /** Drop every entry carrying one tag, leaving the rest alone. */
  deleteByTag(tag: string): number {
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.tag === tag) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
