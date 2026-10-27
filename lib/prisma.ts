import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
  // The onboarding gate in `proxy.ts` bounds its own wait at 500ms, but a
  // losing race does not cancel the query. This bounds the query itself, so a
  // hung read cannot outlive the gate and hold a pool connection.
  statement_timeout: 5_000,
  // The pool is sized for the free Neon tier, not left to the library default.
  // `pg-pool` defaults to 10 per pool, and `proxy.ts` runs as its own
  // invocation, so it holds a second client and a second pool in the same
  // process. The default therefore allows 20 connections per instance with no
  // stated ceiling behind it, and serverless scales instances out.
  //
  // `max: 5` caps each pool at 5 connections per instance. `idleTimeoutMillis`
  // releases connections instead of holding them against a small quota while an
  // instance sits idle, and `connectionTimeoutMillis` means a request fails
  // rather than waiting indefinitely for a connection.
  //
  // Neon's free tier auto-suspends after inactivity; waking the compute can take
  // 10–30 seconds, so the connection timeout must be high enough to survive a
  // cold start. 5 seconds is not enough and causes
  // `prisma:error Connection terminated due to connection timeout` on the first
  // request after a suspend.
  //
  // Raise these when the database plan changes.
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 30_000,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
