export interface WeakAreaEntry {
  concept: string;
  sourcePages: number[];
  retryId: string;
  isCorrect: boolean;
  updatedAt: string;
}

export function parseWeakAreas(metadata: unknown): WeakAreaEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  const list = (metadata as { weakAreas?: unknown }).weakAreas;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (entry): entry is WeakAreaEntry =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as WeakAreaEntry).concept === "string",
  );
}

export function mergeWeakArea(
  metadata: unknown,
  entry: WeakAreaEntry,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object"
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const current = parseWeakAreas(base);
  const next = current.filter((item) => item.concept !== entry.concept);
  next.push(entry);
  return { ...base, weakAreas: next };
}
