/**
 * The Postgres pool bounds (spec 0012, AC-15).
 *
 * The gate in `proxy.ts` bounds its own wait at 500 ms, but a losing race does
 * not cancel the query, so the query itself is bounded here. The pool is sized
 * for the free tier instead of inheriting the library default of ten per pool.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

const poolConfigs = vi.hoisted(() => [] as Array<Record<string, unknown>>);

// The shared setup file mocks `@/lib/prisma` for every test file, because the
// rest of the suite never wants a real client. This file is the one place
// that needs the real module, so the mock is lifted here.
vi.unmock("@/lib/prisma");

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(config: Record<string, unknown>) {
      poolConfigs.push(config);
    }
  },
}));

vi.mock("@/lib/generated/prisma/client", () => ({
  PrismaClient: class {
    constructor(public options: unknown) {}
  },
}));

describe("the Postgres pool bounds (spec 0012 AC-15)", () => {
  beforeAll(async () => {
    // The client is memoised on globalThis, so a client left behind by another
    // test would skip the adapter and hide the config this file checks.
    delete (globalThis as { prisma?: unknown }).prisma;
    await import("@/lib/prisma");
  });

  it("caps each pool at five connections", () => {
    expect(poolConfigs[0]?.max).toBe(5);
  });

  it("releases an idle connection after ten seconds", () => {
    expect(poolConfigs[0]?.idleTimeoutMillis).toBe(10_000);
  });

  it("gives up on a connection after five seconds instead of waiting forever", () => {
    expect(poolConfigs[0]?.connectionTimeoutMillis).toBe(5_000);
  });

  it("bounds the query itself, so a hung read cannot outlive the gate", () => {
    expect(poolConfigs[0]?.statement_timeout).toBe(5_000);
  });

  it("hands the adapter a connection string", () => {
    expect(typeof poolConfigs[0]?.connectionString).toBe("string");
    expect(poolConfigs[0]?.connectionString).not.toBe("");
  });
});
