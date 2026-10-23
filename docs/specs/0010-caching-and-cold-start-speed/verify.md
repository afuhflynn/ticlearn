# Verify: caching and cold start speed · spec 0010 · updated 2026-10-23

_Steps derived from spec 0010 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

Covers slices one and two. Slices three and four have their own steps when they land.

## UI / manual

- [ ] Open a conversation, send a message, and confirm the answer streams instead of a 500       → AC-1
- [ ] Read the raw response with `curl -N` and confirm the first bytes on the wire are a comment frame (`: keep-alive`) before any `data:` line       → AC-4
- [ ] Send a second message in the same conversation and confirm the reply still streams       → AC-1
- [ ] A student whose `levelOfStudy` is null still gets an answer, and a student with a level set gets that level used in the prompt       → AC-1
- [ ] Confirm the daily allowance message reads correctly: a student on their ninth message of the day on the FREE plan is refused, while every earlier one streams       → AC-3
- [ ] Close the tab while an answer is streaming, reopen the conversation, and confirm the question the student sent is still there       → AC-3
- [ ] Wait for an answer to finish, then confirm the chat count on the student's stats still went up by one       → AC-3
- [ ] Edit `prompts/chat/chat_system.md`, send a message, and confirm the change appears only after the hold window; then set `PROMPT_FILE_HOLD_MS=0` and confirm it appears at once       → AC-5
- [ ] Paste a single message part longer than 8000 characters and confirm the route answers 400 with the length message, not a 500       → AC-20
- [ ] Load a conversation with roughly 40 turns of history and confirm the model receives only the trimmed tail, with the newest turn always present       → AC-20
- [ ] Confirm the answer still renders correctly on the client after a stream where older tool calls were dropped, with no stuck "thinking" state       → AC-20

## Commands

- [x] `pnpm test --run` → the two pre-existing failures only (`chain-walk`, `user-attribution`), and `tests/lib/prompts/loader.test.ts` green including the hold test       → AC-5
- [x] `pnpm typecheck` → the one pre-existing error in `tests/app/api/contact.test.ts` only       → AC-2
- [x] `pnpm build` → compiles successfully       → AC-2
- [ ] Query the database: `select first_byte_ms, keep_alive_sent, cache_hit from ai_usage_events order by created_at desc limit 5;` → recent chat rows carry `keep_alive_sent = true` and a `first_byte_ms` between roughly 50 and 30000       → AC-2, AC-22
- [ ] Call `chatFirstBytePercentiles()` and confirm it returns a sample count above zero with p75 and p95 numbers       → AC-2, AC-22
- [ ] Send the same prompt twice and confirm `cache_hit` stays null, since streaming chat never caches       → AC-22

## Acceptance-criteria coverage

- AC-1 covered by the first three manual steps and the level test
- AC-2 covered by the p75 and p95 query and the database row check
- AC-3 covered by the quota message, the closed tab, the stats count, and the duplicate check still logging
- AC-4 covered by the raw curl read of the comment frame
- AC-5 covered by the prompt edit and the loader test run
- AC-20 covered by the long part rejection and the history trim test
- AC-22 covered by the four new usage columns and the percentile call

## Slice two, the client cache convention

- [ ] Open the dashboard signed in, then open the network panel. The stats, notes, quizzes and readiness values arrive with the first HTML, and the four client requests either do not fire or return only a background refresh       → AC-19
- [ ] Reload the dashboard with the network panel showing requests, and confirm the readiness card has content on the first paint rather than a skeleton that fills in later       → AC-19
- [ ] Navigate from the dashboard to notes and back, and confirm the dashboard numbers paint at once with no loader and no flash       → AC-14
- [ ] Navigate from the dashboard to credits and back, and confirm the balance is refetched rather than painted from an old value       → AC-16
- [ ] Submit a quiz, then return to the dashboard, and confirm the quiz count and streak went up without a manual refresh       → AC-14
- [ ] Upload a note, and confirm the notes list refreshes on its own while the note is processing, then stops polling once it is ready       → AC-16
- [ ] On the admin users screen, go from page 1 to page 2 and back, and confirm the rows a reader is looking at stay on screen while the next page loads rather than going blank       → AC-15
- [ ] On the leaderboard, page forward and back, and confirm no blank state between pages       → AC-15
- [ ] Update your profile name, and confirm the new name appears without a refresh, on the dashboard greeting too       → AC-14
- [x] Search the codebase for `staleTime` and `gcTime` written as a literal inside any hook file, and confirm there are none       → AC-18
- [ ] Confirm `lib/query-families.ts` names every family and that `providers/QueryProvider.tsx` takes its defaults from it       → AC-18

## Slice two commands

- [x] `pnpm typecheck` → the one pre-existing error in `tests/app/api/contact.test.ts` only       → AC-18
- [ ] `pnpm build` → compiles successfully, and `/dashboard` renders as a dynamic route       → AC-19
- [x] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard` while signed out → 307 to sign in, not a 500       → AC-19
- [ ] `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/quizzes?scope=public"` → 401 signed out, and signed in returns the public list, proving the scope filter survived the extraction       → AC-19

## Slice two acceptance criteria coverage

- AC-14 covered by the back navigation, the quiz submission, and the profile update steps
- AC-15 covered by the admin users and leaderboard paging steps
- AC-16 covered by the credits, notes polling, and readiness steps
- AC-17 covered by the dashboard and notes steps, which must not refetch on navigation inside the stale time
- AC-18 covered by the literal search and the module inspection steps
- AC-19 covered by the first paint, the network panel, and the dashboard commands

## Slice three, the shared cache substrate

- [ ] Ask for the same generated quiz twice from two different signed in students, and confirm the second is served without a second model call and both students see the same answer       → AC-6
- [ ] Change a prompt file, ask again, and confirm the new wording produces a new key rather than serving the old answer       → AC-6, AC-11
- [ ] Set `AI_CHAIN_ORDER` in the environment to a different model, ask the same question, and confirm the cache does not serve the previous model's answer       → AC-6
- [ ] Set `shared_cache_enabled` to false on the `platform_settings` row, wait about a minute, then ask the same question twice and confirm both calls reach the model       → AC-8
- [ ] Point `DATABASE_URL` at an unreachable host, ask for something cacheable, and confirm the request still answers rather than failing       → AC-8
- [ ] Fill the cache past 200 keys on one instance and confirm it stays bounded rather than growing, and that the newest reads still answer without a database round trip       → AC-9
- [x] Confirm no key or value in `app_cache` contains a user id, a note id, or prompt text: `select key, namespace from app_cache limit 20;` returns only hashes and namespace names       → AC-11
- [ ] Run the prune job from the Inngest dashboard and confirm it reports the expired rows it removed, then confirm live rows survived       → AC-10
- [ ] Set `CACHE_MAX_ROWS` to a small number and run the prune job, confirming the table is trimmed down to it       → AC-10

## Slice three commands

- [x] `pnpm test --run tests/lib/cache/store.test.ts` → ten tests pass, covering sharing, the memory bound, expiry, single flight, failing open, the value ceiling and purging       → AC-6, AC-7, AC-8, AC-9, AC-10, AC-12
- [ ] `pnpm test --run` → the two pre-existing failures only, and 411 tests in total       → AC-6
- [ ] `pnpm typecheck` → the one pre-existing error in `tests/app/api/contact.test.ts` only       → AC-6
- [ ] `pnpm build` → compiles successfully       → AC-6
- [ ] `curl -s http://localhost:3000/api/inngest` → `function_count` is 20, up one from the prune job       → AC-10
- [ ] Confirm the table exists live: `select key, namespace, expires_at from app_cache limit 5;`       → AC-6, AC-10

## Slice three acceptance criteria coverage

- AC-6 covered by the shared read steps and the store test
- AC-7 covered by the single flight test in `tests/lib/cache/store.test.ts`
- AC-8 covered by the switch off step, the unreachable database step, and the failing open test
- AC-9 covered by the memory bound step and the memory test
- AC-10 covered by the prune job steps and the expiry test
- AC-11 covered by the database inspection step
- AC-12 covered by the value ceiling test

## Slice four, the AI cache behaviour

- [ ] Ask for the same generated quiz twice as one student, and confirm their credit balance went down once, not twice, with the second answer served from cache       → AC-13
- [ ] Confirm the daily quota still counts both asks even when the second was a cache hit       → AC-13
- [ ] Generate a quiz, then ask for an identical one, and confirm the `ai_usage_events` log shows one row with `cache_hit` true and `cache_namespace` set to the task       → AC-22
- [ ] Read the hit rate: `select count(*) filter (where cache_hit) * 100.0 / count(*) from ai_usage_events where task = 'quiz_gen' and created_at > now() - interval '24 hours';` gives a number, not an error       → AC-22
- [ ] Confirm `cold_start` is true on the first few rows a fresh instance writes and then stops being true, proving the cold start signal resets with the instance       → AC-22
- [ ] Call `POST /api/admin/cache/purge` with `{"namespace":"quiz_gen"}` as an admin, and confirm 204 and the log line naming the actor and namespace       → AC-21
- [ ] Call the same route as a signed in student, and confirm 403 and that nothing was purged       → AC-21
- [ ] Call the same route with a GET, and confirm it is not allowed, so a link cannot purge       → AC-21
- [ ] Generate a quiz, purge its namespace, then generate it again, and confirm a fresh model call happens rather than the old cached answer       → AC-21

## Slice four commands

- [ ] `pnpm test --run tests/lib/ai/chain-walk.test.ts` → the hit row, fromCache, and single flight tests pass       → AC-13, AC-22
- [ ] `pnpm test --run` → the two pre-existing failures only, and 413 tests in total       → AC-7
- [ ] `pnpm typecheck` → the one pre-existing error in `tests/app/api/contact.test.ts` only       → AC-12
- [ ] `pnpm build` → compiles successfully       → AC-12
- [ ] `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/cache/purge -d '{"namespace":"quiz_gen"}'` → 401 signed out, 403 as a student, 204 as an admin       → AC-21

## Slice four acceptance criteria coverage

- AC-7 covered by the single flight test and the shared store test
- AC-11 covered by the database inspection step
- AC-12 covered by the value ceiling test and the build
- AC-13 covered by the credit steps and the fromCache test
- AC-21 covered by the purge permission and GET steps
- AC-22 covered by the log, hit rate, and cold start steps

## Verification run 2026-10-16

- [x] `pnpm test --run` → 411 passed, 2 failures, both pre-existing (`chain-walk` labels an outage differently, `user-attribution` quiz route)       → AC-5
- [x] `pnpm typecheck` → the one pre-existing error in `tests/app/api/contact.test.ts` only       → AC-2
- [x] `pnpm build` → compiles successfully       → AC-2
- [x] `GET /dashboard` signed out → 307 to sign in, not a 500       → AC-19
- [x] `GET /api/quizzes?scope=public` signed out → 401       → AC-19
- [x] `POST /api/admin/cache/purge` signed out → 401; `GET` on the same route → 405, so a link cannot purge       → AC-21
- [x] Purge as a signed in non admin → 403       → AC-21
- [x] Admin rate limit is wired in: repeat calls to the purge route returned 429 with `bucket: "admin"` logged by `proxy.ts`       → AC-21
- [x] The prompt loader loads `chat_system` with all five slots supplied (`v2`, 3015 chars), which is the slot fix holding       → AC-1
- [x] The in process layer stays at its ceiling: 500 sets through a 200 entry LRU leaves size 200, newest readable, oldest evicted       → AC-9
- [x] Twenty concurrent identical `withCache` calls on one key made exactly one produce call       → AC-7
- [x] Shared store: a value written by one module instance read back through a fresh one after `clearMemory()`, and a different prompt missed       → AC-6
- [x] A value over the 256 KB ceiling added no row to `app_cache`       → AC-12
- [x] `app_cache` keys are 64 char hex hashes only; no user id, note id or prompt text       → AC-11
- [x] Purging one namespace left the other intact (`removed=2`, remaining only the other namespace)       → AC-21
- [x] Specced migrations are all applied and live: `app_cache` (5 columns, 3 indexes), `ai_usage_events` (first_byte_ms, cache_hit, cache_namespace, keep_alive_sent, cold_start), `platform_settings.shared_cache_enabled`       → AC-6, AC-10, AC-11, AC-22
- [x] No `staleTime` or `gcTime` literal remains in any hook, and `providers/QueryProvider.tsx` reads its defaults from `lib/query-families.ts`       → AC-18

### Failed

- AC-19 first paint: `GET /dashboard` signed in returns 200 and the server HTML carries the prefetched query cache (`user-stats`, `notes`, `quizzes`, `readiness` all present with `status: "success"`), so `prefetchQuery` plus `HydrationBoundary` are wired and working. But the rendered first paint is four `Skeleton` blocks, because `DashboardClient` returns the skeleton branch whenever `sessionPending` is true and `useSession()` is client only, so the SSR pass has no session. The numbers therefore appear a moment after hydration rather than in the first HTML. AC-19 asks that the first paint show real content; it does not.

### Blocked

Everything behind the `ai` rate limit bucket, which returned 429 for every attempt across a restart and a five minute wait, so the chat path could not be driven at all in this environment:

- AC-1 streaming instead of a 500, and the second message streaming
- AC-4 the keep alive comment frame as the first bytes on the wire
- AC-2 and AC-22 `first_byte_ms` and `keep_alive_sent` rows, and `chatFirstBytePercentiles()`
- AC-3 the daily allowance message, the closed tab keeping the question, and the stats count after an answer
- AC-20 the 400 for a part over 8000 characters, and the trimmed tail reaching the model
- AC-13 the credit skipped on a cache hit while the quota still counts

Needs an Arcjet `ai` bucket that will admit a call, or a development bypass for the limiter. The limiter is remote, so a process restart does not clear it.

All browser driven steps (the network panel on the dashboard, back navigation painting, the admin paging keeping rows on screen, notes polling, profile update without a refresh, credits refetch) are blocked too: no browser automation tool is available in this environment, only HTTP.

## Slice five: data route caching with revalidation (added 2026-10-23)

### UI / manual

- [x] Call `GET /api/payment-settings` twice in a row and confirm both bodies are byte identical, and that `app_cache` holds exactly one row with namespace `read:payment-settings` and a 64 character hex key → AC-23, AC-25
- [ ] Sign in as admin, change a credit cost on the admin platform settings screen, save, then load a student screen that reads settings before 60 seconds pass, and confirm the new cost is already there → AC-25, AC-27
- [ ] As admin, change the MTN number on the admin payment settings screen, save, then open the public page that shows payment details at once and confirm the new number, not the old one → AC-27
- [ ] Open the dashboard as student A and note the readiness number, then open it as student B and confirm B sees B's own number, never A's → AC-24, AC-30
- [ ] As student A, answer one practice question (`POST /api/performance`), reload the dashboard, and confirm A's readiness is recomputed while B's entry is untouched → AC-27, AC-28
- [x] As student A, delete one of A's notes, reload the dashboard, and confirm the readiness number no longer counts that note, while B's dashboard is unchanged → AC-27, AC-28
- [x] Inspect `app_cache` rows for `read:%` and confirm every key is a 64 character hash that contains no user id, and the row's `expires_at` is about 60 seconds after `created_at` → AC-24
- [x] Serve a cached readiness read, wait past 60 seconds, read again, and confirm `computeReadiness` runs again rather than the old value being served → AC-29
- [x] Stop Postgres (or force `app_cache` reads to fail) and confirm `/api/payment-settings`, the dashboard, and a performance write still succeed, with a `[cache]` namespace log in the server output → AC-29

### Commands

- [x] `pnpm typecheck` → exits 0 → AC-23
- [x] `pnpm vitest run tests/lib/cache` → 25 tests pass across 2 files → AC-30
- [x] `pnpm vitest run` → the full suite passes → AC-30
- [x] `pnpm build` → the build completes and prints the route table → AC-23
- [x] `pnpm exec biome check` → zero errors (warnings are pre existing) → AC-23
- [x] `psql "$DATABASE_URL" -c "select namespace, count(*) from app_cache where namespace like 'read:%' group by namespace"` → at most one row per global namespace, one row per student for `read:readiness` → AC-23, AC-24

### Acceptance-criteria coverage

- AC-23 covered by the two payment detail reads, the `app_cache` row check, and the typecheck and build commands
- AC-24 covered by the two student isolation step, the key inspection step, and the readiness row count per student
- AC-25 covered by the identical JSON step and the admin settings step, which reads through the same route shape as before
- AC-26 covered by the platform settings save step and by `pnpm typecheck` with `lib/platform-settings-direct.ts` imported by `lib/cache/index.ts` only
- AC-27 covered by the settings, payment, performance and note delete steps
- AC-28 covered by the performance step, where only one student's entry is cleared
- AC-29 covered by the expired entry step and the failing store step, both of which still serve the read or complete the mutation
- AC-30 covered by the cache test commands and by the isolation and expiry steps

### Verification run 2026-10-23

Ran against the real dev server on `http://localhost:3000` with Postgres on 5435, two signed in students, one admin, and a note plus a practice row seeded for student A so the two students' readiness values differed (77 against 50).

All eight criteria (AC-23 to AC-30) were exercised and met. The four steps left unticked above name a screen the run could not click: there is no browser automation tool in this environment, so the admin saves ran through `PUT /api/admin/platform-settings` and `PUT /api/admin/payment-settings` and the student reads through `GET /api/credits/purchase/config` and `GET /api/readiness`, which is the same behaviour the screens call.

- Cold instance (server restarted, memory layer empty, read rows cleared): two `GET /api/payment-settings` returned byte identical JSON, one `read:payment-settings` row, a 64 character hex key, a life of 59.985 s → AC-23, AC-25
- Admin saved `creditsPer1000Xaf` 50 → 60 and the public config read showed 60 one second later, inside the 60 second life → AC-25, AC-27
- Admin saved an MTN number and the public payment details showed it one second later → AC-27
- Student A readiness 77 (`needsAssessment` false), student B 50 (`needsAssessment` true), two `read:readiness` rows, both keys 64 hex characters, neither key containing either user id → AC-24, AC-30
- `POST /api/performance` for A left exactly one readiness row, and that row's hash matched B's key, so only A was cleared → AC-27, AC-28
- `DELETE /api/notes/verify-note-a` cleared A's entry and A's next readiness read dropped to 50, so the deleted note no longer counted → AC-27, AC-28
- B's entry `created_at` moved from 05:55:06 to 05:56:09 after a 62 second wait, so an expired entry is computed again → AC-29
- With `app_cache` renamed, `GET /api/payment-settings` 200, `GET /dashboard` 200 and `POST /api/performance` 200, with `[cache] store read for read:payment-settings failed`, `store write`, `store read for read:readiness`, `store write` and `store delete` all logging the namespace → AC-29
- With `platform_settings` renamed, the switch read logged `[cache] settings read for the cache switch failed`, the request still answered 200, and a cache row was still written, so a failed switch read keeps the last answer rather than disabling the cache → AC-26
- The cold `GET /api/payment-settings` query order was `platform_settings` (the direct switch read), then `app_cache` (miss), then `payment_settings` (source), then the `app_cache` insert, with no second cache read from the accessor, which is the recursion the split prevents → AC-26
- Signed out `GET /api/readiness` 401 and wrote no readiness row, signed out `GET /api/payment-settings` 200 as a public route, and a student `PUT /api/admin/platform-settings` 403 that changed nothing → AC-25
- No `unstable_cache` or `use cache` anywhere in `app`, `lib`, `components` or `hooks`, and `withReadCache` appears at exactly three read sites with four invalidation call sites → AC-23, AC-27
- `pnpm typecheck` exit 0, `pnpm vitest run tests/lib/cache` 25 passed across 2 files, `pnpm vitest run` 639 passed across 78 files, `pnpm build` exit 0 with the route table, `pnpm exec biome check` exit 0 with 71 pre existing warnings → AC-23, AC-30

### Not applied / missing

None. All three namespaces exist live, and every route the contract names answers with its old status codes and payload shape.
