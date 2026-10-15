# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

1. **AI model chain through OpenRouter** (see spec 0003): every AI task now routes through OpenRouter behind an ordered chain of twelve models across eight labs, replacing the single hardcoded Gemini model. A request falls through to the next model when one fails, inside a shared 10s budget for object calls and a separate 120s budget for chat, which can run up to five tool steps.
2. **Circuit breaker** — a Postgres backed breaker (`ai_model_health`) skips a model after three transport faults and lets exactly one probe back in after a 2 minute cool down, so a dead lab is never retried on every request. Only transport faults trip it; a schema mismatch, a bad request, an auth or credit error fails fast without touching the breaker. State is shared across instances and fails open to the head if the read fails.
3. **Per student AI cost in XAF** — every served call writes an `ai_usage_events` row with the serving model, task, tokens, USD cost, and whole XAF at the rate in effect at the time. `GET /api/me/ai-usage` returns a signed in student's daily totals in Africa/Douala time; `GET /api/admin/ai-usage` returns totals split by model and task, admin only. Admin work with no student in scope, such as revision guides and question bank ingest, stays anonymous by design.
4. **Gated Fusion research** — an opt in `runFusionResearch` path for rare high value deep research, off by default, admin only, with its own cost guard and its own task tag so consensus spend never hides inside tutoring. Everyday quiz, exam, chat, and marking never touch it.
5. **Database index and query rewrite pass** (see spec 0008): concurrent index scripts under `scripts/db-indexes/`, with before and after query plans stored beside them, a stored notes search vector plus trigram search helpers, and stored post like and comment totals with a backfill and drift check. The live apply stays outside the normal migrate path.

### Changed

- **Hot route reads now use those indexes**: the leaderboard orders by total points desc then user id asc, excludes admin rows, caps pages at 100, and ranks by counting higher totals. Usage answers from five parallel scoped reads.
- **Admin screens answer from database aggregates**: active users come from `COUNT DISTINCT`, MRR comes from a grouped sum of active subscriptions by plan, and cohort data comes from stored metric rows. Lists and chart reads stay bounded.
- **Community and search use stored totals and indexes**: post lists return stored like and comment totals instead of per row counts, search uses the stored notes vector plus trigram matching, and an empty search returns 422 before any database read.
- **Long reads are batched or capped**: conversation delete scans messages in batches of 200, readiness reads at most 200 topic rows, and quiz submits accept at most 200 answers.
- **Three duplicate indexes are dropped** where a unique index already covers them, so writes carry less index overhead.

### Fixed

- **Concurrent quiz submits no longer lose points**: total points and quizzes taken now use atomic increments inside the same transaction as the attempt, so two submissions cannot overwrite each other.

- **Streaming fallback was dead code**: `streamText` returns before the provider is called and reports failure through `onError`, never as a throw, so the fallback loop around it could never fire. Chat, the only streaming surface, showed no fallback at all and wrote no cost row for a failed stream. The walk now reads the first text token before committing to a model, so a dead head is abandoned for the next one, and a failed stream records the transport failure plus a zero cost row.
- **Chat answers truncated mid sentence**: the chat route's stream budget had been cut from 120s to 10s while still running a five step tool loop. Streaming has its own budget again.
- **Per student XAF totals inflated**: rounding every ledger row up to a whole franc meant ten calls at 0.39 XAF each reported 10 XAF instead of 4. Rows stay whole francs per the money rule; totals now sum the precise USD and convert once.
- **A tripped model could be stranded**: the breaker's probe release was skipped on the fail fast path, so one schema or 4xx fault after a cool down left that model permanently skipped in that process while other instances kept probing it.
- **A failed probe reopened a dead model**: a model whose cool down probe failed was marked healthy, flooding full traffic back at it until three more faults re tripped it. It now stays open with only its trip time reset.
- **A single unavailable model killed the request**: any 4xx failed fast, so a model scoped 403 or 404 ended the whole chain instead of falling through. Fail fast is now limited to request scoped statuses.
- **Application bugs tripped the breaker**: unclassified errors counted as transport faults and could park a healthy model while hiding the real error behind a friendly message. They are now logged loudly and never trip it.
- **Chat titles were unattributed**: title generation wrote anonymous cost rows, so per student totals under reported real spend.

### Security

- **Missing provider key fails loudly**: an unset `OPENROUTER_API_KEY` now raises a clear server side error instead of surfacing a raw provider 401 to students. `USD_TO_XAF_RATE` is read for real rather than documented but unused.
- **AI usage read scoping**: `GET /api/me/ai-usage` returns 401 without a session and queries only that student's rows; `GET /api/admin/ai-usage` returns 401 without a session and 403 for any non admin, so a student can never read another student's or the platform's spend. Both validate their query parameters, paginate, and are rate limited.

- **Payment webhook hardening** — Fapshi webhook now fails closed when `FAPSHI_WEBHOOK_SECRET` is unset (returns 503), uses constant-time comparison for secret validation, and implements replay protection via `fapshi_trans_id` unique index on `affiliate_earnings`. FAILED→SUCCESSFUL sequences with the same transaction ID are allowed; duplicate SUCCESSFUL replays are idempotent.

- **Admin route authorization** — All 42 admin routes now call the shared `requireAdmin()` guard returning 403 for non-admin sessions. Leaky surfaces removed: `/api/admin/parse-status`, `/api/inngest/trigger`, `searchKnowledge` tool, and both knowledge harvest jobs (`harvestNoteKnowledge`, `harvestPaper3Knowledge`).

- **Rate limiting everywhere** — Coarse address-only baseline (60 req/min/IP) applied to all `/api/*` routes via `proxy.ts`. Per-route named buckets added via `lib/rate-limit.ts` (auth, AI, upload, quiz, notes, search, contact, payment, admin, default). OTP sends limited to 3 per 10 minutes per email hash inside better-auth send handler. Rate limit denials log JSON events with hashed fingerprints (`rate_limit_denied`, `arcjet_fail_open`).

- **Contact form hardening** — HTML escaping on all user inputs, honeypot `website` field silently drops spam, 3 requests/hour rate limit per IP.

- **AI tool boundaries** — All 10 chat tools across both tool sets wrapped via `wrapTool()` with policies: `userScope` (prevents cross-user data access), `webSearchScrub` (rejects emails, phones, instruction-like queries, truncates results to 2000 chars), `noRawText` (blocks raw extracted note text), `noIsPublic` (forces `isPublic: false` on quiz creation), `chatInputCap` (50 messages, 8000 chars per text part).

- **Server-side URL derivation** — Note creation and admin question ingest now derive `fileUrl` from `uploadthingKey` via `utapi.getFileUrls()`, ignoring any client-provided URL. Prevents SSRF via malicious `fileUrl` values.

- **Chat input validation** — `/api/ai/chat` returns 400 when `messages` exceeds 50 entries or any text part exceeds 8000 characters, before any model call.

- **Environment validation** — Boot fails in production when `ARCJET_KEY` or `BETTER_AUTH_TRUSTED_ORIGINS` is missing or holds a placeholder value. Edge runtime validates only `ARCJET_KEY`; Node validates all three critical secrets. `FAPSHI_WEBHOOK_SECRET` fails per-request with 503 if unset.

- **Security headers** — All responses now include CSP (enumerated UploadThing image hosts), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Permissions-Policy`.

- **Chat uploader limit** — Reduced from 10 to 4 images per request.

- **Inngest concurrency cap** — Note processing job limited to 4 concurrent executions.

### Infrastructure

- **CI pipeline** — GitHub Actions workflow runs on PRs and nightly: frozen lockfile install, `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm audit --audit-level=high`, `osv-scanner` on lockfile, `gitleaks` (fails build on secrets), dependency gate with allowlist for watched packages (`pdf-parse`, `pdfjs-dist`, `mammoth`, `tesseract.js`).

- **Dependency management** — `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (72 hours). `renovate.json` configured with grouped PRs, no auto-merge for `better-auth`, `next`, `ai`, `@ai-sdk/*`, and PDF parsers.

- **Docker Compose** — All credentials via env substitution (`${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, etc.), services bound to `127.0.0.1`.

- **Observability** — Migrated from PostHog to Sentry (Next.js SDK): client/server/edge config, `instrumentation.ts`, global error boundary, `sentry-tunnel` route, session replay with masking, data collection opt-out.

- **Test infrastructure** — Vitest configured with jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Playwright added for E2E (browser install pending network). 18 passing tests for tool policy wrapper.

### Developer Experience

1. **Prompt registry** (see spec 0002): all AI wording moved from inline literals to 38 versioned markdown files under `prompts/` (quiz, exam, grade, ingest, paper3, chat, tools). Typed loader validates headers, slots, model allow list, and needs flags with fail fast errors. File edits apply on the next request with no rebuild.
2. **File settings travel with prompts**: heat maps to temperature, cap maps to max tokens, file cache span wins over task defaults, grading prompts stay at span zero so marking never caches, and logs carry prompt name plus version plus model with no student data. `pnpm prompts:check` gates headers plus a 200 char inline prompt rule in CI.
3. **Exam mock difficulty fix**: mock generation returned 500 because the prompt never named the difficulty scale the schema requires. The prompt file now rates difficulty 1 to 5, verified live with no rebuild.
4. **Verify fixture seed**: dev only `scripts/seed-verify-fixture.ts` creates a verified admin user with credits, exam profile, visible blueprint, and READY note for end to end AI drives. Refuses production.
5. **Test infrastructure**: suite at 49 passing, incl. loader conformance, orchestrator cache plus trace, and check script CLI suites.
6. **Provider import gate** — `pnpm prompts:check` now fails when any file outside `lib/ai/instances.ts` imports `@ai-sdk/google`, `@ai-sdk/openai`, or `@ai-sdk/openai-compatible` directly, so no AI call can quietly bypass the chain and its breaker.
7. **Chain test suite** — 237 tests across 13 files. Covers chain order and override parsing, error classification (schema vs transport vs fail fast), breaker trip, cool down, probe single flight and the failed probe staying open, XAF math, ledger attribution, the chain walk on object and stream paths, the Fusion gate, and both usage routes with their 401 and 403 cases. A static guard fails if an AI helper accepts or forwards a student id without it reaching the ledger, which is the bug that made per student cost read empty.
8. **Database performance test suite** — 77 tests across 15 files. Covers leaderboard caps and rank, usage read scoping, admin sort responses, search before and after the indexed path, chat delete batching, quiz atomic point increments, KPI aggregates, the readiness cap, and the index script rules.

- **Type safety** — `lib/env.ts` split into Edge/Node validation with Zod schemas. `lib/require-admin.ts` shared admin guard. `lib/ai/tool-policy.ts` typed `wrapTool` with policy sets. `lib/rate-limit.ts` typed bucket configs and security event logging.

- **Code quality** — Biome formatting, strict TypeScript, no `any` in new code, consistent import sorting.

### Removed

- `/api/admin/parse-status` route and `/api/inngest/trigger` route
- `searchKnowledge` tool from both chat tool sets
- `harvestNoteKnowledge` and `harvestPaper3Knowledge` Inngest jobs
- PostHog analytics (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)

---

[2026-10-12] — Security and integrity hardening (spec 0001)