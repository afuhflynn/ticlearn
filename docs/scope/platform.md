# Platform

The engine under every later slice. Sixteen foundations: security, the prompt registry, the model chain, the database, background work, caching, the design system, email, and how every route paints. Plus one cross cutting bar that every slice is measured against: the screens have to work on the phone our students actually own.

(basis: research/audience-and-market.md · research/env-inventory.md · research/performance-and-database.md · research/ui-toolkit.md · research/security.md · research/email-system.md · research/stack-and-storage.md · research/seo-and-rendering.md)

## Foundations

### 1. Codebase audit and project conventions
`AGENTS.md` describes a model chain, an OpenAI direct path and a dead model cache that no longer exist in the code. Everything downstream reads those docs and will build on fiction.
**Done when:** `AGENTS.md` matches the code, and root `AGENTS.md` plus nested area docs name the conventions future work must follow.
- [x] Capture the real conventions: `/codebase-audit`

### 2. Security and integrity hardening · GA
Twenty findings must close before real students use this: a payment webhook that grants a subscription when its secret is unset, an admin route with no role check, a knowledge search that reads every user's notes, rate limiting written but never switched on, and an exam endpoint that sends the answer key to the phone before the exam starts.
**Done when:** every launch blocker in `research/security.md` is closed with a test that fails without the fix, the payment webhook fails closed, no route leaks another user's data, and every AI, upload, contact, signup and admin route has a live rate limit.
- [x] Design it (spec): [0001](../specs/0001-security-and-integrity-hardening/index.md) · four children under it, one per surface, all resting on the same four shared modules
- [x] Build it: /feature-build security and integrity hardening
  - [x] Harness and shared modules: vitest config, `typecheck` script, first CI workflow, the split `lib/env.ts`, `lib/rate-limit.ts` with the coarse proxy baseline, `lib/require-admin.ts`, `lib/ai/tool-policy.ts` (satisfies AC-4, AC-6, AC-11, AC-15, AC-20)
  - [x] Money path first: webhook fails closed, constant time compare, replay guard on ACTIVE plus the same transaction id, affiliate upsert with its migration, and every route family metered (satisfies AC-1, AC-2, AC-3, AC-6)
  - [x] Identity and leaky surfaces: admin guard across all 42 routes, contact escaping and spam trap, delete parse-status, rewrite the trigger helper as a direct `inngest.send`, delete the trigger route, delete `searchKnowledge` and both harvest jobs (satisfies AC-4, AC-5, AC-9)
  - [x] Abuse and AI boundaries: OTP buckets in the better-auth send handler, denial and fail open logs, webhook out of bot detection, upload caps, note job concurrency, tool wrapper across both chat tool sets, web search scrubbing, `isPublic` off the model, chat caps, server derived note and ingest URLs (satisfies AC-7, AC-8, AC-10, AC-11, AC-12, AC-13, AC-14, AC-18, AC-21, AC-22, AC-23, AC-25)
  - [x] Deploy surface and proof: security headers with enumerated image hosts, compose credentials and identifiers, `BETTER_AUTH_TRUSTED_ORIGINS`, dependency gate allowlist, `minimumReleaseAge`, `renovate.json`, then walk every AC against the running app (satisfies AC-16, AC-17, AC-19, AC-20, AC-24, and the full AC walk)
- [x] Verify it: /verify-release security and integrity hardening
- [x] Test it: /test-engineer security and integrity hardening
- [x] Review it (fresh model): /peer-review security and integrity hardening
- [x] Document it: /tech-writer security and integrity hardening

(basis: research/security.md §launch blockers · spec 0001, cross check findings incorporated before acceptance)

### 3. Prompt registry · GA
Every AI prompt is an inline template literal in about ten files. Move them all to editable markdown with front matter, read at runtime, so a prompt change needs no rebuild and lives in git where it can be reviewed.
**Done when:** no prompt string is inline in code, each prompt file carries its model and settings in front matter, an edit to a file changes behaviour on the next request, and the tool descriptions the model sees load from the same place.
- [x] Design it (spec): [0002](../specs/0002-prompt-registry/index.md) · code in `prompts/`, `lib/prompts/loader.ts`
- [x] Build it: /feature-build prompt registry
  - [x] Loader and schema: typed `getPrompt`, header validation, slot checks, memory hold, fallback (covers: model and settings in front matter, edits apply on next request)
  - [x] Migrate every prompt and tool text: all inline prompts including Paper 3 and jobs plus tool descriptions, one file per builder (covers: no inline strings, tool text from the same home)
  - [x] Enforcement: CI check that validates all prompt files and blocks new inline prompt text (proven 2026-10-12: 38 files ok, tripwire trips and clears; needs flag enforcement plus file settings travelling with text plus name/version logs wired 2026-10-12 across quiz, exam, Paper 3, jobs, chat)
  - [x] Full AI pass through the running app: quiz READY with 5 questions, exam mock 200 with 5 questions, Paper 3 mock DRAFT with 5 questions, chat streamed MANGO to completion, name/version/model lines in server logs (driven 2026-10-12 with fixture user plus seed plus `scripts/seed-verify-fixture.ts`; exam needed a prompt v2 one line difficulty fix, Paper 3 needed retries; generate_mock cap 8192 tried and reverted, v1 stands)
- [x] Verify it: /verify-release prompt registry (PASS 2026-10-12: all four Done when met with live evidence, quiz READY plus exam 200 plus Paper 3 DRAFT plus chat DONE; rerun note: daily free tier quota of 20 was spent by the drives, re drives can wait for reset)
- [x] Test it: /test-engineer prompt registry (43 passed 2026-10-12: loader conformance extended plus new orchestrator suite)
- [x] Review it (fresh model): /peer-review prompt registry (Changes requested 2026-10-12: 1 major plus 10 minor plus 4 nits; top: inline scan bypassable)
- [x] Document it: /tech-writer prompt registry (changelog entry under Developer Experience)

(basis: research/chat-experience.md §14 and research/web-search-tooling.md §6 both landed on the same front matter shape, so it is designed once and reused)

### 4. AI model chain through OpenRouter · GA
Today every AI task hardcoded one Gemini model and there is no fallback. Routed through OpenRouter with an ordered chain across open weight labs, a circuit breaker so a dead model is never retried, and a per request deadline. The chain is now open weight only and ordered per task in `lib/ai/registry.ts`, so the platform carries no bill for a proprietary model.
**Done when:** a forced failure on the head of the chain falls through to the next model within the deadline, a dead model is skipped for a cool down window, schema failures do not trip the breaker, and per student AI cost is measurable in XAF.
- [x] Design it (spec): [0003](../specs/0003-ai-model-chain/index.md) · code in `lib/ai/` (`chain.ts`, `breaker.ts`, `usage.ts`, `pricing.ts`, `fusion.ts`, `orchestrator.ts`)
- [x] Build it: /feature-build AI model chain through OpenRouter
  - [x] Chain plus breaker plus deadline (covers AC-1, AC-2, AC-3, AC-5)
  - [x] Usage ledger plus XAF reads (covers AC-4)
  - [x] Streaming plus all down plus Paper3 cutover (covers AC-6, AC-7, AC-8)
- [x] Verify it: /verify-release AI model chain through OpenRouter (PASS 2026-10-12 run 3: all eight AC met with evidence after the review blockers were fixed. Run 1 and run 2 both passed, but run 2's AC-6 evidence was invalid and run 3 re proved it against a lazy stream mock matching the real SDK, plus a live streaming check)
- [x] Test it: /test-engineer AI model chain through OpenRouter (231 passed 2026-10-12: nine new files covering chain order and error classification, breaker trip and probe, XAF math, ledger attribution, the chain walk, the Fusion gate, both usage routes, plus the AC-4 wiring regression guard and the provider import gate)
- [x] Review it (fresh model): /peer-review AI model chain through OpenRouter (BLOCKED 2026-10-12: 3 blockers, 11 majors, 11 minors, 5 nits; three blockers independently confirmed on the streaming path, the probe leak on the fail fast path, and the chat timeout cut from 120s to 10s; findings in `docs/reviews/2026-10-12-ai-model-chain.md`)
- [x] Document it: /tech-writer AI model chain through OpenRouter (changelog entry under Unreleased: Added for the chain, breaker, per student XAF and Fusion, Fixed for the eight defects the review surfaced, Security for the key check and route scoping, Developer Experience for the provider import gate and the test suite)
- [x] Design it (spec): [0003](../specs/0003-ai-model-chain/index.md) · code in `lib/ai/` (`chain.ts`, `breaker.ts`, `usage.ts`, `pricing.ts`, `fusion.ts`, `orchestrator.ts`)
- [x] Build it: /feature-build AI model chain through OpenRouter
  - [x] Chain plus breaker plus deadline (covers AC-1, AC-2, AC-3, AC-5)
  - [x] Usage ledger plus XAF reads (covers AC-4)
  - [x] Streaming plus all down plus Paper3 cutover (covers AC-6, AC-7, AC-8)
- [x] Verify it: /verify-release AI model chain through OpenRouter (PASS 2026-10-12 run 3: all eight AC met with evidence after the review blockers were fixed. Run 1 and run 2 both passed, but run 2's AC-6 evidence was invalid and run 3 re proved it against a lazy stream mock matching the real SDK, plus a live streaming check)
- [x] Test it: /test-engineer AI model chain through OpenRouter (231 passed 2026-10-12: nine new files covering chain order and error classification, breaker trip and probe, XAF math, ledger attribution, the chain walk, the Fusion gate, both usage routes, plus the AC-4 wiring regression guard and the provider import gate)
- [x] Review it (fresh model): /peer-review AI model chain through OpenRouter (BLOCKED 2026-10-12: 3 blockers, 11 majors, 11 minors, 5 nits; three blockers independently confirmed on the streaming path, the probe leak on the fail fast path, and the chat timeout cut from 120s to 10s; findings in `docs/reviews/2026-10-12-ai-model-chain.md`)
- [x] Document it: /tech-writer AI model chain through OpenRouter (changelog entry under Unreleased: Added for the chain, breaker, per student XAF and Fusion, Fixed for the eight defects the review surfaced, Security for the key check and route scoping, Developer Experience for the provider import gate and the test suite)

(basis: research/stack-and-storage.md §3 · three Google and Anthropic models fail together, so the chain must span labs)
- Shipped twelve ids across eight labs rather than six, verified live against the OpenRouter catalog with zero expiry dates, head `google/gemini-3.7-flash` after research found `google/gemini-2.5-flash` expires 2026-10-20.
- Review returned BLOCKED (2026-10-12): 3 blockers, 11 majors. All three blockers fixed and re verified in run 3: streaming fallback had been dead code because `streamText` returns lazily and reports failure through `onError` rather than throwing, so the walk now gates on the first text token; the probe no longer leaks on the fail fast path; chat streaming got its own 120 second budget again. Of the majors, the failed probe no longer marks a model healthy, fail fast is limited to request scoped statuses, unclassified errors no longer trip the breaker, chat titles are attributed, per row XAF rounding no longer inflates student totals, and `USD_TO_XAF_RATE` plus the missing key check are now live. The remaining majors are tracked in `docs/reviews/2026-10-12-ai-model-chain.md`.
- Schema landed via `db:push`, not a migration file, because pre existing drift on `affiliate_earnings` blocks `pnpm db:migrate` in this database. The written migration is still owed.
- No migration file means a fresh environment cannot build these two tables from migrations alone; worth resolving before deploy.
- Budget rule changed during the build and is now settled in code but not yet in the spec: an even split of the 10 second budget gives each of twelve models under a second, so each object attempt uses the time left up to a six second cap, and streaming uses its own 120 second budget for the five step tool loop. The spec's Key invariants still say an even split, and it still prescribes rounding XAF per ledger row, which is what inflated totals before run 3. Both spec lines want a `/solution-architect AI model chain` pass.
- Shipped twelve ids across eight labs rather than six, verified live against the OpenRouter catalog with zero expiry dates, head `google/gemini-3.7-flash` after research found `google/gemini-2.5-flash` expires 2026-10-20.
- Review returned BLOCKED (2026-10-12): 3 blockers, 11 majors. All three blockers fixed and re verified in run 3: streaming fallback had been dead code because `streamText` returns lazily and reports failure through `onError` rather than throwing, so the walk now gates on the first text token; the probe no longer leaks on the fail fast path; chat streaming got its own 120 second budget again. Of the majors, the failed probe no longer marks a model healthy, fail fast is limited to request scoped statuses, unclassified errors no longer trip the breaker, chat titles are attributed, per row XAF rounding no longer inflates student totals, and `USD_TO_XAF_RATE` plus the missing key check are now live. The remaining majors are tracked in `docs/reviews/2026-10-12-ai-model-chain.md`.
- Schema landed via `db:push`, not a migration file, because pre existing drift on `affiliate_earnings` blocks `pnpm db:migrate` in this database. The written migration is still owed.
- No migration file means a fresh environment cannot build these two tables from migrations alone; worth resolving before deploy.
- Budget rule changed during the build and is now settled in code but not yet in the spec: an even split of the 10 second budget gives each of twelve models under a second, so each object attempt uses the time left up to a six second cap, and streaming uses its own 120 second budget for the five step tool loop. The spec's Key invariants still say an even split, and it still prescribes rounding XAF per ledger row, which is what inflated totals before run 3. Both spec lines want a `/solution-architect AI model chain` pass.

### 7. Design system and UI toolkit convention · GA
The tokens and the rounded radius are a real asset every kit would replace, so keep them. Document a rule: shadcn and AI Elements are the default, components are owned locally and customised, and a new primitive is built only where shadcn genuinely lacks one. Also switch the shadcn base off the slowing Radix fork and record which of the twenty three unused AI Elements come in.
**Done when:** `docs/research/ui-toolkit.md` §7 is turned into a written convention, the shadcn base is current, the custom primitives the rebuild needs exist as owned components, focus rings pass contrast, no screen hand rolls a control that shadcn already ships, and the responsive contract for every breakpoint is written down once rather than invented per screen.
- [x] Design it (spec): [0004](../specs/0004-design-system-and-ui-toolkit-convention/index.md) · a cross cutting standard: Radix base retained, the token and control rules, a CI check with a legacy baseline, a gallery plus axe scan, 6 new primitives, the AI Elements prune, and the AI SDK bump
- [x] Build it: /feature-build design system and UI toolkit convention
  - [x] The rule and the guardrails: `docs/design-system.md` written, `AGENTS.md` pointed at it, `components.json` style kept `radix-nova` because the base stays Radix (amended AC-2)
  - [x] The gate: `pnpm ui:check` over 4 pinned rules with a committed baseline, the inventory file, and the Playwright plus axe harness in CI (satisfies AC-4, AC-6, AC-7, AC-13)
  - [x] The Radix polish pass: focus contrast fixed (full opacity `ring-ring`), tokens and radius protected, primitives documented in the inventory, no base port (satisfies AC-2, AC-3, AC-8)
  - [x] The cleanup: 6 new primitives added, markdown renderer added, dead AI Elements pruned (kept code-block and shimmer for reasoning/tool), referral overlay converted, `--spacing` deleted (satisfies AC-9, AC-10, AC-11, AC-12)
- [x] Verify it: /verify-release design system and UI toolkit convention
- [x] Test it: /test-engineer design system and UI toolkit convention
- [ ] Review it (fresh model): /peer-review design system and UI toolkit convention
- [ ] Document it: /tech-writer design system and UI toolkit convention

(basis: research/ui-toolkit.md · forty six of fifty five UI files have diverged from upstream, which is right for design and fatal for future accessibility fixes, so the convention must say rebase rather than drift)

**Reading order.** Features 5 and 6 live in [Pivot](pivot.md), which is the second file in the foundations block. They are numbered in the index so the foundations read as one sequence, but their sections are not duplicated here.

### 8. URL state convention · in-progress (rollout landed, verify queued)
`nuqs` is installed, wired, and then ignored: three call sites, all auth, while tabs and pages sit in component state on twelve admin and dashboard screens. Make the URL the single home for anything a student can share or go back to.
**Done when:** tabs, pagination, sort, filters and open modals live in the URL on every screen that has them, back and forward behave, and the shared parser types check without casts.
- [x] Adopt the convention: `/feature-build URL state convention` · spec [0007](../specs/0007-url-state-convention.md) · all screens converted: shared schema repair (integer page and limit, casts gone) plus `correctionsForKeys` canonical pass plus leaderboard, admin users, admin metrics (10 keys), admin affiliates (4 dialogs), admin subscriptions, admin feedback, admin plan upgrades, quizzes search, note tabs, upload dialogs, subscription tabs plus upgrade dialog · descriptors plus server caches under `nuqs/`, search input `components/url-search-input.tsx`, inventory `docs/specs/0007-route-inventory.md` (zero planned rows left) · typecheck green, lint shows pre-existing diagnostics only, 43 tests green, full build green · suggested next: `/verify-release` the full matrix, then `/test-engineer` for the new screens, then mark done

### 9. Environment variables documented
Forty six variables are read across the app. Five are stale, three of them sitting in the live `.env` doing nothing, and one of those is a real OpenAI key worth revoking. Two template files disagree with each other. Consolidate into one well commented `.env.example` with per provider signup instructions.
**Done when:** one template file, every variable the code reads is in it, stale ones are gone, and each entry says what it is for, its format, whether it is safe to publish, and where to get it.
- [x] Write the template: `/feature-build environment variables documented` · code in `.env.example` (`example.env` deleted, single template)

### 10. Database indexes and query rewrites · in-progress · GA
Leaderboards run a count per view, admin metrics recompute from raw events with up to sixty two queries per request, and there are genuine N plus one loops in the stats route. The exam endpoint that used to return whole question rows with answers attached is deleted with the pivot.
**Done when:** the exact composite indexes exist for every leaderboard sort key and every lookup path, counts and metrics come from rollups rather than live aggregation, and no request runs an unbounded query or a loop with a query inside it.
- [x] Design it (spec): [0008](../specs/0008-database-indexes-query-rewrites.md)
- [ ] Build it: /feature-build database indexes and query rewrites · code in `scripts/db-indexes/`, `app/api/leaderboard/route.ts`, `app/api/usage/route.ts`, `app/api/quizzes/attempts/route.ts`, `app/api/admin/metrics/route.ts`, `app/api/admin/users/route.ts`, `app/api/community/posts/`, `app/api/search/route.ts`, `app/api/readiness/route.ts`, `lib/kpi.ts`, `lib/readiness.ts`, `prisma/schema.prisma`
  - [x] Harness plus leaderboard slice (covers AC-10, AC-1)
  - [x] Usage plus quiz race plus per user indexes (covers AC-2, AC-7, AC-8, AC-9)
  - [x] Admin metrics plus users plus analytics indexes (covers AC-3, AC-4, AC-8, AC-9)
  - [x] Community plus search plus final proof (covers AC-5, AC-6, AC-8, AC-9, AC-10, AC-11)
- [x] Verify it: /verify-release database indexes and query rewrites
- [x] Test it: /test-engineer database indexes and query rewrites
- [x] Review it (fresh model): /peer-review database indexes and query rewrites
- [x] Document it: /tech-writer database indexes and query rewrites

(basis: research/performance-and-database.md §1 · every recommendation carries exact DDL with column order, so this is design plus execution, not judgement)

### 11. Background work moved to Inngest · done
Slow work sits inside request handlers: quiz submit grades every question with an AI call in the request, upload triggers a blocking one time pass code sign up, and OTP email send blocks sign up and swallows its own errors. Move it all to jobs so a request only enqueues.
**Done when:** no AI call, PDF extraction, email send, or PDF render runs inline in a request handler, every job has a trigger, a retry policy and an idempotency key, and a failing job does not fail the user action that queued it.
- [x] Design it (spec): [0009](../specs/0009-background-work-moved-to-inngest.md)
- [x] Build it: /feature-build background work moved to Inngest
  - [x] Email background jobs (covers AC-4, AC-6)
  - [x] AI quiz and note processing jobs (covers AC-1, AC-2, AC-6)
  - [x] Chat title and admin report PDF jobs (covers AC-3, AC-5, AC-6)
- [ ] Verify it: /verify-release background work moved to Inngest
- [x] Test it: /test-engineer background work moved to Inngest

### 12. Caching and cold start speed · in-progress (built, verified)
The chat route makes about ten serial round trips before it starts streaming. There is no caching anywhere, and the AI cache is an unbounded in memory map that is per instance on a serverless deploy. The title call no longer blocks the first token, which has already moved to an Inngest job.
**Done when:** a new chat starts streaming within the agreed budget, the title call no longer blocks the first token, cache hits are shared across instances, and the heaviest routes answer from cache with revalidation.
- [x] Design it (spec): [0010](../specs/0010-caching-and-cold-start-speed/index.md)
- [x] Build it: /feature-build caching and cold start speed · code in `lib/cache/`, `lib/query-families.ts`, `app/api/ai/chat/route.ts`, `lib/prompts/loader.ts`, `lib/ai/orchestrator.ts`, `lib/inngest/cache-cleanup-functions.ts`, `providers/QueryProvider.tsx`, `hooks/`, `prisma/schema.prisma`
  - [x] Chat critical path plus the timing columns (covers AC-1, AC-2, AC-3, AC-4, AC-5, AC-20, AC-22) · code in `app/api/ai/chat/route.ts`, `lib/prompts/loader.ts`, `lib/ai/usage.ts`, `prisma/migrations/20261016090000_add_chat_first_byte_columns/`
  - [x] Client cache convention plus the dashboard prefetch (covers AC-14, AC-15, AC-16, AC-17, AC-18, AC-19) · code in `lib/query-families.ts`, `providers/QueryProvider.tsx`, `hooks/`, `lib/dashboard-data.ts`, `lib/api-client.ts`, `app/(dashboard)/dashboard/`
  - [x] Shared cache substrate, table plus module plus prune job (covers AC-6, AC-8, AC-9, AC-10) · code in `lib/cache/`, `lib/inngest/cache-cleanup-functions.ts`, `lib/ai/orchestrator.ts`, `lib/platform-settings.ts`, `app/api/inngest/route.ts`, `prisma/migrations/20261016100000_add_app_cache_table/`, `tests/lib/cache/store.test.ts`
  - [x] AI cache behaviour, keys, purge, credit skip, hit logging (covers AC-7, AC-11, AC-12, AC-13, AC-21, AC-22) · code in `lib/ai/orchestrator.ts`, `lib/ai/index.ts`, `lib/inngest/functions.ts`, `lib/cache/`, `app/api/admin/cache/purge/route.ts`, `prisma/migrations/`
- [x] Verify it: /verify-release caching and cold start speed
- [x] Test it: /test-engineer caching and cold start speed

(basis: research/performance-and-database.md §4 and research/chat-experience.md §5 · the budgets are published and cheap to hit, but only if the serial round trips go)

### 13. Email system rebuild · GA
Fifteen templates are inline literals in one thousand lines, the sending domain's SPF allows Google only so nothing else can send, gradients render white on white in Outlook, only three templates escape user content, and the weekly digest is a one shot email because of a uniqueness constraint. Rebuild the whole set on a real template system with the logo inlined, not attached.
**Done when:** SPF, DKIM and DMARC are correct for the new sender, every template escapes its inputs, the logo inlines as a content ID image, each email has a preheader and a plain text alternative, the weekly digest repeats, and no send blocks a request.
- [x] Design it (spec): `/solution-architect email system rebuild`
spec ../specs/0011-email-system-rebuild/index.md

- [x] Build it: /feature-build email system rebuild · code in `lib/email/`, `lib/inngest/`, `prisma/schema.prisma`, `app/api/webhooks/`
  - [x] DNS + transport + verification pipeline (covers AC-1, AC-5) · transport + Inngest enqueue done; DNS publish pending domain confirmation
  - [x] Bug fixes + escaping + core templates (covers AC-2, AC-3, AC-6) · new template system escapes all inputs; logo asset pending
  - [x] Payments + welcome + campaigns (covers AC-2, AC-3, AC-4, AC-6)
  - [x] Inngest conversion + suppression (covers AC-5, AC-7)
  - [ ] Warm up + monitoring (covers AC-1, AC-7) · Postmaster Tools + DMARC review pending
- [ ] Verify it: /verify-release email system rebuild
- [x] Test it: /test-engineer email system rebuild (12 tests across 3 files: webhook, templates, unsubscribe; all passing)
- [x] Review it (fresh model): /peer-review email system rebuild (findings in docs/reviews/2026-10-17-email-system-rebuild.md; Changes requested: 4 majors)
- [x] Document it: /tech-writer email system rebuild (PR #56 body updated)

(basis: research/email-system.md · Cameroonian law requires prior consent for email prospecting, so the digest becomes opt in rather than a default)

### 34. Rendering strategy and streaming boundaries · GA
Four layouts block the entire page, including the navigation, on a database call before anything paints, so a student sees a white screen for a second or three on every navigation. Three public pages ship a hydration of the whole page for one form or one accordion, and no signed in surface carries a noindex rule of its own.
**Done when:** every route has a written rendering decision, the four blocking layouts paint their chrome immediately with no database call, every gate that has to answer before the first byte lives in proxy.ts and fails open rather than looping, /pricing, /contact and /faq arrive as plain server pages whose only client surface is a named island, every signed in surface carries noindex through one helper, and no route pays for a render, an API call and a hydration it does not need.
- [x] Design it (spec): `/solution-architect rendering strategy and streaming boundaries`
spec ../specs/0012-rendering-strategy-and-streaming-boundaries/index.md

- [x] Build it: /feature-build rendering strategy and streaming boundaries · code in `proxy.ts`, `lib/metadata.ts`, `lib/prisma.ts`, `constants/plans.ts`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/chat/layout.tsx`, `app/(admin)/layout.tsx`, `app/(auth)/layout.tsx`, `app/(onboarding)/onboarding/layout.tsx`, `app/(marketing)/pricing/`, `app/(marketing)/contact/`, `app/(marketing)/faq/`, `app/primitive-gallery/page.tsx`, `components/marketing/pricing-plans.tsx`, `components/marketing/contact-form.tsx`, `components/marketing/faq-accordion.tsx`, `components/primitive-gallery.tsx`
  - [x] Move the dashboard gate into proxy.ts and strip the dashboard layout to a shell, so the first thin slice runs gate to paint (covers AC-2, AC-3, AC-4, AC-5)
  - [x] Move the chat, onboarding and admin gates, exempt /admin/accept-invite, make the role redirect absolute, and drop the duplicate page redirect (covers AC-4, AC-6, AC-13)
  - [x] Add the noindex helper and apply it to every signed in surface (covers AC-7) · also covers /primitive-gallery, which the table prescribes and the first build missed
  - [x] Turn /pricing, /contact and /faq into server components with named islands and their own metadata (covers AC-8, AC-9, AC-10)
  - [x] Walk the per route table against the code and record the before and after timings (covers AC-1, AC-11, AC-12) · the walk and the timings are recorded in the spec's verify.md and AC-12 is proven by grep. AC-1 needed the table amended, done in the 2026-10-17 architect pass: eleven authed routes and /onboarding prerender static where the table said dynamic, the two card images and the 404 page were unclassified, and the admin row miscounted its own routes. All 44 routes the build emits are now classified and the table matches the manifest
  - [x] Land AC-14 and AC-15, the two criteria the architect pass added on 2026-10-17 (covers AC-14, AC-15) · `lib/prisma.ts` now carries `max: 5`, `idleTimeoutMillis: 10_000` and `connectionTimeoutMillis: 5_000` beside the existing `statement_timeout`, and the build is clean. AC-14 was already holding and was confirmed: no Prisma in any authed `page.tsx`, and all 24 prerendered authed documents are free of any per user string (`/dashboard` has no HTML because it is the one dynamic authed route, as the spec says). One thing the spec got wrong: it assumes two pools per instance, and measurement under a concurrent burst shows three, because `lib/prisma.ts` builds the adapter at module scope while the client is the only thing memoised, so each bundle instance opens its own pool of 5, for a ceiling of 15 rather than 10
- [x] Verify it: /verify-release rendering strategy and streaming boundaries
      (verified 2026-10-19 against a fresh production build and the local database: 15 acceptance criteria met, one command in the spec's verify.md left open because it needs a rebuild to attribute `idleTimeoutMillis` to our value rather than to `pg`'s own default)
- [x] Test it: /test-engineer rendering strategy and streaming boundaries
      (156 tests: 141 across 19 Vitest files, plus 15 Playwright flows in `e2e/public-pages.spec.ts` and `e2e/pricing-subscribe.spec.ts`, tracing to AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13, AC-14 and AC-15. The gate, the four layout shells, the three public pages, the two client islands, the subscribe flow in a real browser and the route table against the build manifest are all covered. The suite also found and fixed three things outside this feature: the landing page pointed at two Mobile Money logo files that did not exist, the dark theme primary was white on a purple at 4.12 to 1 so no primary button met WCAG AA, and four AI chain tests plus one contact test were written against a contract the code had already moved on from)
- [x] Review it (fresh model): /peer-review rendering strategy and streaming boundaries
      (reviewed 2026-10-19 by glm-5.3-flash-free over the uncommitted working tree, 54 files: verdict Changes requested, no blockers, two majors. The FAQ accordion cannot collapse anything because the answers are force mounted with no rule to hide the closed ones, so all 18 answers sit permanently open on a public page, and the pricing cards ship "per/month" plus a meaningless "Semester · /month" row. Findings in docs/reviews/2026-10-19-rendering-strategy-and-streaming-boundaries.md)
- [x] Document it: /tech-writer rendering strategy and streaming boundaries
      (written 2026-10-19: a PR description for the change, grounded in the working tree diff, the spec's verify.md and the peer review, with the two open majors and the flat timing result stated plainly rather than smoothed over)

(basis: research/seo-and-rendering.md §6 · a student arriving from a search result on a phone has one job, see what this is, and the current shape makes them wait for JavaScript to do it. The catalogue and the landing page fetch that §6 was written against were both removed by the pivot, so the decision was rewritten to cover the app that exists)

### 35. Loading states and perceived speed · in-progress
There are no route level loading boundaries anywhere, so any slow layout shows nothing at all. Fifteen skeleton render sites and seventy eight spinner render sites sit inside client components where they do not help, and a long AI answer cannot honestly be a skeleton because a student reads that as broken.
**Done when:** every route that can be slow has a boundary that shows something honest, a shape matched skeleton appears at once and no spinner appears for any wait, a skeleton appears only where the shape is genuinely known, the AI answer streams into place rather than sitting behind a placeholder, and no loading state can read as a lost answer.

NOTE: But if we actually need loading states, we are going to prioritize the shadcn ui rule and make use of skeletons only, not just blocking the whole page with some loading boundary but display what doesn't truly needs loading and bor ui components, or cards or sections or any button or text or icons or any shit that needs loading, we will prioritize using shadcn skeletons to make the ui more modern like most modern top notch uis and ux like on chatgpt, claude, youtube, etc...
- [x] Design it (spec): [0013](../specs/0013-loading-states-and-perceived-speed/index.md)
- [x] Build it: /feature-build loading states and perceived speed · code in `components/ui/pending-region.tsx`, `components/ui/process-progress.tsx`, `components/ui/read-notice.tsx`, `components/ai-elements/streaming-caret.tsx`, `components/layout/RootFallback.tsx`, `lib/read-state.ts`, `lib/note-stages.ts`, `lib/api-client.ts`, `hooks/useNotes.ts`, `hooks/useQuizzes.ts`, `hooks/useCommunity.ts`, `hooks/useUserStats.ts`, `hooks/useChat.ts`, `hooks/useReadiness.ts`, `lib/inngest/functions.ts`, `prisma/schema.prisma`, `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(admin)/layout.tsx`, `app/(auth)/layout.tsx`, `app/(dashboard)/dashboard/`, `app/(dashboard)/quizzes/`, `app/(dashboard)/community/`, `app/(dashboard)/leaderboard/`, `app/(dashboard)/progress/`, `app/(dashboard)/upload/`, `app/(dashboard)/notes/[id]/`, `app/(dashboard)/quizzes/[id]/`, `app/(admin)/admin/`, `app/(auth)/`, `app/error.tsx`, `app/global-error.tsx`, `components/chat/`, `scripts/check-ui-conventions.mjs`, `scripts/loading-allowlist.json`, `scripts/measure-perceived-speed.ts`, `docs/nuqs-setup.md`
  - [x] The shared primitives and the checker rule in report mode: the region component, the refresh bar, the process progress, the dim token, the reduced motion path, the named network failure, the allowlist and the new rule in `scripts/check-ui-conventions.mjs` (covers AC-1, AC-2, AC-3, AC-15, AC-17, AC-21, AC-22) · `components/ui/pending-region.tsx` holds `PendingRegion`, `RefreshBar` and `useLongWait`, `components/ui/process-progress.tsx` holds `ProcessProgress` and `ProgressLine`, `components/ai-elements/streaming-caret.tsx` holds the caret, `lib/api-client.ts` raises `NetworkError` when the request never got a response, and the dim token is `--content-dim-opacity` exposed as `opacity-content-dim`
  - [x] The dashboard, the auth screens and the student list surfaces, with the previous data kept on screen and the query policy for the list hooks (covers AC-1, AC-4, AC-5, AC-6, AC-7, AC-14, AC-16, AC-20) · the dashboard gets the only route level loading file in the app, the auth screens render the form at once, the root `Suspense` gets the neutral shell, the four named list hooks keep the previous data through `keepPreviousData`, and the id keyed hooks still show a shape
  - [x] The process surfaces: the migration adding the note stage, the job that writes it, the upload percentage and the stage list, and the plain line past ten seconds (covers AC-8, AC-9, AC-10, AC-11) · the migration `20261019120000_add_note_processing_stage` is applied and the column and the enum are live in the database, `processNote` writes `EXTRACTING`, `SUMMARIZING` and `INDEXING` and clears the stage when it finishes, the upload shows the real byte percentage, and the note screens show the stage list
  - [x] The chat, the admin console, the failure states and the public surfaces (covers AC-12, AC-13, AC-15, AC-16, AC-18, AC-19) · the thinking line sits inside the bubble and the first token replaces it, the caret sits at the end of the last line, a failed answer shows a plain line and a retry, all seven admin metrics panels have their own skeleton, the global error page is styled with a retry, and the marketing navigation renders the signed out buttons while the session resolves. AC-19 needed the nuqs adapter and the boundary moved out of the root layout and into the route group layouts, because the adapter reads the search params and a read of the search params made the whole document render on the client, so the public pages shipped no content at all. The rule is written into the root `AGENTS.md` and explained in `docs/nuqs-setup.md`
  - [x] The sweep of every spinner site, the switch from reporting to failing, and the proof: unit tests, the browser test and the throttled phone run (covers AC-3, AC-22, AC-23, AC-24) · every one of the 78 spinner render sites is gone, `pnpm ui:check` now fails on a new spinner, 596 unit tests pass across 68 files with 19 of them new, the browser test is in `e2e/loading-states.spec.ts`, and the throttled run is `scripts/measure-perceived-speed.ts`. The run is recorded in `docs/performance/perceived-speed.md`: the largest contentful paint on the landing page went from 1076 ms to 668 ms and on the pricing page from 652 ms to 340 ms, because the public pages now render their content into the document, and the layout shift stayed at zero on every page
- [x] Verify it: /verify-release loading states and perceived speed
      (verified 2026-10-21 against a production build, the local database, the Inngest dev server and a real browser. Twenty of the twenty four acceptance criteria were met with evidence in the running app: the shape of the wait appears 70 ms to 130 ms after the request on every student screen, the previous rows stay on screen at 0.62 opacity with the thin bar while a student refresh runs, the background poll dims nothing, the job writes the stage the interface shows, the plain line appears at twelve seconds and not at four, the thinking line sits inside the bubble, a dropped connection gives "The connection dropped" with a working retry, all seven metrics panels and all eight other admin pages draw their own shape, the public pages ship their content in the document, and the measured numbers reproduced at 684 ms, 308 ms and 288 ms with no layout shift. Four things could not be proven and are written up in the spec's verify.md: the upload byte percentage, because the UploadThing token in `.env` is rejected by the service, the streaming caret, because the app server cannot reach the model provider, the global error page, because no runtime path into it was found, and the sign in form, which is not in the first document. Five findings are recorded there too: a failed note never names the stage it failed in, a spinner sits in the disabled button of a quiz that is still being written, the session wait carries no busy flag, `pnpm ui:check` fails on eight violations that also fail on `main`, and the model chain names a model that no longer exists)
- [x] Test it: /test-engineer loading states and perceived speed

(basis: research/seo-and-rendering.md §7 · the thresholds are published and cheap to hit, the rule that matters is the last one, a loader inside a timed exam is a correctness risk not a polish item)

### 42. Slow screen telemetry · from spec 0013
Nothing records which screens are actually slow, so the next round of work guesses. Spec 0010 records first byte timings for the chat, and the same idea applied to a screen load would show which surfaces a student waits on.
**Done when:** a slow first load is recorded server side with the route, the milliseconds and the source of the percentile, a dashboard shows which surfaces are slowest, and a record is kept of what the numbers were before a change.

NOTE: Forget about the instructions above. After thourough review with my team, I discovered that we have already setup, sentry in this project and we think it should be able to handle this issue. So research, think and tell us what's best and we can mark this scope as complete if okay
- [x] Settled on Sentry, researched and checked against the running app on 2026-10-21. No new spec and no new table is needed, because Sentry already holds the three things this row asks for, but only half of it is alive today.
  - What Sentry already gives us, with no code: the server side of the SDK is live. A route handler that fails produces an envelope to Sentry, which was seen on the wire during the verification run. The Next.js instrumentation names each server render and each route handler as its own transaction, so the route, the milliseconds and the percentile are already recorded, and Sentry computes the percentiles itself, so the source of the percentile is Sentry rather than a table we would have to build. A dashboard in Sentry shows the slowest surfaces as a p95 of the transaction duration by route, and keeps the numbers over time, so the record of what the numbers were before a change is the history Sentry already stores, plus a release marker for the change.
  - What is missing, in three pieces. First, the browser half of Sentry never starts. There is no `instrumentation-client.ts`, so `sentry.client.config.ts` is never imported, and the client bundle carries no Sentry SDK at all. The page load transactions, the Web Vitals by route and the session replay that the client config asks for are all off, and the `Sentry.captureException` in the global error page does nothing. That is one file, no new package. Second, the sample rate is thin. `tracesSampleRate` is 0.1 in production, which is right for a product with traffic and wrong for this one, where a p95 per route needs weeks of samples to mean anything. At this traffic the whole product is well under a hundred thousand requests a month, so 1.0 is affordable. Third, no dashboard exists yet, which is a Sentry side task and no code.
  - What Sentry does not replace: the throttled phone run stays. It measures the public pages on a simulated phone on a build machine, which bounds the improvement. Sentry measures real devices in the field. They answer different questions and the row wants both.
  - So this row closes on Sentry, with the three pieces above as the follow up: add `instrumentation-client.ts`, raise the sample rate for this traffic, and build the dashboard with a p95 by route widget and a Web Vitals by route widget. The build of those three pieces is small enough to belong to the design system row or to a small row of its own, and the dashboard widget names should be written down when it is done.

(basis: spec 0013 follow-up · the measurement the spec does add is one throttled run, which bounds the improvement rather than measuring it)

### 41. Data route caching with revalidation · from spec 0010
Catalog, platform settings, readiness, and leaderboards are read on nearly every request and change rarely, so each one costs a query that arrives with the same answer it gave a minute ago. Spec 0010 deferred this deliberately so its own hit rate could be measured first.
**Done when:** catalog, platform settings, readiness, and leaderboard reads come from cache with a written tag, every mutation that writes them invalidates that tag from inside the mutation, and a student never sees stale settings after an admin saves.
- [ ] Design it (spec): `/solution-architect data route caching with revalidation`

(basis: research/performance-and-database.md §3.1 and §3.2 · the tags and lifetimes are already tabulated there, this feature executes the table)

## Cross cutting

### 33. Mobile responsiveness and device quality
Over ninety percent of our students have no laptop. Most of what we build is read on a two gigabyte Android phone, on a congested mobile network, often on a phone shared with someone else. This is a standing bar rather than a slice: every feature from 14 to 32 is measured against it.
**Done when:** every screen works from a 360 pixel wide phone up to a desktop, no control is smaller than a comfortable thumb target, nothing important needs hover, the layout survives a long unbroken name or a pasted paragraph, text stays readable when the phone is at its largest font setting, safe areas are respected on notched devices, and no page ships a bundle heavy enough to cost the student real money to load.
- [ ] Design it (spec): `/solution-architect mobile responsiveness and device quality`

(basis: research/design-reference.md and research/audience-and-market.md · the design target is a 2 GB RAM 32 GB Android device, and a shimmer that repaints continuously is itself a data cost on that device)
