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
- AiModel changed from "gpt-5.1-chat-latest" to "gpt-5.4" in evaluate.ts and chat route
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
- Mobile-first: large tap targets, no hover-only interactions
- Post-onboarding: AI context includes level, programs, exam date, baselines, weakest program
- Use `gpt-5.5`, Prisma migrations, pnpm

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
# AI Orchestration & Performance — Implementation Summary

## Goal
Fix AI orchestration latency (model chain fallback, no timeouts, no caching) and route critical paths to OpenAI directly while keeping the multi-agent chain for background tasks.

## Constraints & Preferences
- Critical user-facing paths (chat, quiz gen, exam gen, grading) → OpenAI direct (gpt-5.5)
- Background/async paths (Inngest jobs, short answer grading) → multi-agent chain fallback
- 10s timeout on all AI SDK calls
- Model health cache: working model (5 min TTL) + dead model (30s negative TTL)
- Build must pass before commit

## Progress
### Done
- Added working model cache (5 min TTL) + dead model cache (30s TTL) to orchestrator
- Added 10s timeout on all AI SDK calls (generateObject, generateText, streamText)
- Removed redundant health check from streamChat — try streamText directly with fallback
- Chat route: tries OpenAI first in health check, falls back to chain; uses orchestrator model cache
- Added `generateCritical()` and `generateTextCritical()` to orchestrator — calls openai("gpt-5.5") directly, no chain fallback, maxRetries: 1
- lib/ai/index.ts: quiz gen, exam gen, grading → switched to generateCritical / generateTextCritical
- paper3/chat route: switched from generate → generateCritical
- revision-guides route: switched from generateTextWithFallback → generateTextCritical
- Added top-level try/catch to paper3-exam-functions Inngest handler (marks attempt FAILED on error)
- Added try/catch to gradeShortAnswer for graceful AI failure fallback
- Removed dead code: createChatStream (index.ts), evaluateWithAI (evaluate.ts), unused imports

## Key Decisions
- Critical paths (user-facing, synchronous): OpenAI direct only — no fallback chain, no health check, maxRetries: 1
- Background paths (Inngest, async): multi-agent chain [gpt → gemini → nemotron → mistral → deepseek] — failure handled gracefully
- summarizeText stays on multi-agent chain (Inngest background)
- Model cache uses global Map — not shared across instances but sufficient for single-instance deploys
- AbortSignal.timeout not used (Node version constraints); use SDK's built-in `timeout` option instead
- ProcessingStatus enum has no "ERROR" value — use "FAILED" instead

## Relevant Files
- `lib/ai/orchestrator.ts`: Core — model cache (working + dead), 10s timeout, generateCritical / generateTextCritical, tryCachedModel / reportModelSuccess / reportModelFailure
- `lib/ai/index.ts`: Critical wrappers switched to generateCritical / generateTextCritical; summarizeText stays on generate
- `app/api/ai/chat/route.ts`: OpenAI-first health check, uses orchestrator model cache, 10s timeout
- `app/api/paper3/chat/route.ts`: Uses generateCritical instead of generate
- `app/api/admin/revision-guides/route.ts`: Uses generateTextCritical instead of generateTextWithFallback
- `lib/inngest/paper3-exam-functions.ts`: Top-level try/catch, marks FAILED on error
- `lib/paper3/grade-short-answer.ts`: try/catch with graceful fallback
- `lib/inngest/paper3-functions.ts`, `lib/inngest/question-ingest.ts`, `lib/mock-generator.ts`: Keep multi-agent chain (background)
<!-- END:ai-orchestration-rework -->
