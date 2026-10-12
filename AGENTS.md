# TiCLearn

AI study platform for Cameroonian GCE A Level, O Level, and HND students. Note upload, AI quiz generation, blueprint driven Paper 1 and 2 mocks, a full Paper 3 exam system with AI marking, subscription plans paid over Mobile Money, and an admin panel.

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
- Keep the three implementation summaries at the bottom of this file current as work lands.

## Context files

- [lib/ai/AGENTS.md](lib/ai/AGENTS.md): AI model calls, the task registry, chat tools, and the cache
- [app/api/AGENTS.md](app/api/AGENTS.md): route handler conventions, auth checks, plan limits, webhooks
- [prisma/AGENTS.md](prisma/AGENTS.md): schema layout, the two parallel mock families, migrations, seeding

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
- Added ReactMarkdown to TiCExamAssistant
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
- `components/paper3/TiCExamAssistant.tsx`: Message limit tracking, upgrade modal
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
Redesign onboarding flow for multi-level/multi-program support, seed O-Level (15 subjects) and HND (8 specialties) exam data, fix AI tool bugs and math rendering.

## Constraints & Preferences
- Onboarding: 60–90 seconds max, one decision per screen, auto-save, 480–520px centered, slide transitions (250–300ms)
- GCE = multi-select subjects (soft cap 4), HND = single-select specialty
- Mobile-first: large tap targets, no-hover-only interactions
- Post-onboarding: AI context includes level, programs, exam date, baselines, weakest program
- Use `gemini-2.5-flash`, Prisma migrations, pnpm

## Progress
### Done
- Fixed `lib/ai/tools.ts:475`: `__standalone__` → `null` for `noteId` in `createQuiz` (foreign key violation fix)
- Fixed `lib/math-format.ts`: added `\[...\]` → `$$...$$` and `\(...\)` → `$...$` to `normalizeMathNotation` (KaTeX rendering fix)
- Added `COURSE` to `ComponentType` in `prisma/schema.prisma`
- Created+applied migration `20260516110019_add_course_component_type`
- Rewrote `prisma/seed.ts`: 15 O-Level subjects (P1/P2) + 8 HND specialties (Y1/Y2)
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
- O-Level = P1 + P2 components; HND = Y1 + Y2 COURSE components (not PAPER)
- ComponentType extended with COURSE for non-paper exam structures (HND semester/module system)
- Readiness uses 3-pillar: 35% baseline + 45% performance + 20% recency
- Level card click = auto-advance (no extra Continue click); Continue button at step 0 is inert (dead code)

## Relevant Files
- `lib/ai/tools.ts:475`: createQuiz noteId sentinel fix
- `lib/math-format.ts`: KaTeX delimiter conversion
- `prisma/schema.prisma`: COURSE enum value
- `prisma/migrations/20260516110019_add_course_component_type/`: migration
- `prisma/seed.ts`: comprehensive O-Level + HND seed
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
Keep AI calls fast and predictable on a single model: one Gemini model, a 10 second timeout everywhere, and an in-memory cache for the tasks whose output does not change.

## How it works now
- One model: `google("gemini-2.5-flash")`, built in `lib/ai/instances.ts` and used by `lib/ai/orchestrator.ts`.
- Every call sets `timeout: TIMEOUT_MS` (10000) and `maxRetries: 1`.
- `lib/ai/registry.ts` maps eight task names (`reasoning`, `fast_chat`, `quiz_gen`, `exam_gen`, `paper3_gen`, `paper3_eval`, `summarize`, `grading`) to a per-task cache TTL. `paper3_eval` and `grading` are set to 0, so they never cache. `getTaskConfig` throws on an unknown task name, so every new task must be registered.
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
- `registry.ts` declares a `chain: LanguageModel[]` array on every task and every array holds exactly one model. There is no fallback chain, so a Gemini outage fails the request. If you add a real chain, the orchestrator does not iterate it today; you must write that loop.
- The old model cache (a working model with a 5 minute TTL and a dead model with a 30 second negative TTL) described in earlier notes does not exist in the code. Ignore any reference to it.
- The `cacheTtlMs` values are long (7 to 30 days) and the cache key is the prompt, so two users asking the same question share a cached answer. That is intended for `summarize`, `quiz_gen`, and the other generation tasks, and is why the grading tasks are set to 0.
- `instances.ts` re-exports only `google`. The `@ai-sdk/openai`, `@ai-sdk/openai-compatible`, `@polar-sh/*`, and `@inngest/realtime` packages are installed but never imported. Do not assume an OpenAI path exists.

## Relevant Files
- `lib/ai/instances.ts`: the single `google` re-export
- `lib/ai/orchestrator.ts`: model instance, timeout, generate, streamChat, the four exported wrappers
- `lib/ai/registry.ts`: task names and cache TTLs
- `lib/ai/cache.ts`: in-memory sha256 cache
- `lib/ai/index.ts`: extraction, summarization, quiz and exam generation, grading helpers
- `lib/ai/tools.ts`: chat tool definitions (web search, notes, quizzes, progress, createQuiz)
- `lib/ai/validators.ts`: `normalizeGeneratedQuestions`
- `lib/paper3/`: Paper 3 evaluation, short answer grading, prompts, subject tasks (separate from `lib/ai/`)
<!-- END:ai-orchestration-rework -->

_Drafted by /codebase-audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._