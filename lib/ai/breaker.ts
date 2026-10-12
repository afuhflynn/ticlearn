import { prisma } from "@/lib/prisma";
import { COOLDOWN_MS, TRIP_THRESHOLD } from "./chain";

export type BreakerVerdict = { skipped: string[]; runnable: string[] };

const probeInFlight = new Set<string>();

function nowMs(): number {
  return Date.now();
}

export async function readHealth(): Promise<
  Map<string, { status: string; failCount: number; trippedAt: number | null }>
> {
  try {
    const rows = await prisma.aiModelHealth.findMany();
    const map = new Map<
      string,
      { status: string; failCount: number; trippedAt: number | null }
    >();
    for (const row of rows) {
      map.set(row.modelId, {
        status: row.status,
        failCount: row.failCount,
        trippedAt: row.trippedAt ? row.trippedAt.getTime() : null,
      });
    }
    return map;
  } catch (error) {
    console.warn("[chain] breaker read failed, trying head:", error);
    return new Map();
  }
}

export async function splitChain(chain: string[]): Promise<BreakerVerdict> {
  const health = await readHealth();
  const now = nowMs();
  const skipped: string[] = [];
  const runnable: string[] = [];
  for (const modelId of chain) {
    const state = health.get(modelId);
    if (!state || state.status !== "open" || state.trippedAt === null) {
      runnable.push(modelId);
      continue;
    }
    if (now - state.trippedAt >= COOLDOWN_MS && !probeInFlight.has(modelId)) {
      runnable.push(modelId);
      continue;
    }
    skipped.push(modelId);
  }
  return { skipped, runnable };
}

export function markProbeStart(modelId: string): boolean {
  if (probeInFlight.has(modelId)) return false;
  probeInFlight.add(modelId);
  return true;
}

export function markProbeDone(modelId: string): void {
  probeInFlight.delete(modelId);
}

export async function recordSuccess(modelId: string): Promise<void> {
  markProbeDone(modelId);
  try {
    await prisma.aiModelHealth.upsert({
      where: { modelId },
      update: { status: "healthy", failCount: 0, trippedAt: null },
      create: { modelId, status: "healthy", failCount: 0, trippedAt: null },
    });
  } catch (error) {
    console.warn("[chain] breaker success write failed:", error);
  }
}

export async function recordTransportFailure(modelId: string): Promise<void> {
  markProbeDone(modelId);
  try {
    const existing = await prisma.aiModelHealth.findUnique({
      where: { modelId },
    });
    const wasOpen = existing?.status === "open";
    const nextCount = (existing?.failCount ?? 0) + 1;
    const shouldOpen = wasOpen || nextCount >= TRIP_THRESHOLD;
    // A model already open stays open when its cool down probe fails; only its
    // trip time resets, so traffic is not flooded back at a broken model.
    const status = shouldOpen ? "open" : "healthy";
    await prisma.aiModelHealth.upsert({
      where: { modelId },
      update: {
        status,
        failCount: shouldOpen ? 0 : nextCount,
        trippedAt: shouldOpen ? new Date() : (existing?.trippedAt ?? null),
      },
      create: {
        modelId,
        status,
        failCount: shouldOpen ? 0 : nextCount,
        trippedAt: shouldOpen ? new Date() : null,
      },
    });
  } catch (error) {
    console.warn("[chain] breaker failure write failed:", error);
  }
}
