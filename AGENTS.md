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

# Database
pnpm db:up          # Postgres on 5435, pgAdmin on 5050
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Background jobs
pnpm inngest:start
```

There are no tests. Vitest is installed and three test scripts exist, but there is no config file and no test file anywhere, so `pnpm test` fails. Do not treat it as a verification step.

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

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
## Design system

Must follow: `docs/design-system.md`. Radix UI base, tokens only in `app/globals.css`, mobile first, four breakpoints.
