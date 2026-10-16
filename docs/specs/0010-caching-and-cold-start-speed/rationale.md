# 0010. Caching and cold start speed · decision record

## Context

TiCLearn runs on Vercel as serverless functions, with Postgres on Neon behind Prisma 7, and students on mid range Android phones on congested cells. Two facts shape everything here. First, a serverless instance is created fresh, so anything held in a module variable is lost on a scale to zero and is invisible to every other instance. Second, every byte a student downloads costs them money, and every second they wait on a metered connection is a reason to leave.

Today the only cache is `lib/ai/cache.ts:10`, a module level `Map` with no size limit and no eviction, and its keys expire lazily only when something reads them again. It is read only by the generate path in `lib/ai/orchestrator.ts`, never by streaming, so the chat route that carries the product's headline number gets no cache benefit at all. Nothing else in the app caches: no `unstable_cache`, no `revalidateTag`, no React `cache()`, no query memoisation. The chat route performs about ten sequential database and disk reads before it hands back a stream, and on a cold instance it also pays for module setup and a fresh database pool.

On the client, TanStack Query is installed and healthy at `providers/QueryProvider.tsx`, but the per query overrides are inconsistent: `hooks/useProfile.ts` and `hooks/useUserStats.ts` set `gcTime: 0`, which throws data away the moment a component unmounts, and `hooks/useUserSearch.ts:30` sets `staleTime: 0`. A student who navigates away and back refetches data that did not change, which costs their data and their patience.

The consequences of leaving this undecided are concrete. The published performance budgets stay unmeasurable, the chat keeps paying for reads it does not need, and the memory map grows until the function is recycled.

## Options considered

### Option 1: Postgres cache table behind a narrow module, with a bounded memory cache in front

One new table plus one module that owns `get`, `set`, and `withCache`, with a 200 entry memory cache in front of it and a scheduled job that prunes expired rows.

**Pros**:

- No new vendor, no new service, and no new environment variable, since the runtime switch is a settings row the app already has a pattern for. The database is already there, already backed up, already monitored.
- Surviving deploys and shared across instances, which is the actual problem, since today's map is neither.
- The store sits behind one narrow interface, so moving to Redis later is one file plus a dependency rather than a rewrite.
- A primary key lookup in a local table is a fraction of a millisecond, which leaves the published budgets comfortably reachable.

**Cons**:

- Every hit pays one database query, where an in memory store would not, and it draws on the same small connection pool the app uses.
- Requires operating a prune job and a row ceiling, which a store with native expiry would give for free.
- Adds write pressure to the primary database on every cache write.

### Option 2: Upstash Redis with native TTL

A hosted Redis with expiry built in, plus the same small memory cache in front.

**Pros**:

- Native TTL, so no cleanup job, no row ceiling, no expiry index to maintain.
- Atomic counters, so hit counts are exact rather than sampled.
- A real cross instance single flight through `SET NX`, where a memory map can only coordinate within one instance.

**Cons**:

- One more vendor, one more environment variable, one more service that can be down on the hot path.
- Per request cost on Upstash past the free tier, before we have measured the hit rate that would justify it.
- Buys latency we do not currently need, since the binding constraint was ten serial round trips, not the speed of the store.

### Option 3: Keep the cache in process, just bound it

Bound the existing `Map` at 200 entries with least recently used eviction and leave everything else alone.

**Pros**:

- Smallest possible change, no migration, no new module, no new failure mode.
- Removes the memory leak immediately, which is a real win on a long lived instance.

**Cons**:

- Does nothing about the actual problem, since a per instance map has a near zero hit rate on serverless and stays invisible to every other instance.
- Leaves the published budgets unreachable, because the cache cannot be the source of speed it was believed to be.

### Option 4: Next.js `use cache: remote` with a platform cache handler

Use the framework's own directive and let the platform supply a dedicated cache handler.

**Pros**:

- The documented framework path, so it stays supported as Next.js moves.
- Keeps cache concerns inside the framework rather than in our own module.

**Cons**:

- Requires enabling `cacheComponents`, which is a project wide switch touching every route, and cached functions may not read `cookies()` or `headers()`.
- The framework documents a network round trip per lookup plus platform fees, on exactly the latency paths this feature exists to protect.
- Ties the hot path to a framework behaviour we do not control, on a project that already carries documented drift between its notes and its code.

## Rationale

The binding constraint was never the speed of a store. It was ten serial round trips on the chat route and a cache that could not be shared. Option 1 fixes the sharing with a fraction of a millisecond primary key read, which the budgets have room for, and it does it with a database this project already runs, backs up, and monitors. Option 2 buys genuine operational wins, native expiry and a true cross instance single flight, but it buys them before we know the hit rate, and it puts a new dependency on the hot path on a project that prefers boring technology. Option 3 removes a leak without solving the problem. Option 4 asks us to flip a project wide framework switch and to accept a network round trip per lookup, to solve a problem that a table solves.

The decisive point is the interface. Because the store sits behind one narrow module, choosing Postgres today costs us the right to change our minds later, not the ability to. That is the cheap decision and the reversible one, which is the only kind worth making on a latency feature before there is data.
