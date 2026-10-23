# 0010. Caching and cold start speed

**Date**: 2026-10-22
**Status**: In Progress

## Summary

Chat and every student screen pay for round trips they never needed, and the one cache that exists is a memory map that dies with each server instance, so it almost never helps. This spec fixes the chat path and the client data habits first, then adds one small shared cache table in the database with a bounded memory cache in front of it. It now also puts three slow read paths behind that cache: platform settings, the public payment details, and a student's readiness, the last one scoped to that student. The result is a chat that answers within the budget we published, a page switch that costs nothing when nothing changed, and an admin save that reaches students at once instead of waiting for a timer.
## Requirements

**User stories**:

- As a student, I want a new chat to start streaming almost immediately so that I am not staring at a blank screen on a slow cell.
- As a student, I want the app to reuse work it has already done, so a repeated request is fast and cheap.
- As a student, I want switching screens to be instant when nothing changed, so I do not spend my data on data I already have.
- As a student, I want my credits and notes to always be current when I look at them, so stale data never costs me money.
- As an admin, I want to clear the cache the moment I change something, so students see the change without waiting for a timer.
- As a student, I want my readiness number and the platform rules to be fast to read, without ever seeing another student's data.
- As an admin, I want a settings change to reach students immediately, so an old credit rule cannot remain active for the cache lifetime.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Every task name any route passes to the orchestrator is registered in `lib/ai/registry.ts`, so no chat request fails on an unknown task. Today `app/api/ai/chat/route.ts:339` asks for `reasoning`, which is not registered, and `getTaskConfig` throws.
- **AC-2**: On a warm instance, a new chat request returns its first streamed byte within 900 ms at p75 and 1.5 s at p95. The population is every `POST /api/ai/chat` request that created a new conversation, measured over a rolling 24 hours in production, and it includes the readiness read and the prompt read because those stay before the stream.
- **AC-3**: Only work the response cannot do without happens before the stream. The user turn is still written and the credit still debited before the first byte, since losing a message on a closed tab is worse than a slow one. Title generation stays in its background job, and duplicate detection, the stats write, and the KPI event move after the first byte.
- **AC-4**: The chat stream writes a comment frame into the response body the moment the headers are sent, before the stream is handed back, so no connection sits silent through a slow prefill.
- **AC-5**: The parsed prompt file behind the chat system prompt is memoised once per prompt name and version, so no request pays a disk read, and only the slot substitution varies per request.
- **AC-6**: A value written to the cache by one request is readable by a later request served by a different instance, proven by a test that clears the local memory layer and reads through the shared store.
- **AC-7**: Concurrent misses for the same key inside one instance produce exactly one call to the underlying source. A stampede across instances is accepted and recorded as a known limit.
- **AC-8**: When the cache store is slow, times out, or fails, the request still completes normally and the failure is logged. No student visible error, and a pool exhaustion is treated as a miss rather than an error.
- **AC-9**: The in process cache is bounded at 200 entries as a hard ceiling, evicts least recently used first, and never exceeds that bound, including after a long running instance has served thousands of requests.
- **AC-10**: An expired entry is never returned, and the table holds below its row ceiling at steady state, enforced both by the scheduled job and by a probabilistic trim inside `set`.
- **AC-11**: No shared AI generation cache key or value contains a user id, a note id, a profile field, or prompt text. AI keys are sha256 hashes of the namespace, the resolved model chain, the prompt, the call parameters, and a key version. Read caches use the separate scoped key rule in **AC-24**.
- **AC-12**: Only output that passed the schema validator is written to the cache, and a value larger than 256 KB is not cached at all.
- **AC-13**: A generation served from cache still counts against the caller's quota and spends no credit, because no model call was made. The orchestrator result carries a `fromCache` flag so the calling path can tell.
- **AC-14**: Navigating back to a screen the student already saw paints the previous data immediately and refreshes in the background, with no loader and no blank state.
- **AC-15**: A paginated list or a search result keeps the previous page on screen while the next one loads.
- **AC-16**: Credits, usage, notifications, chat, and search are always fresh when a screen mounts, and no family expresses that with an inline `staleTime: 0`.
- **AC-17**: Profile, plan, subscription, payment settings, leaderboard, admin, affiliate, feedback, and rating reads do not refetch on navigation inside their stale time.
- **AC-18**: Every query family takes its stale time and its keep time from one `lib/query-families.ts`, and no hook sets either value inline.
- **AC-19**: The dashboard prefetches its data on the server with `prefetchQuery` and hydrates it into the query cache with a `HydrationBoundary`, so its first paint shows real content with no client round trip. That surface is the pattern later screens copy, and its layout work belongs to scope rows 34 and 35.
- **AC-20**: The chat request carries at most 64 KB measured as the byte length of the trimmed body, keeps at most 8000 characters per part, trims from the last user turn, drops tool call and tool result parts whose pair is broken, and the route enforces all of it rather than trusting the client.
- **AC-21**: An admin can purge one namespace from the shared store through an authenticated route, and a non admin cannot. The purge clears the store and the calling instance's memory layer, so an entry can survive on another instance for at most the memory time to live.
- **AC-22**: Chat first byte milliseconds, cache hits, cache misses, cache namespace, keep alive sent, and cold start counts are all recorded server side in the usage log, with a named source for the percentile, so a budget breach is visible rather than assumed. Hit rate comes from logged hits and misses, not from a counter column.
- **AC-23**: Platform settings, the public payment details, and a student's readiness are read through one typed wrapper in `lib/cache`, driven by a namespace registry that owns each value's scope, time to live, and key inputs. The wrapper accepts a registered namespace name, never a free text tag or a caller supplied time to live. No route or data function uses Next.js `unstable_cache`, `use cache`, or a second cache substrate.
- **AC-24**: Each registered namespace declares whether its value is global or personal. A personal key takes the authenticated user id as a hash input, so the stored key is a one way hash and never contains the id itself. A global key takes only the values that change the response, and the key is recomputable from the namespace and the scope alone, so one student's entry can be deleted without touching another's. No value can be produced under a key that omits an input the source read depends on.
- **AC-25**: A cache hit returns the same JSON as a miss and the route's existing session or admin check runs before the cache is read, so status codes, response shape, and ownership rules do not change.
- **AC-26**: The cache switch is read through a direct Prisma helper that never passes through the cache module's own read path, and the public settings accessor is served from the cache. A settings read can therefore never trigger a recursive cache lookup, and a failed switch read leaves the last known answer in place rather than disabling a healthy request.
- **AC-27**: Four writes invalidate after their last database write and before they return success: the admin platform settings save, the admin payment settings save, `POST /api/performance` after its clamp update, and a note delete after the note row is removed. Invalidation removes the shared rows and the calling instance's memory entries. No other path invalidates, because no other path changes these values today.
- **AC-28**: Readiness is invalidated for the one student whose inputs changed, so one student practising does not clear every student's entry. The settings and payment values are global, so their invalidation clears the whole namespace.
- **AC-29**: An expired entry is never returned, and every store failure, read timeout, or invalidation failure is logged with the namespace and the operation. The source read or the source mutation still completes, so cache availability never decides whether a student or an admin can work.
- **AC-30**: Verification proves the read cache with two reads that share one entry after `clearMemory()`, a mutation followed by a read before the time to live expires, two students whose readiness values never cross, an expired entry that is computed again, and a failing store that still serves the read.
## Decision

**Chosen option**: Option 1: Postgres cache table behind a narrow module, with a bounded memory cache in front

The shared cache lives in one `app_cache` table in the existing Postgres database, reached through a single `lib/cache/` module that owns all reads and writes, with a 200 entry bounded memory cache in front of it and a scheduled job that removes expired rows. No new vendor. AI generation and the three read values share that table and that memory layer but not a key builder: generation keys are hashed from a prompt and a model chain, read keys are hashed from a namespace and a scope and carry a `read:` prefix, so one kind can never be read, purged, or mistaken for the other. Redis stays a recorded follow up with the trigger conditions named in the follow up list.
## Feature design

**Data model sketch**:

Two migrations. The first adds the cache table, the second adds the columns the measurements need.

New table `app_cache`. No foreign keys, nothing joins to it, it is written by the cache module and by nothing else.

| Column | Type | Notes |
|---|---|---|
| `key` | text, primary key | sha256 hex. For a generation it hashes the namespace, the resolved model chain, the prompt, the call parameters, and a key version. For a read it hashes the `read:` namespace, the scope, and a key version. Never readable, and never contains a prompt, a stored id, or a user id |
| `namespace` | text, not null | the family the entry belongs to, such as `quiz_gen` or `read:readiness`. Indexed, and hashed into the key rather than read out of it |
| `value` | jsonb | the schema validated payload |
| `expires_at` | timestamptz, not null | written at set time from the task TTL |
| `created_at` | timestamptz, default now() | for debugging and for the trim order |

Index `app_cache_expires_at_idx` on `expires_at`, used by the cleanup job only. Index `app_cache_namespace_idx` on `namespace`, used by the purge route only. The row ceiling is held at steady state by two paths: the cleanup job deletes rows past `expires_at` in batches, then trims to the ceiling by oldest `created_at` in batches, and `set` also runs a cheap probabilistic trim so a busy hour cannot outrun the job.

Second migration, on the existing usage table. `lib/ai/usage.ts` has no column for the numbers this feature must report, so add `first_byte_ms`, `cache_hit`, `cache_namespace`, and `keep_alive_sent`. Cold start counts come from the existing request log rather than a new table.

The target for the client is not a table, it is a convention: the defaults in `providers/QueryProvider.tsx` plus one `lib/query-families.ts` that holds every stale time and keep time, listed under Key invariants.

**State transitions** (a cache entry):

absent → stored (a miss completes and writes through) → hit (served, and logged as a hit) → expired (never returned, later deleted in batches). In parallel the memory layer evicts by least recently use once it reaches 200 entries. An entry may also be dropped early by an admin purge, which moves it straight back to absent on the store and on the calling instance.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/ai/chat` | POST | existing fields, trimmed to the byte ceiling | stream, with a keep alive frame written when the headers are sent | session cookie | 400 over the ceiling, 401, 500 |
| `/api/admin/cache/purge` | POST | `namespace: string` | 204 empty | admin role, plus the live rate limit every admin route carries | 400, 401, 403, 429 |
| `/api/payment-settings` | GET | none | the same four payment fields, read through the cache | none, it is public | 500 becomes a source read, never a cache error |
| `/api/readiness` | GET | none | the same readiness payload, read through the cache for this student | session cookie | 401, 500 |
| `/api/performance` | POST | the existing payload | the existing response, then a readiness invalidation for this student | session cookie | 400, 401, 422, 500 |
| `/api/admin/platform-settings` | PUT | the existing settings fields | the existing response, then a settings invalidation | admin role | 400, 403 |

No route changes its shape, its status codes, or its ownership rules. The four existing routes above gain a cache read or an invalidation call and nothing else.

**Read cache contract**:

| Namespace | Source read | Where the cache call lives | Key scope | Time to live | Invalidation sources |
|---|---|---|---|---|---|
| `read:platform-settings` | `getPlatformSettings()` in `lib/platform-settings.ts` | inside the accessor, so all eight call sites share it | global | 60 seconds | the admin platform settings save (`PUT /api/admin/platform-settings`) |
| `read:payment-settings` | the `paymentSettings` row read in `app/api/payment-settings/route.ts` | inside that route, which is public and does no session check | global | 60 seconds | the admin payment settings save (`PUT /api/admin/payment-settings`) |
| `read:readiness` | `getDashboardReadiness(userId)` in `lib/dashboard-data.ts` | inside that function, so `/api/readiness` and the dashboard prefetch share one entry | personal, keyed by the authenticated user id | 60 seconds | `POST /api/performance` for that student, and a delete of one of that student's notes |

Two values are deliberately not in this contract. Catalog is out because there is no database catalog any more: `/api/levels` returns static constants from `constants/levels.ts`, does no input or database work, and no code calls it, so a cache would add a lookup to save nothing. Leaderboard is out because the pivot review may remove the surface, and caching a page that is about to be deleted is work spent twice. The condition that would bring each one back is recorded in Follow-up.

The registry lives in `lib/cache/reads.ts` beside the existing store. It exports one wrapper, `withReadCache(namespace, scope, produce)`, where `scope` is either `{ kind: "global" }` or `{ kind: "user", userId }`. It also exports the key builder `readKey(namespace, scope)`, because invalidation and the tests must be able to reproduce a key exactly.

The key is sha256 over one canonical JSON array: the key version, the `read:` prefixed namespace, and `null` for a global value or the user id for a personal one. Nothing else goes in, so a key can be recomputed from the namespace and the scope alone. `invalidateRead(namespace, scope?)` recomputes that key and deletes the one store row and the one memory entry; `invalidateReadNamespace(namespace)` deletes every store row by namespace and every memory entry by tag, and is used only for the two global values. Readiness therefore uses the targeted form and can never clear another student's entry.

The wrapper reuses the store and the memory layer through the same internal read and write the AI path uses, so single flight, the size ceiling, the read timeout, and the fail open behaviour all apply unchanged. It returns the payload alone, never the `fromCache` flag, so a caller's return type does not change. The namespace registry owns the time to live, the scope kind, and the invalidation name, so a caller cannot invent a tag or pick a longer life. The cached value is the final JSON payload, never a Prisma row: payment details are cached as the four fields the route returns, including the all null shape for a database with no row, and readiness is cached as the object `getDashboardReadiness` already returns after its date free conversion.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Chat first byte timing | milliseconds from request start to first delta | `Date.now()` around the `streamChat` call in `app/api/ai/chat/route.ts`, written to the new `first_byte_ms` column through the existing `logUsage` helper |
| Chat daily quota check | whether the student has asks left today | the existing count in `app/api/ai/chat/route.ts` using the window from `lib/chat-usage.ts` |
| Cache hit on a generation | whether a credit was spent | the `fromCache` flag the orchestrator now returns, read by the credit debit in `lib/inngest/functions.ts:251` and by `app/api/quizzes/generate/route.ts`, so a hit skips the spend |
| Cached generation value | the quiz or summary text | the schema validated output of the model call, produced by the orchestrator |
| Cache key | the lookup key | sha256 of the namespace, the chain returned by `resolveChain`, the prompt, the call parameters, and a key version. The chain is resolved first because an environment override can change which model answers |
| TTL per entry | when the entry expires | the existing `cacheTtlMs` on the task in `lib/ai/registry.ts` |
| Memory layer time to live | how long an entry survives locally | 5 minutes for generation values, shorter than the store TTL, so a purge is complete on the store and near complete everywhere |
| Hit rate and cold start counts | the numbers that prove the budget | the new `cache_hit`, `cache_namespace`, and `keep_alive_sent` columns plus the existing request log, reported from the same place usage is already reported |
| Percentile of the first byte | p75 and p95 over the rolling window | a query over `first_byte_ms` filtered to new conversation posts, named in the build plan so the number has one home |
| Per family client stale time | how long a family may sit | the single table under Key invariants, read from `lib/query-families.ts` |
| Prefetched first paint data | the content a screen paints | the same server data functions the screen's API already reads, called during the server render and hydrated into the query cache |
| Read cache key | the lookup key for a cached read | sha256 over `[key version, "read:" + namespace, scope]`, where scope is `null` for a global value or the authenticated user id for a personal one, built only by `readKey` |
| Read cache lifetime | when a cached read expires | the namespace registry in `lib/cache/reads.ts`, never an argument at the call site |
| Read cache scope | whether a value may be served to another student | the namespace registry: `global` for settings and payment details, `user` for readiness |
| Which entries a mutation clears | the invalidation target | `invalidateRead(namespace, { kind: "user", userId })` for readiness, using the user id from the mutation's own authenticated session, or `invalidateReadNamespace(namespace)` for the two global values |
| Whether the cache runs at all | on or off for this operation | `readPlatformSettings()`, a direct Prisma read that never passes through the cache module |
| Readiness inputs | the score, the weakest topic, and the recommendation lines | `TopicPerformance` rows joined to the student's notes, read by `computeReadiness`, plus the recent practice count in `getDashboardReadiness` |
| Payment details | the four mobile money fields shown to a payer | the `paymentSettings` row with key `global` |

**Key invariants**:

- The cache is never on the critical path for correctness. A cache failure degrades to a slower answer, never a failed request, and a pool exhaustion counts as a miss.
- A cache entry is readable only by reproducing its exact input. A generation entry is built from the prompt and never from who asked. A read entry names its scope in the key, and a personal read names the student.
- Streaming chat is never cached, at any TTL. Grading and evaluation tasks keep `cacheTtlMs: 0`.
- Only schema validated output is stored, and nothing over 256 KB.
- The in process layer never exceeds 200 entries, which is a hard ceiling that a variable may only lower.
- The shared cache is switched off by a platform settings row, not by an environment variable, because an environment change on Vercel still needs a redeploy to reach a running function.
- A read key carries the smallest scope that makes the response safe. Global values never take a user id. A personal value takes the user id as a hash input, so the stored key is a one way hash and two students can never reproduce each other's key.
- The cache module imports the direct settings reader and never the cached accessor, so the switch check cannot recurse into the cache it is deciding about.
- A mutation invalidates after its database write and before it returns success. If invalidation fails, the mutation still succeeds and the event is logged with the namespace, while the time to live remains the safety bound.
- Only these four writes invalidate anything: the platform settings save, the payment settings save, `POST /api/performance`, and a note delete. A write path that changes none of the three cached values must not call the cache, so the invalidation list stays short enough to verify.
- Readiness belongs to one student, so its invalidation names that student and never the whole namespace.
- A value that changes with the clock, such as a recency weighted readiness score, never puts a timestamp in its key, because every entry would then be cold. Its time to live is what bounds how old the answer may be, and that is stated rather than assumed.
- A read entry's memory life never exceeds its registered store life, so an invalidation missed by another instance cannot outlive the entry it was meant to clear.
- The wrapper returns the payload, never the hit flag, so every call site keeps its current return type and no route can branch on whether a value was cached.
- Next.js framework cache directives remain disabled for this feature. `lib/cache` is the only server cache substrate, consistent with spec 0012.
- The `read:` prefix keeps read keys and AI generation keys apart, because they share one table and one purge route.
- The key version is bumped whenever any part of the key composition changes, since a silent change leaves every entry cold for the whole TTL.
- Client families, with every value taken from `lib/query-families.ts` and never written inline:

| Family | Stale time | On mount | Notes |
|---|---|---|---|
| profile, plan, subscription, payment settings, leaderboard, admin, affiliate, feedback, rating | 5 minutes to hours | serve cached, revalidate in the background | changes on a semester, an admin action, or a nightly rollup |
| credits, usage, notifications, chat, search | fresh on every mount, from the one module | always fresh | stale money or quota reads cost trust |
| notes, quizzes, community lists | 60 seconds | serve cached, revalidate in the background | invalidated by the mutation that wrote them, and the polling in `useNotes` and `useQuizzes` is reconciled with this |
| paginated lists and search results | 60 seconds | keep the previous page while the next loads | no blank state on a page switch |

**Security model**:

The shared cache table holds hashed keys, validated AI output, and three read values. The AI half contains no user ids, note ids, prompt text, or profile fields. The read half holds platform settings and the public payment details, which are not personal, and a readiness payload, which is personal. That personal entry is reachable only by reproducing a key whose inputs include the student id, so a second student cannot read it by guessing a page or a query string, and a dump of the table shows a hash rather than an id. A route reads the session, or performs its admin check, before it reads the cache, so the cache never becomes an authorization shortcut. The purge route is admin only, uses the same guard every other admin route uses, is a POST rather than a GET so it cannot be triggered by a link, carries the same live rate limit other admin routes carry, and logs the actor and the namespace it cleared. No regulated data is in scope here, so no additional compliance obligations are introduced.

**Configuration required**:

- A platform settings row for the shared cache switch. When false, the store reads and writes nothing and the app behaves as it does today. This is the rollback path, and a settings row is used because an environment change on Vercel still needs a redeploy to reach a running function.
- `CACHE_MAX_ROWS`: the row ceiling, default 50000, enforced at steady state by the job and by the probabilistic trim inside `set`.
- `CACHE_MEMORY_MAX_ENTRIES`: may only lower the hard ceiling of 200 on the in process layer, default 200.
- `CACHE_MEMORY_TTL_MS`: the in process time to live, 5 minutes for generation values, and never longer than a read entry's own registered life, so a purge is complete on the store and near complete everywhere.
- `CACHE_READ_TIMEOUT_MS`: a short timeout on store reads, default 400, so a cache read never waits on a saturated connection pool.

**Critical test scenarios** (each maps to an acceptance criterion in Requirements):

- Happy path: a student sends a message and the first byte arrives within budget with the keep alive frame already written, verifies **AC-2**, **AC-3**, **AC-4**
- Cache reuse: the same generation is requested twice and the second is served from the store, spending no credit, verifies **AC-13**, **AC-6**
- Concurrency: twenty identical requests arrive at once on a cold key inside one instance and only one reaches the model, verifies **AC-7**
- Store failure: the cache throws and the request still answers, with the error logged, verifies **AC-8**
- Memory bound: thousands of distinct keys pass through one instance and the memory layer stays at 200, verifies **AC-9**
- Entry safety: no key or value written during a full generation cycle contains a user id, a note id, or prompt text, verifies **AC-11**, **AC-12**
- Permission: a student calls the purge route and is refused, an admin calls it and the namespace is cleared from the store, verifies **AC-21**
- Client: a student navigates away and back and sees cached data with no loader, then a fresh value after the mutation that changed it, verifies **AC-14**, **AC-16**
- Family values: no hook in the app sets a stale time or a keep time inline, verifies **AC-18**
- Read reuse: two settings reads, two payment detail reads, and two readiness reads for the same student reuse the shared value after the local memory layer is cleared, verifies **AC-23**, **AC-24**, **AC-30**
- Settings freshness: save platform settings from the admin screen, then read them from a student path before the 60 second life expires, verifies **AC-27**, **AC-29**
- Readiness freshness: submit one performance write for one student, then read that student's readiness before the life expires, verifies **AC-27**, **AC-28**
- Scope isolation: two students read readiness at the same moment and neither receives the other's value, verifies **AC-24**, **AC-30**
- Expiry: an entry past its life is not returned and the source read runs again, verifies **AC-29**, **AC-30**
- Cache failure: make the shared store fail during a read and during an invalidation, and confirm the source read or mutation still completes with a namespace log, verifies **AC-29**
## Build plan

Ordered as five tracer bullet slices, and deliberately ordered so the felt win lands before the infrastructure it does not need. The chat path and the client convention deliver most of what a student notices and require no new read cache contract, so they come first. The shared table then lands on a path that is already fast, which means its hit rate can be measured before the read paths depend on it. Each slice runs through its own layers and works before the next begins.

**Slice one, the chat critical path** (the number students feel, with no schema change)

- [x] Register the task the chat route asks for, or point the route at a registered task, so no chat request throws, satisfies **AC-1**
- [x] Memoise the parsed prompt file per name and version in the prompt loader, so no request pays a disk read, satisfies **AC-5**. This builds on spec 0002 for the prompt registry and spec 0003 for the task registry
- [x] Collapse the sequential reads before the stream into one combined read, keep the user turn write and the credit debit before the first byte, and move duplicate detection, the stats write, and the KPI event after it, satisfies **AC-3**
- [x] Write the keep alive comment frame into the response body the moment the headers are sent, satisfies **AC-4**
- [x] Trim the request to the byte ceiling, keeping 8000 characters per part, trimming from the last user turn, and dropping orphaned tool call and tool result parts, satisfies **AC-20**
- [x] Add the migration that gives the usage table `first_byte_ms`, `cache_hit`, `cache_namespace`, and `keep_alive_sent`, and record the timing around the `streamChat` call, satisfies **AC-2**, **AC-22**
- [x] Name the single home for the percentile, a query over `first_byte_ms` filtered to new conversation posts over a rolling 24 hours, satisfies **AC-2**, **AC-22**

**Slice two, the client cache convention** (no schema change)

- [x] Build `lib/query-families.ts` holding every stale time and keep time in the app, and have `providers/QueryProvider.tsx` read its defaults from it, satisfies **AC-16**, **AC-17**, **AC-18**
- [x] Remove every inline `gcTime: 0` and `staleTime: 0` from the hooks, including `useProfile.ts`, `useUserStats.ts`, `useQuizzes.ts`, `usePayment.ts`, `useUserSearch.ts`, and `useAdmin.ts`, and reconcile the three second polling in `useNotes` and `useQuizzes` with the family values, satisfies **AC-18**
- [x] Serve the family table so long lived families hold cached data across navigation and credits, usage, notifications, chat, and search are fresh on mount, satisfies **AC-16**, **AC-17**
- [x] Keep the previous page or result list on screen while the next one loads, satisfies **AC-15**
- [x] Invalidate the keys a mutation touches, aligned to the server tags so one event clears both, satisfies **AC-14**
- [x] Prefetch the dashboard on the server with `prefetchQuery` and hydrate it with a `HydrationBoundary`, as the pattern later screens copy, satisfies **AC-19**

**Slice three, the shared cache substrate end to end** (now it earns its place)

- [x] Add the migration for `app_cache` with the `expires_at` index and the `namespace` index, satisfies **AC-6**, **AC-10**
- [x] Build `lib/cache/` with `get`, `set`, and `withCache` over the table, keys hashed with sha256 from the namespace, the resolved chain, the prompt, the parameters, and a key version for shared AI values, and carrying no user data in that shared path, satisfies **AC-6**, **AC-11**
- [x] Add the bounded memory layer with 200 entries as a hard ceiling, least recently used eviction, a 5 minute time to live, and in process single flight per key, satisfies **AC-9**, **AC-7**
- [x] Make every store failure fail open with a log and no user visible error, with a short read timeout so a saturated pool counts as a miss, satisfies **AC-8**
- [x] Add the prune job, `lib/inngest/cache-cleanup-functions.ts` exporting `pruneAppCache`, registered in the Inngest serve route, deleting expired rows in batches and trimming to the ceiling by oldest `created_at` in batches, satisfies **AC-10**
- [x] Add the probabilistic trim inside `set` so a busy hour cannot outrun the job, satisfies **AC-10**
- [x] Add the platform settings row for the switch and the four tuning variables, satisfies **AC-8**
- [x] Replace `lib/ai/cache.ts` with the new module behind the same call sites, and update the tests that import `clearCache`, satisfies **AC-6**

**Slice four, the AI cache done properly**

- [x] Resolve the chain before building the key, take the TTL from the existing registry entry, and bump the key version whenever the key composition changes, satisfies **AC-6**
- [x] Write only output that passed the schema validator, and skip any value over 256 KB, satisfies **AC-12**
- [x] Add a `fromCache` flag to the orchestrator result and thread it to the credit debit in `lib/inngest/functions.ts` and in the quiz generation route, so a hit skips the spend while the quota count still runs, satisfies **AC-13**
- [x] Record cache hit, miss, and namespace on the usage log, so the hit rate comes from logged events rather than a counter column, satisfies **AC-22**
- [x] Add the admin only purge route for a namespace, behind the admin guard, the admin rate limit, and a log of the actor and the namespace, satisfies **AC-21**
- [x] Record cold start counts from the existing request log rather than a new table, satisfies **AC-22**

**Slice five, data route caching with revalidation**

- [x] Add `lib/cache/reads.ts` with the typed namespace registry and `withReadCache(namespace, scope, produce)`, a global scope and a user scope, `read:` prefixed keys, and a targeted invalidation for one user, built on the existing internal read, write, single flight, size ceiling, and timeout so no behaviour is duplicated, satisfies **AC-23**, **AC-24**, **AC-29**
- [x] Prove the wrapper end to end on the smallest safe consumer first: serve the public payment details read at 60 seconds, since the value is not personal and a stale second costs nothing, satisfies **AC-25**, **AC-30**
- [x] Split the direct Prisma read out of `lib/platform-settings.ts` into `lib/platform-settings-direct.ts`, point the cache switch at it so no recursive lookup is possible, and serve `getPlatformSettings()` through the wrapper at 60 seconds, satisfies **AC-26**, **AC-24**
- [x] Serve `getDashboardReadiness(userId)` through the wrapper at 60 seconds with the user scope, so `/api/readiness` and the dashboard prefetch share one entry, satisfies **AC-24**, **AC-25**
- [x] Invalidate from the four writes that can change a cached value: the platform settings save, the payment settings save, `POST /api/performance` for that student, and a note delete for that student, satisfies **AC-27**, **AC-28**
- [x] Keep every cache read and every invalidation fail open with a namespace log, and leave each source response and status code exactly as it is today, satisfies **AC-29**
- [x] Add `tests/lib/cache/reads.test.ts` covering reuse after `clearMemory`, mutation freshness, two student isolation, expiry with `vi.useFakeTimers()` rather than a shortened life at the call site, and a failing store, and move the settings mock in `tests/lib/cache/store.test.ts` to `@/lib/platform-settings-direct` while any test that mocks `getPlatformSettings` keeps working under the same name, satisfies **AC-30**. Export the registry table so the test can read a namespace's life instead of copying it
## Migration plan

**Strategy**: strangler with a runtime switch. The chat path and the client convention ship first with no schema change. The old `lib/ai/cache.ts` is then replaced by the new module behind the same call sites, and the platform settings switch makes that replacement reversible at runtime rather than by a redeploy. Each slice ships and works on its own, following the project's tracer bullet approach.

**Phases**:

1. Slice one, the chat critical path, no migration beyond the usage columns. The unregistered task name is fixed first, because nothing downstream is testable until it is. The prompt is memoised, the pre stream reads are collapsed, the trailing work moves after the first byte, the keep alive frame is added, and the payload is capped.
2. Slice two, the client convention, no migration. One module holds every family value, the inline overrides come out, the previous data stays on screen across page switches, and the dashboard is prefetched as the reference surface.
3. Slice three, the shared cache substrate, one migration for `app_cache`. The module, the bounded memory layer, the prune job, the runtime switch, and one live caller through the orchestrator, so a real hit is proven.
4. Slice four, the AI cache properly. The key carries the resolved chain and a version, values are validated and size capped, a cache hit spends no credit while the quota still counts, hits and misses are logged, and the admin purge lands.
5. Slice five, read caching with revalidation, no migration. The namespace registry and wrapper land first, proven on the public payment details, then the direct settings reader and the cached accessor, then readiness per student, then the four invalidation points, the fail open pass, and the tests. Each route keeps its existing auth checks and JSON shape.

**Rollback**: set the platform settings row to false, which returns generation and read paths to source reads without a redeploy. Slices one and two are commit level, so they revert with the commit. The `app_cache` table is additive and can stay once the switch is off. What the switch does not revert is the slice one chat path itself, since the collapsed reads, the post stream writes, and the memoised prompt are compile time changes, so slice one must be merged with care rather than rolled back at scale.

**Risks**: a wrong key composition silently serves one student another student's readiness, which is why the key is hashed, namespaced, versioned, and the sharing rule is an invariant rather than a detail. A settings read that reached the cached accessor from inside the cache switch would recurse, which is why the switch reads the direct helper and the cache module imports nothing else from settings. A prune job that trims by the wrong column could delete live entries, so the trim order is oldest `created_at` and only rows already past their expiry are trimmed first, and both paths run in batches. Every cache read costs a pooled connection, so under load a hit competes with the app's own queries, which is why reads carry a short timeout and a pool error counts as a miss. A long TTL expiring under load herds every instance at once, since single flight is only possible inside one instance, so the stampede is accepted and recorded rather than designed away. The client convention could make a surface feel stale before it feels fast, which is why credits, usage, notifications, chat, and search are pinned fresh.
## Consequences

**Positive**:

- Chat stops paying for work it does not need before the first byte, which is the number students actually feel, and it lands before any new infrastructure.
- Navigating the app costs a student nothing when nothing changed, on the most expensive network they are likely to be on.
- The cache finally does the job it was believed to be doing, across instances and across deploys, once it lands.
- The unbounded memory map is gone, so a long lived instance no longer grows until it is recycled.
- The budgets become measurable, so the next optimisation starts from a number rather than a feeling.
- An admin settings save reaches students at once on the instance that serves the save, and within the 60 second life on every other instance, so a wrong credit rule cannot outlive the minute that follows it.
- The sidebar readiness read stops costing two queries on every screen, and the dashboard prefetch shares the same entry instead of repeating it.

**Negative / tradeoffs**:

- One more table to own, plus a prune job and a row ceiling to operate, which a store with native expiry would have given for free, and a second migration to add the columns the measurements need.
- A store hit costs one database query, so the cache is not free on the read side even when it saves a model call, and a hit competes for the same small connection pool the app uses. Only the memory layer answers without one.
- Caching the settings accessor adds a lookup where a direct read used to stand, so a cold key costs marginally more than the query it replaced. The win only appears on the second read inside the life of the entry.
- Cross instance single flight is impossible with a memory map, so a burst on a cold key, and a long TTL expiring under load, can still reach the model more than once. This is recorded as an accepted limit, not solved.
- Sharing one prompt across students means one student's cached answer can be served to another who typed the same thing, which is intended for generated quizzes and summaries and must never extend to anything user specific. The readiness value is personal, so the student id is hashed into its key and it is never shared across students.
- The chat path changes in slice one are compile time and cannot be rolled back at runtime, unlike the cache, so that slice is the one that needs care in review.
- The client convention changes behaviour a student may notice, since a screen can now show data a few seconds old instead of always fetching.
- A cached readiness value hides a product gap rather than fixing it: nothing writes the performance table today, so the number is stable because nothing changes it, not because the cache is working well.

**Neutral**:

- Data route caching uses the same Postgres substrate rather than a second Next.js cache system, so scope row 41 closes through one consistent server cache pattern.
- Two read paths stay out of the contract on purpose: there is no database catalog to cache, and leaderboard may not survive the pivot review.
- The runtime switch means the cache can be off in production in seconds, which also means it can be quietly left off, and the switch is a settings row because a redeploy is not instant.
- The purge clears the store and the calling instance, so an entry can survive on another instance for up to the memory time to live. That is the honest limit of a purge on serverless.
- One student surface, the dashboard, is prefetched as the reference pattern, and its layout work belongs to scope rows 34 and 35.
## Follow-up

- [ ] Move the cache to Redis or Upstash when any of these is true: p95 cache read crosses 30 ms, hit volume passes roughly a million reads a month, or we want Redis for a second job such as rate limiting or presence. The store sits behind `lib/cache/`, so this is one file and a dependency.
- [ ] Narrow scope row 41's done when to platform settings, the public payment details, and readiness. There is no database catalog to cache, and leaderboard is out pending the pivot review, so the row should stop promising both.
- [ ] Nothing writes `TopicPerformance` today, so readiness is effectively a constant and the invalidation path has no live trigger. Either wire quiz submission to update it, or remove the readiness surface, before the number is used to make a decision.
- [ ] If leaderboard survives the pivot cleanup, enrol it through `withReadCache` with the user scope, since its payload carries the student's own rank and cannot be shared.
- [ ] Root `AGENTS.md` says there are no tests and that `pnpm test` fails. That is stale: `vitest.config.ts` exists and more than twenty test files run. Correct it before the read cache tests land, and let /state-sync own the edit.
- [ ] `lib/ai/AGENTS.md` and root `AGENTS.md` describe a single `google` model, eight registered tasks, and a one model chain per task. The code is OpenRouter based with four tasks and a Postgres backed breaker. The cache work depends on the task registry being accurate, so this drift should be corrected before the cache slices land.
- [ ] The byte caps from the research are partly in scope here, the chat payload only. The rest, the heaviest API payloads and first load script sizes, belong to feature 35 or the offline packs work and should be enrolled there.
- [ ] `hooks/usePaper3.ts` makes about 31 raw fetches outside the query convention. It should be folded into `lib/query-families.ts` or deleted, since a convention with a hole in it drifts straight back.
- [ ] The dashboard prefetch in slice two will overlap the layout work in scope rows 34 and 35. Worth coordinating so the same file is not rebuilt twice.

## Rationale

Reasoning, the options weighed, and the record of why this decision was made: see `rationale.md`.
