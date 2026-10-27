# TiCLearn

Study platform for Cameroonian university students. Note upload, AI quiz generation from your own notes, Tip the AI tutor, subscription plans paid over Mobile Money, and an admin panel.

## Stack

- **Language / Runtime**: TypeScript 5, React 19.2, Node 18 or newer
- **Framework**: Next.js 16.2.2, App Router, React Compiler on
- **Key dependencies**: Prisma 7 with Postgres via `@prisma/adapter-pg`, better-auth, AI SDK with Google Gemini, Tailwind CSS 4 plus shadcn/ui, Inngest, TanStack Query
- **Package manager**: pnpm

## Build approach

Tracer Bullet. Each slice is built through every layer and works before the next one starts.

## Commands

```bash
# Install
pnpm install

# Dev server (Next.js only)
pnpm dev

# Dev server (Next.js + Inngest + ngrok, recommended)
pnpm dev:all

# Build (generates the Prisma client first)
pnpm build

# Lint and format
pnpm lint
pnpm format
pnpm ui:check

# Tests (Vitest, 64 files under tests/; needs the built Prisma client)
pnpm test --run

# Database
pnpm db:up          # Postgres on 5435, pgAdmin on 5050
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Background jobs
pnpm inngest:start
```

There are tests. Vitest 4 is configured in `vitest.config.ts` and 64 test files live under `tests/`, run with `pnpm test --run`. The suite covers the proxy, the landing honesty rules, the route table and the loading states, and it needs a build for the route table test (it stands down when `.next/app-path-routes-manifest.json` is missing).

## Rules

- The request guard is `proxy.ts` at the repo root, not `middleware.ts`. Next 16 renamed it. A `middleware.ts` will be silently ignored.
- Import Prisma from `@/lib/generated/prisma/client`, never from `@prisma/client`. The client generates into source and is gitignored, so a fresh clone needs `pnpm db:generate` first.
- Data flows page to hook to API route to Prisma. Server state belongs in TanStack Query with keys from `lib/query-keys.ts`, hooks exported from `hooks/index.ts`.
- This version of Next.js has breaking changes. Read the guide in `node_modules/next/dist/docs/` before assuming any framework behaviour.
- Biome formats and lints: double quotes, semicolons, two space indent, imports sorted. Run `pnpm lint` before committing. The `lint` script only checks, it does not write fixes, so run `pnpm format` too.
- `@/*` maps to the repo root, not to `src/`.
- Tailwind 4 has no config file. Theme tokens live in the `@theme inline` block of `app/globals.css`.
- Money is XAF in whole units, never minor units. Credits are a separate balance from money, tracked through `lib/credits.ts`.
- Do not commit secrets from `.env`. Use `.env.example` for documentation, and keep real keys out of client code.
- When you add a new abstraction, it must replace an existing one for a clear slice, not sit beside it. Two competing patterns for the same job is how the drift in this repo started.
- A spinner is not a loading state. In the student app and the admin console, a region that is waiting for its first data shows a shape matched skeleton, content that is already on screen stays on screen and dims a little with a thin bar at the top, a process shows a bar with a real number, and a long answer streams in with a caret. The only spinner allowed is inside a button that is performing the student's own action. `pnpm ui:check` reports every `Loader2` or `Loader` outside `components/ui/` and `components/ai-elements/` that is not inside a `Button`; a file that keeps one needs an entry in `scripts/loading-allowlist.json` with a one line reason.
- The nuqs adapter and the `Suspense` boundary live in the route group layout, never in the root layout. The adapter reads the search params, and a read of the search params makes the whole client tree above it render on the client, so a root level adapter takes the prerendered public pages down with it. A new route group that reads the URL needs `<Suspense fallback={...}><NuqsAdapter>...</NuqsAdapter></Suspense>` in its own layout, with the boundary outside the adapter. A group created fresh, and not as a child of another layout, needs its own. See [docs/nuqs-setup.md](docs/nuqs-setup.md).
- Keep the implementation summaries at the bottom of this file current as work lands.

## Context files

- [lib/ai/AGENTS.md](lib/ai/AGENTS.md): AI model calls, the task registry, chat tools, and the cache
- [app/api/AGENTS.md](app/api/AGENTS.md): route handler conventions, auth checks, plan limits, webhooks
- [prisma/AGENTS.md](prisma/AGENTS.md): schema layout, the two parallel mock families, migrations, seeding
- [docs/nuqs-setup.md](docs/nuqs-setup.md): the nuqs adapter and the Suspense boundary, per route group
- [HACKATHON.md](HACKATHON.md): Meta Global AI Developer Hackathon build record — pre-existing vs new work, Meta model usage, Baseten visual analysis, demo paths

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:implementation-summary -->
# Paper 3 Exam System - Implementation Summary

## Goal
Implement comprehensive Paper 3 exam system with subscription-based monetization, anti-cheat enforcement, and AI-powered evaluation.

## Constraints & Preferences
- Retakes: PREMIUM only (unlimited)
- Shareable card: STANDARD+ only; analytics: PREMIUM only
- Auto-submit after 2 tab violations; fullscreen required
- AI chat: 4 messages for FREE/STARTER (preview), unlimited for STANDARD/PREMIUM
- FREE: 1 exam ever (not per-month)
- STARTER: 3 exams/month with retakes, 4 AI messages
- Show upgrade modal with no way to leave when free exam exhausted

## Progress
### Done
- Applied isHtmlQuestion() to practice and exam pages
- Added ProcessingStatus enum + feedbackMd/codeExplanation fields to Prisma schema
- Created lib/inngest/paper3-exam-functions.ts for async AI evaluation
- Updated submit route to dispatch Inngest event
- Enhanced result page with polling (5s), markdown rendering, HTML preview
- Improved leaderboard with 3 tabs (Quiz, Paper3-Exam, Paper3-Global)
- Added ReactMarkdown to the exam assistant component
- Removed WEB_PROGRAMMING from taskTypesWithoutInput (requireAnswer=true)
- Added ALGORITHM_PSEUDOCODE to code editor case with HtmlPreview
- Updated view-answer API to return correct answers array
- Added expectedAnswer to feedbackMd for wrong answers
- Added Paper3 limits to usePlan.ts (paper3ExamLimit, paper3RetakeLimit, paper3AIExamMessages, canViewCorrectAnswers, canAccessPaper3AI, canShareResults)
- Added Paper3 usage tracking to useUsage.ts and app/api/usage/route.ts
- ExamAssistant component with 4-message limit for FREE/STARTER (unlimited for STANDARD/PREMIUM)
- View Previous Result button on practice page (conditional based on previous attempts)
- Fullscreen enforcement with 3-second warning before auto-submit on exit
- Upgrade modal when free exam limit exhausted (no exit route)
- Attempt-level message limit tracking for AI chat
- Gated retake button (PREMIUM only)
- Gated view correct answers (STANDARD+ only)
- Shareable result card system (shareId field, public page at /result/[shareId])
- Fixed fullscreen requestFullscreen() to be called from user gesture (handleStart) instead of useEffect

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Fullscreen required; exit = auto-submit with 3-second warning
- AI assistant in exam page only (no AI during exam, limited messages for FREE/STARTER)
- Result page AI assistant: PREMIUM only
- Shareable link format: /result/[shareId] (everyone can share, analytics PREMIUM only)
- STARTER gets 4 AI messages during exam (same as FREE)
- FREE exam tracked as total count (not per-month)
- Message limit tracked per attempt, not per session

## Next Steps
1. **Run pnpm db:push** to apply Prisma schema changes (shareId, sharedAt fields)
2. **Test share functionality** - verify share button and public result page
3. **Test fullscreen enforcement** - verify exit triggers warning/auto-submit
4. **Test AI message limits** - verify 4 messages for FREE/STARTER

## Critical Context
- Prisma migration was skipped (used db:push); created manual migration to fix drift
- ProcessingStatus enum values needed manual SQL fix (enum existed but had no values)
- AiModel changed from "[previous model]" to "[previous mdel]" in evaluate.ts and chat route
- Fullscreen requestFullscreen() must be called inside user gesture (click handler), not useEffect

## Relevant Files
- `hooks/usePlan.ts`: Paper3 limits per plan tier
- `hooks/useUsage.ts`: Paper3 usage tracking with canTakePaper3Exam, canRetakePaper3Exam
- `app/api/usage/route.ts`: Returns paper3Usage object with monthly tracking
- `app/(dashboard)/practice/exam/[mockId]/page.tsx`: Fullscreen enforcement, rules modal, AI chat with limits
- `components/paper3/` exam assistant: message limit tracking, upgrade modal
- `components/paper3/ExamAssistant.tsx`: Per-attempt AI chat with 4-message limit
- `app/(dashboard)/practice/exam/result/[attemptId]/page.tsx`: Enhanced result display, gated actions, share button
- `app/(dashboard)/practice/page.tsx`: View Previous Result button
- `lib/inngest/paper3-functions.ts`: Removed WEB_PROGRAMMING from taskTypesWithoutInput
- `lib/inngest/paper3-exam-functions.ts`: Added partialCredit field, expectedAnswer in feedbackMd
- `app/api/paper3/attempts/[attemptId]/view-answer/route.ts`: Returns correctAnswers array
- `app/api/paper3/attempts/[attemptId]/share/route.ts`: NEW - Share/unshare API
- `app/result/[shareId]/page.tsx`: NEW - Public shareable result page
- `prisma/schema.prisma`: Added shareId and sharedAt to Paper3MockAttempt
<!-- END:implementation-summary -->

<!-- BEGIN:onboarding-rework -->
# Onboarding & Seed Data - Implementation Summary

## Goal
Redesign onboarding flow for multi-level/multi-program support, seed general secondary (15 subjects) and diploma (8 specialties) exam data, fix AI tool bugs and math rendering.

## Constraints & Preferences
- Onboarding: 60–90 seconds max, one decision per screen, auto-save, 480–520px centered, slide transitions (250–300ms)
- General levels used multi-select subjects (soft cap 4), the diploma level used single-select specialty
- Mobile-first: large tap targets, no-hover-only interactions
- Post-onboarding: AI context includes level, programs, exam date, baselines, weakest program
- Use `gemini-2.5-flash`, Prisma migrations, pnpm

## Progress
### Done
- Fixed `lib/ai/tools.ts:475`: `__standalone__` → `null` for `noteId` in `createQuiz` (foreign key violation fix)
- Fixed `lib/math-format.ts`: added `\[...\]` → `$$...$$` and `\(...\)` → `$...$` to `normalizeMathNotation` (KaTeX rendering fix)
- Added `COURSE` to `ComponentType` in `prisma/schema.prisma`
- Created+applied migration `20260516110019_add_course_component_type`
- Rewrote `prisma/seed.ts`: 15 general subjects (two papers each) + 8 diploma specialties (two years each)
- Ran seed successfully
- Updated `app/api/onboarding/step/route.ts`: removed UNKNOWN fallback, creates empty profile
- Updated `app/api/onboarding/baseline/route.ts`: removed UNKNOWN fallback, creates empty profile
- Updated `app/api/onboarding/readiness/route.ts`: uses full `computeReadiness()` engine instead of simple avg
- Rewrote `app/(onboarding)/onboarding/page.tsx`: 5-step wizard with slide transitions, progress bar, level→programs→exam date→confidence→study plan, final readiness snapshot

## Completed (verified)
- Dashboard guard correctly redirects incomplete profiles (checks `onboardingCompleted`/`onboardingSkipped`)
- AI chat context already surfaces onboarding data via `computeReadiness()` (programs, baselines, exam date)
- Full Next.js build passes with zero errors

## Key Decisions
- Removed UNKNOWN program entirely - profiles created empty, programs added in step 2
- General levels used two paper components per subject; the diploma level used two year COURSE components
- ComponentType extended with COURSE for non-paper structures (diploma semester/module system)
- Readiness uses 3-pillar: 35% baseline + 45% performance + 20% recency
- Level card click = auto-advance (no extra Continue click); Continue button at step 0 is inert (dead code)

## Relevant Files
- `lib/ai/tools.ts:475`: createQuiz noteId sentinel fix
- `lib/math-format.ts`: KaTeX delimiter conversion
- `prisma/schema.prisma`: COURSE enum value
- `prisma/migrations/20260516110019_add_course_component_type/`: migration
- `prisma/seed.ts`: comprehensive general plus diploma seed
- `app/(onboarding)/onboarding/page.tsx`: 5-step wizard
- `app/api/onboarding/step/route.ts`: step save API
- `app/api/onboarding/baseline/route.ts`: baseline save API
- `app/api/onboarding/readiness/route.ts`: readiness compute API
- `app/api/onboarding/topics/route.ts`: topic fetch API
- `app/api/exam-levels/route.ts`: exam levels API
- `app/api/programs/route.ts`: programs API
- `lib/readiness.ts`: 3-pillar readiness engine
<!-- END:onboarding-rework -->

<!-- BEGIN:ai-orchestration-rework -->
# AI Orchestration - Implementation Summary

## Goal
Keep AI calls fast and predictable through OpenRouter: one server-side gateway, an ordered multi-model fallback chain, model health cooldowns, bounded timeouts, and an in-memory cache for tasks whose output does not change.

## How it works now
- OpenRouter is created lazily in `lib/ai/instances.ts`; model IDs are selected by `lib/ai/chain.ts` and `lib/ai/registry.ts`.
- Structured and text calls walk the runnable chain inside the shared deadline. Chat gets a longer 120 second stream budget because tool calls can take several steps.
- `lib/ai/breaker.ts` skips models in cooldown and records transport failures. Streaming can fall back only before its first text token; an active stream stays on its selected model.
- `lib/ai/registry.ts` maps the registered task names to chain policy and cache TTL. `getTaskConfig` throws on an unknown task name, so every new task must be registered.
- `lib/ai/cache.ts` is an in-memory `Map` keyed by a sha256 of the task name plus the prompt or messages. It dies with the process and is not shared across instances.
- `generate` and `streamChat` are the two entry points. `generateTextWithFallback` and `streamChat` callers use them from routes.

## Progress
### Done
- Set a 10 second timeout on every generateObject, generateText, and streamText call
- Added the task registry with per-task cache TTLs
- Added the in-memory sha256 cache in `lib/ai/cache.ts`
- Added `generateCritical` and `generateTextCritical` so critical paths read clearly at the call site

### In Progress
- (none)

### Blocked
- (none)

## Gotchas in this area
- `generateCritical` is a byte identical copy of `generate`, and `generateTextCritical` is a byte identical copy of `generateTextWithFallback`. The `Critical` names are aliases for backward compatibility, not a different behaviour. Do not expect the critical path to skip the cache or the retry; it does neither.
- The normal task chains contain multiple OpenRouter models. The gated Fusion path is intentionally a separate explicit model for admin research and is not a fallback path.
- A live provider test needs `OPENROUTER_API_KEY` in the server process. Unit tests mock the AI SDK boundary and cover model fallback without sending prompts to a provider.
- The old model cache (a working model with a 5 minute TTL and a dead model with a 30 second negative TTL) described in earlier notes does not exist in the code. Ignore any reference to it.
- The `cacheTtlMs` values are long (7 to 30 days) and the cache key is the prompt, so two users asking the same question share a cached answer. That is intended for `summarize`, `quiz_gen`, and the other generation tasks, and is why the grading tasks are set to 0.
- `instances.ts` owns the only provider construction. Do not import a provider directly from routes, jobs or components.

## Relevant Files
- `lib/ai/instances.ts`: lazy OpenRouter-compatible provider
- `lib/ai/chain.ts`: model IDs, deadlines, classification and model construction
- `lib/ai/breaker.ts`: health and cooldown state
- `lib/ai/orchestrator.ts`: generate, streamChat, text generation and fallback walks
- `lib/ai/registry.ts`: task names and cache TTLs
- `lib/ai/cache.ts`: in-memory sha256 cache
- `lib/ai/index.ts`: extraction, summarization, quiz and exam generation, grading helpers
- `lib/ai/tools.ts`: chat tool definitions (web search, notes, quizzes, progress, createQuiz)
- `lib/ai/validators.ts`: `normalizeGeneratedQuestions`
- `lib/paper3/`: Paper 3 evaluation, short answer grading, prompts, subject tasks (separate from `lib/ai/`)
<!-- END:ai-orchestration-rework -->

<!-- BEGIN:muse-baseten-routing -->
# Muse and Baseten model routing (feature 49) - Implementation Summary

## Goal
Add a Muse provider alongside the existing OpenRouter chain so reasoning calls route to Meta Model API (Muse Spark 1.3) and visual analysis calls route to Baseten (muse spark open 1026). The OpenRouter chain stays untouched as fallback.

## What was built
- `lib/ai/instances.ts`: added `muse()` (lazy singleton for Meta Model API, requires `MUSE_API_KEY`) and `baseten()` (lazy singleton for Baseten inference, requires `BAASETEN_API_KEY`)
- `lib/ai/chain.ts`: added `chainMuse(modelId)` which routes `meta-models/` prefixed IDs to Baseten and all others to Meta; added `MUSE_PER_LEG_TIMEOUT_MS` (8 seconds)
- `lib/ai/registry.ts`: added `provider` field to `TaskConfig`; registered `course_analysis`, `question_gen`, `answer_evaluation`, `next_step` (meta/muse-spark-1.3) and `visual_analysis` (baseten/meta-models/muse-spark-open-1026); `resolveChain` bypasses OpenRouter logic for Muse tasks
- `lib/ai/pricing.ts`: added zero-cost pricing for `muse-spark-1.3` and `meta-models/muse-spark-open-1026`; added `MUSE_COST_PER_CALL_XAF` flat rate
- `lib/ai/orchestrator.ts`: `generate` tries Muse first for Muse-registered tasks, then falls through to the OpenRouter chain on failure; per-leg timeout of 8 seconds; usage logged with flat XAF rate
- `.env.example`: documented `MUSE_BASE_URL`, `BAASETEN_BASE_URL`, `MUSE_REASONING_EFFORT`, `MUSE_COST_PER_CALL_XAF` (MUSE_API_KEY and BAASETEN_API_KEY already present)

## Acceptance criteria (all met)
- AC-1: muse() provider exists and lazily initialises
- AC-2: chainMuse() constructs Meta and Baseten clients
- AC-3: muse-spark-1.3 calls route to Meta Model API using MUSE_API_KEY
- AC-4: muse-spark-open-1026 calls route to Baseten at inference.baseten.co/v1 using BAASETEN_API_KEY
- AC-5: No existing OpenRouter call is affected; the OpenRouter chain stays untouched as fallback
- AC-6: MUSE_API_KEY and BAASETEN_API_KEY documented in .env.example
- AC-7: Baseten is used only when visual understanding is useful (visual_analysis task only)
- AC-8: When Meta or Baseten fails, the call falls through to the OpenRouter chain
- AC-9: Routing is decided at task level in lib/ai/registry.ts, transparent to callers

## Key decisions
- Muse tasks bypass the breaker and cache (no cooldown, no shared memory cache)
- Per-leg timeout of 8 seconds is shorter than the 10 second OpenRouter chain deadline, so a slow provider cannot consume the whole budget before fallthrough
- OpenRouter chain code is completely unchanged for existing tasks; provider routing is decided solely by the `provider` field in `taskRegistry`
- Missing `MUSE_API_KEY` or `BAASETEN_API_KEY` degrades gracefully to OpenRouter fallback through a catchable lazy-init error

## Relevant files
- `lib/ai/instances.ts`, `lib/ai/chain.ts`, `lib/ai/registry.ts`, `lib/ai/orchestrator.ts`, `lib/ai/pricing.ts`
- `tests/lib/ai/muse-routing.test.ts` (new, 10 tests)
- `.env.example`
- `docs/specs/0026-provider-aware-routing-meta-baseten.md`
- `docs/scope/hackathon.md` (feature 49 row)

<!-- BEGIN:loading-states-rework -->
# Loading states and perceived speed - Implementation Summary

## Goal
One rule for what a student sees while the app waits, on every student and admin surface. A region with no data shows a shape matched skeleton, content that is on screen stays and dims a little, a process shows a bar with a real number, a long answer streams in with a caret, and no spinner is a loading state anywhere.

## The rule in one paragraph
A region that has no data shows the shape of what is coming, at once, as a skeleton. A region that has data keeps it, dims it a little, and shows a thin bar at its top. A process shows a bar with a real number and the names of its stages. A long answer streams in with a caret. A failed read shows a plain notice and a retry. A spinner is not a loading state anywhere in the student app or the admin console, and the only spinner left in the codebase is inside a button that is performing the student's own action.

## The primitives
- `components/ui/pending-region.tsx`: `PendingRegion`, `RefreshBar`, `useLongWait`, `LONG_WAIT_MS`. The shape is authored next to the screen that uses it. The cross fade is a short fade, and it is instant when the reader has asked for reduced motion.
- `components/ui/process-progress.tsx`: `ProcessProgress` and `ProgressLine`. A process is never a skeleton.
- `components/ui/read-notice.tsx`: `ConnectionNotice` and `ReadFailureNotice`. A lost connection and a server error read differently.
- `components/ai-elements/streaming-caret.tsx`: `StreamingCaret`, hidden from assistive technology.
- `lib/read-state.ts`: `readState`, which turns a query result into the words a region understands. `isPolling` says the app is refreshing the read on its own, and a poll dims nothing and shows no bar.
- `lib/note-stages.ts`: `NOTE_STAGES`, the ordered list the `NoteProcessingStage` enum describes.
- `components/layout/RootFallback.tsx`: the neutral shell, the brand mark and generic blocks, and nothing else.

## The tokens
- `--content-dim-opacity` under `:root`, exposed as `opacity-content-dim` in the `@theme inline` block. That is the dim a region takes while it refreshes.
- The skeleton pulse is stopped by a media query in `app/globals.css`, because a continuous repaint costs data on the phone this project is built for.

## The enforcement
- `scripts/check-ui-conventions.mjs` has a spinner rule. It reports every `Loader2` or `Loader` outside `components/ui/` and `components/ai-elements/` that is not inside a `Button`, and it fails.
- `scripts/loading-allowlist.json` holds the files allowed to keep one, each with a one line reason. It is empty today.
- The rule is written into the root `AGENTS.md`.

## The data model
- `Note.processingStage`, a nullable `NoteProcessingStage` column, written only by the `processNote` job. The enum order is the stage order, so the step count is the index plus one. The migration is `20261019120000_add_note_processing_stage`.

## Gotchas in this area
- **A spinner inside a button is not a loading state.** The checker knows the difference, so a spinner in a submit button is never reported.
- **A poll is not a refresh.** A hook that gets this wrong dims the page every three seconds, which is worse than the flash the feature removes. `readState` takes the poll condition for exactly this reason.
- **The nuqs adapter and the `Suspense` boundary live in the route group layout, never in the root layout.** The adapter reads the search params, and a read of the search params makes the whole client tree above it render on the client, so a root level adapter took the prerendered public pages down with it. `docs/nuqs-setup.md` has the setup for a layout created fresh.
- **`Skeleton` is decorative, so it carries `aria-hidden`.** A screen reader should read the content when it lands, not a row of grey boxes.
- **The ten second clock is the client's own.** It is counted from the moment the wait began, because a phone with the wrong date would otherwise see the line at the wrong time.
- **The quiz deliberately has no stage column.** A quiz is one model call, and the honest indicator for it is a plain line with a time estimate, not a stage list that would be theatre.

## Relevant files
- `components/ui/pending-region.tsx`, `components/ui/process-progress.tsx`, `components/ui/read-notice.tsx`
- `components/ai-elements/streaming-caret.tsx`, `components/layout/RootFallback.tsx`
- `lib/read-state.ts`, `lib/note-stages.ts`, `lib/api-client.ts`
- `hooks/useNotes.ts`, `hooks/useQuizzes.ts`, `hooks/useCommunity.ts`, `hooks/useUserStats.ts`, `hooks/useChat.ts`
- `lib/inngest/functions.ts`, `prisma/schema.prisma`
- `scripts/check-ui-conventions.mjs`, `scripts/loading-allowlist.json`, `scripts/measure-perceived-speed.ts`
- `docs/nuqs-setup.md`, `docs/performance/perceived-speed.md`
<!-- END:loading-states-rework -->

<!-- BEGIN:landing-page-rebuild -->
# Landing page rebuild (feature 14) - Implementation Summary

## Goal
Rebuild the public landing page around the three jobs the product does today, and cut the product back to notes, quizzes and Tip in the same change so the page cannot promise a surface the app does not ship. Governed by `docs/specs/0014-landing-page-rebuild/index.md`.

## What was cut
- Routes and their code: `app/(dashboard)/community`, `leaderboard`, `feedback`, `progress`, `affiliate`, `app/primitive-gallery`, `app/dev/email/[template]`.
- Fourteen uncalled API routes, seven unused components, unused hook exports, `lib/readiness.ts`, `components/pdf/feedback-report.tsx`.
- Eight Prisma models (`Post`, `Comment`, `PostLike`, `Feedback`, `Notification`, `RevisionGuide`, `KnowledgeChunk`, `TopicPerformance`) and three enums, in migration `20261023120000_drop_cut_surfaces`.
- Broken links to `/practice`, `/quiz/[id]`, `/forgot-password` and `/cookies`.

## What was built
- Dashboard is a continue surface: `lib/dashboard-data.ts`, `app/api/dashboard/continue/route.ts`, `hooks/useDashboard.ts`, `app/(dashboard)/dashboard/dashboard-client.tsx`.
- `app/(marketing)/page.tsx`: the 0014 landing page, later rebuilt from the approved mockup by spec 0015 (see below). The free limits still come from `FREE_LIMITS` in `lib/plan-limits.ts`.
- `constants/contact.ts`: one WhatsApp source read by the landing page, the footer, the contact page and the not found page.
- `scripts/check-landing-honesty.mjs`: fetches the built page, strips scripts, and fails on a banned word, a currency amount, a bare percentage, a phone number or missing metadata. Wired as `honesty:check` and `check` (`ui:check && honesty:check`).
- `proxy.ts`: `/notes` and `/attempts` added to `protectedRoutes`, the `/chat` redirects retargeted to `/dashboard`, and the sign-in `callbackUrl` no longer double encoded.
- `prisma/seed.ts`: creates demo account `demo@tic.local` / `TicLearn2026`, an Operating Systems note, a READY quiz, a 2 of 3 attempt and a Tip conversation, plus `public/demo/operating-systems-process-scheduling.pdf`.

## Gotchas in this area
- The screenshots live in `public/marketing/` as WebP under 40 KB each, captured from the seeded demo. The rebuilt page uses `note-view`, `tip-answer`, `quiz-question` and `attempt-result` at 1280 px; the two 375 px captures are kept but unreferenced.
- `next.config.ts` sets `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`, not `DENY`/`'none'`, so the note page can frame its own PDF. Tightening this back breaks the note view.
- The header and footer are shared client components in `app/(marketing)/layout.tsx`; the page file itself imports only the Tip island.
- Pricing is still feature 15's. The page prints no price and links to `/pricing`, and the pricing plan copy no longer names the cut surfaces.
- The global reduced-motion block in `app/globals.css` uses `!important` with a biome suppression comment, because the utilities it overrides live outside the media query.
- When an edit to a component does not appear in the browser, restart the dev server before debugging the code: Turbopack's watcher has missed changes in this environment.

## Relevant files
- `app/(marketing)/page.tsx`, `components/marketing/tip-form.tsx`, `constants/contact.ts`
- `app/(dashboard)/dashboard/dashboard-client.tsx`, `lib/dashboard-data.ts`, `app/api/dashboard/continue/route.ts`
- `proxy.ts`, `next.config.ts`, `app/layout.tsx`, `app/(marketing)/layout.tsx`
- `prisma/seed.ts`, `prisma/migrations/20261023120000_drop_cut_surfaces/`
- `scripts/check-landing-honesty.mjs`, `public/marketing/`
<!-- END:landing-page-rebuild -->

<!-- BEGIN:landing-page-mockup -->
# Landing page mockup rebuild (spec 0015) - Implementation Summary

## Goal
Rebuild `/` section for section from `public/TiCLearn E-Learning Platform Landing Page.png`, keeping the TiCLearn logo, the **Tip** name, the real screenshots and the free limits paid over Mobile Money. The mockup's layout is literal; the pixels and the account limits are ours.

## What changed
- `app/(marketing)/page.tsx` is a thin composition of server sections in `components/marketing/landing/`: `hero`, `benefits`, `how-it-works`, `study-loop`, `subjects`, `get-started`, `faq-section`, `cta-band`.
- `MarketingNav` owns the landing-only announcement strip and the mockup's four anchors: `/#how`, `/#tools`, `/#students`, `/#faq`. `MarketingFooter` now has Product / Support / Legal columns and the Cameroon line.
- The hero has two links and no question box. `components/marketing/tip-form.tsx` is deleted; `/chat?q=` is still handled by `app/chat/page.tsx` for links from elsewhere.
- The free limits and the MTN/Orange Mobile Money line live in the dark CTA band, read from `FREE_LIMITS` in `lib/plan-limits.ts`.
- `public/marketing/attempt-result-1280.webp` is a real capture of the seeded attempt, used in the third how-it-works card.
- `scripts/check-landing-honesty.mjs` no longer bans “progress” or “feedback” (Tip reports study progress, and a quiz shows what was missed). It still bans the cut surfaces, currency amounts, bare percentages and phone numbers.
- `constants/index.ts` no longer claims per-topic mastery or a readiness score in the FAQ.

## Gotchas
- The dark band is `bg-foreground text-background`, not the mockup's navy. Colour stays tokens only.
- The raw `aria-*` rule in `scripts/check-ui-conventions.mjs` applies to new files. Decorative icons in the landing sections carry no aria attribute; only baselined legacy files may.
- The same change deletes `components/referral-processor.tsx`. That dead global client component painted “Setting up your account.” on every page while `useSession` resolved and called the removed `/api/referral/apply`. Sign-in and sign-up no longer read `pendingReferralCode`.

## Relevant files
- `app/(marketing)/page.tsx`, `components/marketing/landing/`
- `components/layout/MarketingNav.tsx`, `components/layout/MarketingFooter.tsx`
- `scripts/check-landing-honesty.mjs`, `tests/app/(marketing)/page.test.tsx`
- `docs/specs/0015-landing-page-mockup/index.md`, `public/marketing/attempt-result-1280.webp`
<!-- END:landing-page-mockup -->

<!-- BEGIN:chat-interface-rebuild -->
# Chat interface rebuild (spec 0020) - Implementation Summary

## Goal
Rebuild the chat around one reading column and one activity line, make the composer stop, grow and preview its files, add suggested questions under the newest answer, and stop gating Tip on an uploaded note. Governed by `docs/specs/0020-chat-interface-rebuild/index.md` (AC-1 to AC-24).

## What was built
- `components/chat/chat-message-list.tsx`: plain answers, the student's message as the only bubble, per message actions (Copy, Regenerate, Make a quiz from this, Edit), the stopped line and the failure line.
- `components/chat/activity-block.tsx` and `lib/chat/activity-labels.ts`: one collapsed line, expandable into ordered steps and `source-*` sources, a plain sentence for a failed step, `Thought for Ns` from the live turn only, the `Working` fallback and a one time server log for an unlabelled tool. `suggestReplies` is silent and never appears as a step.
- `components/chat/chat-composer.tsx`: grows to a maximum then scrolls, Enter sends with a fine pointer, the send control becomes stop while streaming, per file progress, a failed file blocks send, a paste over 6000 characters becomes a text attachment with `Show in text field`, and the draft lives in `sessionStorage` under `ticlearn-chat-draft:<conversationId>`.
- `components/chat/file-preview.tsx`: image lightbox with zoom and a document sheet, never a new tab.
- `components/chat/suggested-replies.tsx`: chips under the newest answer only, read from the live turn, never from a reloaded thread.
- `components/chat/allowance-notice.tsx`: the spent allowance line with the Douala reset time and a plan link.
- `app/api/chat/upload/route.ts`: `handleUpload` token, session, declared type and size checks (8 MB image, 16 MB PDF or DOCX, 4 MB text), 60 second expiry, scoped to `chat/<userId>/`.
- `app/api/ai/chat/route.ts`: message ids written from the client id, edit and retry in one transaction, note context from the conversation, a stopped answer saved with `stoppedAt`, unknown tool logging, and the conversation length check skipped on a rewrite.
- `prisma/schema.prisma`: `ChatMessage.stoppedAt`, migration `20261025072654_add_chat_message_stopped_at`.
- Prompts: `chat_system` v3 (a note is never required, one scoping question for a vague request, `suggestReplies` at the end of a substantive answer), `create_quiz` v3 (`noteId` optional, topic as the card title), new `suggest_replies`.
- `lib/ai/validators.ts`: `sanitizeSuggestions`, which keeps two or three, caps each at 60 characters and strips links, markdown and duplicates.

## Gotchas in this area
- **A stopped answer is detected by a missing finish reason.** A client stop cancels the stream before any finish chunk, so `isAborted || finishReason === undefined` is what a stop looks like on the server. A stop before the first token saves no assistant row.
- **The assistant row keeps the AI SDK message id.** Regenerate and Edit address a row by that id, so a row written in this session is reachable without a reload.
- **Chips exist only for the live turn.** `liveSuggestions` is set in `onFinish` and cleared on send, so a reloaded thread draws the same tool part with no chips. That is intended, not a bug.
- **`ui:check` refuses raw `aria-*` in new files.** A new file takes its accessible name from an `sr-only` span and its disclosure state from `components/ui/collapsible`. The polite live region and the sighted only wrapper live in `components/ui/live-region.tsx`, so the activity line never writes `aria-live` by hand.
- **The spinner rule reaches `animate-spin` too.** The activity line uses a pulsing dot and the composer's stop button uses a square icon, because a spinner is not a loading state.
- **`components/ai-elements/` now holds only what the chat uses**: `conversation.tsx`, `message.tsx`, `streaming-caret.tsx`. The eight replaced primitives were deleted, which also takes shiki out of the chat bundle.
- **The Blob path is unproven live.** `BLOB_READ_WRITE_TOKEN` is documented in `.env.example` and absent from `.env`, so the token route, a 16 MB PDF and the delete cleanup are covered by tests and the type checker only.
- **CSP now allows `https://vercel.com` in `connect-src`** (the SDK's upload host) and `https://*.public.blob.vercel-storage.com` in `img-src`, `connect-src` and `frame-src`. `frame-ancestors` stays `'none'`.

## Relevant files
- `components/chat/` (`chat-thread`, `chat-message-list`, `chat-composer`, `chat-landing`, `activity-block`, `file-preview`, `suggested-replies`, `allowance-notice`, `constants`, `pending-message`)
- `lib/chat/activity-labels.ts`, `lib/chat-messages.ts`, `lib/ai/validators.ts`, `lib/ai/tools.ts`
- `app/api/ai/chat/route.ts`, `app/api/chat/upload/route.ts`, `app/api/chat/conversations/[id]/route.ts`
- `components/ui/live-region.tsx`, `components/ai-elements/{conversation,message,streaming-caret}.tsx`
- `prompts/chat/chat_system.md`, `prompts/tools/create_quiz.md`, `prompts/tools/suggest_replies.md`
- `tests/components/chat-composer.test.tsx`, `tests/components/chat-activity-block.test.tsx`, `tests/components/chat-message-list.test.tsx`, `tests/components/file-preview.test.tsx`, `tests/components/live-region.test.tsx`, `tests/components/suggested-replies.test.tsx`, `tests/lib/ai/suggestions.test.ts`
<!-- END:chat-interface-rebuild -->

<!-- BEGIN:chat-polish -->

# Chat polish, conversation titles, onboarding selects, sidebar - Implementation Summary

## What changed
- **A question is edited in place.** `components/chat/chat-message-list.tsx` renders a `QuestionEditor` in the question's own row (Save, Cancel, Escape, Return on a fine pointer). Saving calls `handleEditSubmit` in `chat-thread.tsx`, which sends the message id through both the AI SDK envelope and the `editMessageId` body field. The composer no longer prefills for an edit, and `replaceWarning` / `onCancelReplace` / the draft-before-replace machinery are gone.
- **The composer clears at once.** `handleSubmit` in `chat-composer.tsx` clears the text, attachments, notice and draft storage before calling `onSubmit`, so the box is empty while the answer is still streaming. A rejected send is put back through the `restore` prop.
- **Conversation titles land.** `lib/chat/title.ts` holds `provisionalChatTitle`, `cleanGeneratedTitle` and `isReplaceableTitle`. The chat route writes a provisional title from the first message before the stream starts and enqueues the Inngest job with it. The job cleans the model's title and skips a title the student renamed by hand. The thread refetches the conversation list once more after four seconds.
- **The streaming caret no longer blinks.** `components/ai-elements/streaming-caret.tsx` is a steady bar, and the CSS in `app/globals.css` keeps it on the direct last paragraph only, so a list or blockquote cannot draw several.
- **Onboarding uses the Radix select.** The university, faculty and goal controls in `app/(onboarding)/onboarding/page.tsx` are `components/ui/select.tsx`, with a `Label` bound to each trigger.
- **The sidebar account group is gone.** Subscription and Settings sit in the same plain list as Home, Upload and Quizzes in `components/layout/AppSidebar.tsx`; the admin group is unchanged.

## Gotchas
- `lib/chat/title.ts` is imported by both the route and the Inngest job. The job compares the stored title with the provisional one it was given, so a rename made while the job runs is never overwritten.
- The provisional title is written before the stream starts, so the first `chatConversations` invalidation already shows a real name. The model's refinement arrives later and is picked up by the delayed refetch.
- The caret test still mocks `motion/react`; the component no longer imports it, and the mock is harmless.

## Relevant files
- `components/chat/chat-message-list.tsx`, `components/chat/chat-thread.tsx`, `components/chat/chat-composer.tsx`
- `lib/chat/title.ts`, `app/api/ai/chat/route.ts`, `lib/inngest/functions.ts`
- `components/ai-elements/streaming-caret.tsx`, `app/globals.css`
- `app/(onboarding)/onboarding/page.tsx`, `components/layout/AppSidebar.tsx`
- `tests/lib/chat/title.test.ts`, `tests/components/chat-message-list.test.tsx`, `tests/components/chat-composer.test.tsx`

<!-- END:chat-polish -->

<!-- BEGIN:web-search-tooling -->
# Web search tooling (spec 0022)

## Goal
Firecrawl is the primary search and page reader, Tavily is the fallback, and both hide behind two tools the model sees as plain capability. One module, `lib/web-search/`, owns the providers, the normalisation, the caps, the shared cache and the bookkeeping. No provider name ever reaches a tool result.

## The two tools
- `webSearch`: `query` (3 to 500), `depth` (`quick` or `thorough`, default `quick`), `recency` (default `any`), `country` (default `CM`). Returns `ok`, `degraded`, `results[]`.
- `readPage`: one `url` (max 2,048). Returns `ok`, `title`, `body`, `truncated`, `warnings`, and a `reason` on a refusal. Firecrawl only, never cached.

## The chain
Cache, then Firecrawl search, then Firecrawl with page fetch (the normal `thorough` path and the single retry after a `quick` answer was not useful), then Tavily, then an honest empty answer. A hard failure skips the second Firecrawl pass. The event row is written before the cache and the cache before the debit.

## Gotchas in this area
- **The cap is a promise, so `truncateAtBoundary` never returns more than the cap it is given.** The mark is counted in the budget, and a cap too small to hold the text and the mark takes the hard cut instead. `applyCaps` drops a tail shorter than `MIN_READABLE_SNIPPET_CHARS` (the AC-4 usability floor) rather than showing a fragment, so 12,000 never becomes 12,010.
- **AC-3 and AC-17 pull against each other on a rejected key.** The reading taken here: any Firecrawl hard failure, a `401` included, skips the second pass and goes to Tavily. "Fails fast" therefore means no wasted second pass and no Tavily call spent confirming a missing key, not "no fallback at all". A missing key logs once per process and starts the chain at Tavily.
- **A hard failure is not a retryable reason.** Calling a provider again seconds after a `429` is a bug, so the second pass only runs when the first answer came back and was not useful.
- **This feature debits one credit with no plan multiplier.** `creditCostWebSearch` is the only value the spec names, so a plan tier changes nothing here.
- **The per request cap lives in the `createChatTools` closure**, not in the module, because the request is the scope. 2 searches and 3 reads; the refusal is a plain result.
- **`readPage` has no policy wrapper on purpose.** Its scheme, host and length checks run in the module before any fetch, and `READ_PAGE_TOOL_POLICIES` is empty.
- **The cache key must carry depth.** A stored `quick` entry has no body, and a `thorough` caller must never receive a bodyless one.

## Relevant files
- `lib/web-search/`: `types.ts`, `http.ts`, `query.ts`, `normalize.ts`, `firecrawl.ts`, `tavily.ts`, `index.ts`
- `lib/ai/tools.ts`, `lib/ai/tool-policy.ts`, `lib/chat/activity-labels.ts`
- `prompts/tools/web_search.md`, `prompts/tools/read_page.md`, `prompts/chat/chat_system.md`
- `lib/platform-settings-direct.ts`, `app/api/admin/platform-settings/route.ts`, `app/(admin)/admin/platform-settings/page.tsx`
- `lib/inngest/cache-cleanup-functions.ts`, `prisma/schema.prisma`, `prisma/migrations/20261026142424_add_web_search_tooling/`
- `tests/lib/web-search/`, `tests/lib/chat/activity-labels.test.ts`

<!-- END:web-search-tooling -->

<!-- BEGIN:plans-credits-and-student-pages -->
# Plans, credits and the student pages - Implementation Summary

## Goal
Credits arrive with the plan instead of behind a separate purchase, every plan statement matches what the product actually does, and the subscription, quizzes, upload, settings and dashboard pages are rebuilt on that truth.

## What changed
- `prisma/schema.prisma`: the credit balance defaults to 200, in migration `20261026152554_award_200_credits_on_signup`. Signup grants the same 200 in `lib/auth.ts` as a `BONUS` credit row, so a new account can generate four quizzes before paying anything.
- `lib/plan-credits.ts`: `planCredits` (STARTER 1,600, STANDARD 3,600, PREMIUM and PRO 12,000) and `grantPlanCredits`, which writes `referenceId: plan:<subscriptionId>` so a repeated webhook or a second activate click cannot award twice. The Fapshi webhook, the admin create route and the admin activate route all call it.
- `constants/plans.ts`: every plan carries a `credits` number and a feature line for it. Students see Free and the Semester Pass only (`publicPlans`); the monthly tiers stay in the catalogue for admin and payment routes.
- `components/marketing/pricing-plans.tsx`: two cards, no clipped badge, stacked footer, a current plan that cannot be pressed, an "Included in every account" state for a signed in student, and the estimate line marked as an estimate.
- `app/api/usage/route.ts` returns `creditCosts`, the plan adjusted price of one quiz and one Tip message, so the quiz dialog and the subscription page print the number the account is actually charged.
- `app/(dashboard)/subscription/page.tsx`: plan, credits and usage on one page, with the upgrade dialog and the Mobile Money fallback under it.
- `app/(dashboard)/quizzes/page.tsx`: search in the URL, status aware cards, delete behind an `AlertDialog`, and two different empty states (nothing yet, nothing matches).
- `app/(dashboard)/upload/page.tsx`: one upload card beside the stages list, a note grid with the real card, and the rename and quiz dialogs in the URL through `nuqs/upload.ts`. `components/ui/file-drop.tsx` is now a real drop area with drag state.
- `app/(dashboard)/settings/page.tsx`: profile, password, notifications and account, each control writing to a real endpoint. The password now posts to Better Auth's `/api/auth/change-password`; the old code posted to `/api/profile`, whose schema rejects both password fields, so it never worked.
- `app/(dashboard)/dashboard/dashboard-client.tsx` is Recent notes and Last quiz, and `getDashboardContinue` reads only those two, so the unused conversation query is gone.
- `components/layout/AppSidebar.tsx` and `DashboardHeader.tsx` lost the credits card, the streak line, the plan badge and the bell.

## Gotchas in this area
- **A plan grants credits once, by `referenceId`.** Any new activation path must call `grantPlanCredits`, not `grantCredits` with its own id, or a retry doubles the balance.
- **PRO and PREMIUM say unlimited, but quizzes still cost credits.** The 12,000 award is the practical ceiling, and the copy never promises an endless supply.
- **The free plan is `FREE`, which is not a `Plan` enum value.** Every route derives it with `resolvePlan`, as before.
- **SettingsSkeleton, SubscriptionSkeleton, NoteListSkeleton and QuizListSkeleton mirror the rebuilt layouts.** Change a card and change its skeleton in the same edit, or the page moves under the student when data lands.
- **A hidden `<input type="file">` is the one hand-rolled control left in settings.** `pnpm ui:check` accepts it because the file is baselined with a reason, and `FileDrop` owns the upload page so no raw input is left there.

## Relevant files
- `lib/plan-credits.ts`, `lib/auth.ts`, `constants/plans.ts`, `prisma/schema.prisma`
- `app/api/usage/route.ts`, `app/api/webhooks/fapshi/route.ts`, `app/api/admin/subscriptions/route.ts`, `app/api/admin/subscriptions/[id]/route.ts`
- `app/(dashboard)/{subscription,quizzes,upload,settings}/`, `app/(dashboard)/dashboard/`, `app/(dashboard)/student-skeletons.tsx`
- `components/marketing/pricing-plans.tsx`, `app/(marketing)/pricing/page.tsx`
- `components/ui/file-drop.tsx`, `components/layout/AppSidebar.tsx`, `components/layout/DashboardHeader.tsx`
- `lib/dashboard-data.ts`, `hooks/useDashboard.ts`, `lib/api-client.ts`
<!-- END:plans-credits-and-student-pages -->

<!-- BEGIN:chat-shell-rework -->

# Chat shell rework (ChatGPT-shaped sidebar) - Implementation Summary

## Goal
Make the chat page read like the reference: a slim icon rail when the sidebar
is collapsed, one brand block that becomes the toggle on hover, a search
modal instead of an inline filter, an account row at the bottom, no top bar,
and usage awareness living on the composer instead of a sidebar card.

## What changed
- `components/chat/chat-sidebar.tsx` collapses to `collapsible="icon"` now
  (the rail survives closing; before, `offcanvas` left nothing but floating
  header icons). The header brand is the Tip logo turning into the sidebar
  toggle on hover in the rail, with the real shortcut (Ctrl/⌘ B) in the
  tooltip. New chat is a labelled row; conversation rows use
  `SidebarMenuAction` (title truncates into its reserved `pr-8`, actions
  reveal on hover, always visible under `md`).
- The inline "Search chats" input died. `components/chat/chat-search.tsx`
  holds a `CommandDialog` over conversations grouped by
  `lib/chat/conversations.ts` (`groupConversationsByRecency` is the shared
  grouping for sidebar and modal). Two triggers: `ChatSearchRow` in the
  sidebar, `ChatSearchButton` beside the toggle.
- `components/chat/chat-header.tsx` is deleted. `app/chat/layout.tsx` renders
  no top bar; only a fixed mobile drawer trigger floats top-left (same
  pattern as the dashboard's mobile trigger).
- `components/chat/chat-account-row.tsx` is the sidebar footer: avatar + name
  + plan label (from `planCatalog` via `usePlan`), a bottom-opening menu
  (Subscription, Settings, Sign out), and for FREE students an offer pill
  that names the Semester Pass from the catalogue. The rail shows the
  avatar only.
- "Daily chat usage" card deleted (`chat-usage-card.tsx` gone entirely). The
  count lives on the composer: `components/chat/chat-allowance-hint.tsx`
  prints "N messages left today · resets at HH:MM" while one or two remain,
  and the spent block (`AllowanceNotice`) is the final block.

## Gotchas in this area
- **Radix `ScrollArea` cannot host the conversation list.** Its viewport
  grows table-style, so long titles expanded past the sidebar edge with no
  ellipsis and the hover menu sat beyond reach. The list is a plain
  `overflow-y-auto` flex child now; truncation needs a width that does not
  grow.
- **`SidebarMenuButton`'s `tooltip` prop only shows while collapsed** — put
  walkthrough labels there for rail rows, not a second Tooltip wrapper.
- **The collapsed brand swap is two branch renders, not CSS.** The header
  (`ChatBrandHeader`) reads `state` and `isMobile` from `useSidebar` and
  renders either the rail hover-swap logo or the expanded brand row; nested
  group-hover variants were not trusted to compose with
  `group-data-[collapsible=icon]`. In the rail the toggle button is opaque
  (`bg-sidebar`) and the logo gets `group-hover/logo:opacity-0`, so each
  hides the other completely. Expanded, the header is brand left with
  search + toggle right, and the content search row renders only in the
  rail so search is never in two places.
- **`CommandDialog` must mount a `<Command>` root.** Our
  `components/ui/command.tsx` wraps its children in one; cmdk pieces
  (`CommandInput`, `CommandList`, …) read the store through context, and
  without the root `useCommandState` hit `undefined.subscribe` and crashed
  the search dialog. Putting pieces inside a bare `DialogContent` is
  invalid; mount the root or the consumer carries it.
- **`ChatUsageCard`, `ChatHeader` and `BrandBlock` are deleted, not
  retired.** Everything they carried has a new owner; nothing imports them.
- **The prisma pool timeout test now remembers 30s**, not 5s (see
  `tests/lib/prisma.test.ts`).

## Relevant files
- `components/chat/chat-sidebar.tsx`, `chat-account-row.tsx`, `chat-search.tsx`, `chat-allowance-hint.tsx`
- `components/ui/command.tsx` (the `<Command>` root inside `CommandDialog`)
- `components/chat/chat-thread.tsx`, `chat-landing.tsx` (hint above the composer)
- `app/chat/layout.tsx`, `lib/chat/conversations.ts`
- `tests/app/layout-shells.test.tsx` (no ChatHeader mock), `tests/lib/prisma.test.ts`
<!-- END:chat-shell-rework -->

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
## Design system

Must follow: `docs/design-system.md`. Radix UI base, tokens only in `app/globals.css`, mobile first, four breakpoints.
