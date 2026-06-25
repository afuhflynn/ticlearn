# TiCLearn Working Rules

This file defines the critical rules that must be followed when reasoning about or changing this codebase.

Read this before implementing features, fixing bugs, or refactoring shared layers.

## 1. Start With Repo Truth, Not Assumptions

- This project runs on Next.js 16 App Router, not older Next.js conventions.
- Before changing framework behavior, read the relevant guide under `node_modules/next/dist/docs/`.
- Do not assume Pages Router patterns, legacy middleware behavior, or old client/server boundaries.

## 2. Respect The Actual Architecture

- The root shell is [`app/layout.tsx`](./app/layout.tsx).
- Route groups are split into:
  - marketing: `app/(marketing)`
  - auth: `app/(auth)`
  - onboarding: `app/(onboarding)`
  - dashboard: `app/(dashboard)`
  - admin: `app/(admin)`
  - chat: `app/chat` (standalone)
  - result: `app/result` (public shareable results)
- Global client infrastructure is installed in:
  - [`providers/QueryProvider.tsx`](./providers/QueryProvider.tsx)
  - [`lib/auth-client.ts`](./lib/auth-client.ts)
  - [`app/api/uploadthing/core.ts`](./app/api/uploadthing/core.ts)
  - [`nuqs/index.ts`](./nuqs/index.ts)
  - [`stores/onboarding-store.ts`](./stores/onboarding-store.ts) (Zustand, persisted)

Do not add a second parallel architecture layer unless you are intentionally replacing the first one end to end.

## 3. The Data Flow Is UI -> Hook -> API -> Prisma/Integration

- Preferred mental model:
  - page/component triggers a hook
  - hook owns query or mutation behavior via React Query
  - route owns authorization, validation, DB writes, and integration calls
  - Prisma schema is the persistence source of truth
- If you change one stage, check the adjacent stages immediately.

Never change a route contract in isolation if a hook or page already depends on it.

## 4. React Query Is The Cache Contract

- Cache keys are centralized in [`lib/query-keys.ts`](./lib/query-keys.ts).
- Shared hook exports are centralized in [`hooks/index.ts`](./hooks/index.ts).
- When adding or changing server state:
  - define or reuse the correct query key
  - make the hook own the fetch/mutation
  - invalidate or refetch the affected keys on mutation success

Do not add ad hoc cache keys inline when a stable key belongs in `lib/query-keys.ts`.

## 5. `hooks/index.ts` Is The Public Hook Surface

- Other app code should prefer importing hooks from [`hooks/index.ts`](./hooks/index.ts), not from individual hook files.
- If you add a reusable hook and it is part of app-level data flow, export it there.
- Avoid creating duplicate hooks with overlapping ownership.

Current overlap already exists:
- `usePlan` and `useUsage` both express plan/access ideas.
- 5 hook files exist on disk but are NOT re-exported from `index.ts`:
  `useAdmin.ts`, `useAdminMetrics.ts`, `useChat.ts`, `useInvite.ts`, `usePayment.ts`

Do not deepen this overlap. Consolidate ownership when touching plan/access logic.

## 6. `lib/api-client.ts` Is The Canonical Client Layer

- [`lib/api-client.ts`](./lib/api-client.ts) is the centralized API client using axios with `withCredentials: true`.
- All hook-to-API communication MUST go through `api-client.ts` except for:
  - File upload requests (use `useUploadThing` or direct fetch with FormData)
  - Streaming requests (chat, AI responses)
- Never use direct `fetch()` in hooks - all HTTP calls should use `api.queries.*` or `api.mutations.*`.

Data flow pattern:
```
page/component -> hook -> api-client (axios) -> API route -> Prisma
```

Rules:
- All API endpoints are defined in `lib/api-client.ts` under `api.queries` (GET) and `api.mutations` (POST/PUT/DELETE)
- Queries use React Query's `useQuery` - call `api.queries.feature.method()`
- Mutations use React Query's `useMutation` - call `api.mutations.feature.method()`
- The axios instance handles cookies automatically via `withCredentials: true`
- Error handling is centralized in `api-client.ts` - errors are thrown as Error objects

Example:
```typescript
// In a hook - DO THIS:
const { data } = useQuery({
  queryKey: queryKeys.notes,
  queryFn: () => api.queries.notes.getAll(),
});

// NOT THIS:
const res = await fetch("/api/notes");
const data = await res.json();
```

## 7. Keep UI, API, And Cache Ownership Aligned

For each feature, there should be one obvious ownership path:

- Notes:
  - UI: upload/dashboard pages
  - hook owner: `hooks/useNotes.ts`
  - API owner: `app/api/notes*`
  - cache keys: `notes`, `note(id)`, `usage`
- Quizzes:
  - hook owner: `hooks/useQuizzes.ts`
  - API owner: `app/api/quizzes*`
  - cache keys: `quizzes`, `quiz(id)`, `quizAttempts(id)`, `userStats`, `leaderboard`
- Exams (old ExamSession pattern):
  - hook owner: `hooks/useExams.ts`
  - API owner: `app/api/exams*`
  - cache keys: `exams`, `exam(id)`
- Usage/plan:
  - hook owners: `hooks/useUsage.ts`, `hooks/usePlan.ts`
  - API owners: `app/api/usage/route.ts`, `app/api/subscription/me/route.ts`
- Community:
  - hook owner: `hooks/useCommunity.ts`
  - API owner: `app/api/community/posts*`
- Profile/settings/search:
  - hook owner: `hooks/useProfile.ts`
  - API owners: `app/api/profile`, `app/api/settings`, `app/api/search`
- Paper 3:
  - hook owner: `hooks/usePaper3.ts` (30 exports - largest)
  - API owners: `app/api/paper3/*` (25+ endpoints)
  - cache keys: `paper3*` group
- Credits:
  - hook owner: `hooks/useCredits.ts`
  - API owners: `app/api/credits/*`
  - cache keys: `credits`
- Paper 1/2 Mocks:
  - API owners: `app/api/mocks/*`
  - cache keys: none centralized yet
- Admin:
  - hook owners: `hooks/useAdmin.ts`, `hooks/useAdminMetrics.ts` (not exported from index.ts)
  - API owners: `app/api/admin/*` (35+ endpoints)

If you change cache behavior, document the exact query keys affected.

## 8. Route Handlers Own Auth, Validation, And Side Effects

- Most protected routes use `auth.api.getSession({ headers: await headers() })`.
- Keep auth checks server-side even if the UI already redirects unauthenticated users.
- Validation belongs in the route or shared server utility, not only in the page.
- External side effects belong in server routes or background workers, not in client components.

Do not move payment, email, AI generation, or DB mutation logic into client code.

## 9. Prisma Schema Is The Persistence Source Of Truth

- [`prisma/schema.prisma`](./prisma/schema.prisma) defines the real model surface (59 models, 37 enums).
- [`types/index.ts`](./types/index.ts) is a convenience layer, not the final runtime authority.
- If a TypeScript interface and Prisma model disagree, trust Prisma first, then fix the app contract intentionally.

Never update only `types/index.ts` and assume the app behavior has changed.

## 10. Plan Limits And Access Rules Must Stay Consistent

Current limit logic is duplicated across:
- [`types/index.ts`](./types/index.ts)
- [`hooks/usePlan.ts`](./hooks/usePlan.ts)
- [`hooks/useUsage.ts`](./hooks/useUsage.ts)
- [`app/api/usage/route.ts`](./app/api/usage/route.ts)
- [`app/api/notes/route.ts`](./app/api/notes/route.ts)
- [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts)

Rules:
- Any change to plan rules must update all active owners or intentionally centralize them.
- Do not change only the UI-visible limits and leave server enforcement unchanged.
- Do not change only one route and assume the rest of the product will follow.

## 11. Inngest And Synchronous Fallbacks Are Part Of The Real Design

- Note processing and quiz generation are designed to use Inngest.
- Quiz generation also has a synchronous fallback if Inngest send fails.
- Note processing does not have the same full fallback path.

When changing async flows:
- check both the route and `lib/inngest/functions.ts`
- check status transitions in Prisma rows
- check the UI loading assumptions and query invalidation

## 12. UploadThing Is The File Boundary

- Uploads go through [`app/api/uploadthing/core.ts`](./app/api/uploadthing/core.ts).
- Client helpers come from [`lib/uploadthing.ts`](./lib/uploadthing.ts).
- Uploaded file URLs are then persisted through app routes like `/api/notes`.

Do not invent new upload endpoints unless you need a truly different upload lifecycle.

## 13. Email, Payment, And AI Must Stay Server-Owned

- Email: [`lib/email/send.ts`](./lib/email/send.ts)
- Payment: [`lib/fapshi.ts`](./lib/fapshi.ts), `app/api/payment/initiate`, `app/api/webhooks/fapshi`
- AI: [`lib/ai.ts`](./lib/ai.ts), `app/api/ai/chat`, Inngest functions

Rules:
- never expose secrets to the client
- never hardcode secret values into docs or code comments
- never move these integrations into client components

## 14. Chat Must Follow The AI SDK UI Contract

- The dashboard chat UI should use `useChat` from `@ai-sdk/react`.
- The chat route should accept `UIMessage[]`, convert them with `convertToModelMessages`, and return `toUIMessageStreamResponse()`.
- Client rendering should read `message.parts`, not assume assistant messages are plain `{ content: string }`.
- If you change the chat request or response shape, update both:
  - [`app/(dashboard)/chat/page.tsx`](./app/%28dashboard%29/chat/page.tsx)
  - [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts)

Do not reintroduce manual stream readers or raw text-only chat contracts unless you are intentionally removing AI SDK UI usage end to end.

## 15. proxy.ts Is The Auth Middleware

- [`proxy.ts`](./proxy.ts) is the auth guard + security middleware (Arcjet + Better Auth).
- It uses Arcjet for bot detection and shield protection.
- It redirects unauthenticated users to `/sign-in?callbackUrl=...`.
- It redirects authenticated users away from auth pages to `/dashboard`.
- It enforces admin role for `/admin/*` routes.

Never add auth guards only in page components. All protected routes must also be protected in the middleware layer.

## 16. Two Exam Systems Coexist — Understand Which One You're In

The codebase has two parallel exam patterns:

### A. Old ExamSession Pattern (legacy)
- Model: `ExamSession` — stores questions/answers as JSON blobs
- Used by: `app/(dashboard)/gce-exams/`
- Hook: `hooks/useExams.ts`
- API: `app/api/exams/*`

### B. New Mock System (current)
- **Paper 1/2 Mocks**: `ExamBlueprint` + `BlueprintSection` + `MockAttempt` — normalized, blueprint-driven
- **Paper 3 Mocks**: `Paper3Mock` + `Paper3MockQuestion` + `Paper3MockAttempt` — with async AI evaluation, `ProcessingStatus` enum, shareable results
- Used by: `app/(dashboard)/practice/*`
- Hook: `hooks/usePaper3.ts`
- API: `app/api/mocks/*`, `app/api/paper3/*`, `app/api/blueprints/*`

When adding exam features:
- New features should use the Mock system, not ExamSession
- Do not expand the ExamSession pattern

## 17. Paper 3 Async Evaluation Pattern

Paper 3 mock submission follows an async evaluation flow:

1. User submits → answers stored with `processingStatus: QUEUED`
2. Route dispatches Inngest event `paper3/exam/evaluate`
3. Inngest function calls OpenAI to grade each answer
4. Result page polls every 5 seconds until `processingStatus` is `COMPLETED` or `FAILED`
5. Detailed results stored in `Paper3DetailedResult` with `feedbackMd`, `codeExplanation`, `partialCredit`

When modifying Paper 3 evaluation:
- Check both the submit route and `lib/inngest/paper3-exam-functions.ts`
- Check `ProcessingStatus` state transitions
- Check the result page polling logic
- Check query invalidation after completion

## 18. Credits Architecture

Credits are a pay-as-you-go system layered over subscription plans:

### Credit costs are centralized in `PlatformSettings`
- `creditCostQuizGeneration`, `creditCostMockQuestion`, `creditCostPracticeQuestion`, `creditCostAiTutorMessage`, `creditCostMockGeneration`
- Per-area enforcement flags: `enforceCreditsForMocks`, `enforceCreditsForPractice`, `enforceCreditsForAiTutor`
- Global override: `enforceCreditsAll`

### Credit flow
- Transactions tracked in `CreditTransaction` (positive=earned, negative=spent)
- Purchases go through `CreditPurchaseOrder` → Fapshi payment → reconciliation
- Referral bonuses in `ReferralBonus` (500 credits per referral)
- Purchase rate: `creditsPer1000Xaf` (default 50 credits per 1000 XAF)

### Rules
- Always check `PlatformSettings` for current credit costs — do not hardcode them
- Credits are checked BEFORE the action, not after
- Track via `CreditTransaction` for audit trail
- Do not bypass credit checks for subscription users unless `enforceCreditsAll` is false

## 19. Zustand Store Pattern

- Client-side state that persists across sessions uses Zustand with localStorage.
- Currently only one store: [`stores/onboarding-store.ts`](./stores/onboarding-store.ts)
- It stores the 5-step onboarding wizard state (step, level, programs, exam date, baselines).
- Naming convention: `ticlearn-{name}` as the localStorage key.

When adding new client-side state:
- Use Zustand with `persist` middleware for cross-session data
- Use React context or local state for ephemeral UI state
- Do not use Zustand for server state (use React Query instead)

## 20. Exam Hierarchy Model

The exam content structure follows a fixed hierarchy:

```
ExamLevel → Program → Component → Topic → Question
                                                ↓
                                         ExamBlueprint → BlueprintSection
                                                ↓
                                           MockAttempt (Paper 1/2)
                                    Paper3Mock → Paper3MockAttempt (Paper 3)
```

- `ExamLevel`: top-level (e.g., "GCE A-Level", "HND")
- `Program`: subject/course (e.g., "Computer Science", "ICT")
- `Component`: paper (P1/P2/P3) or course (Y1/Y2)
- `Topic`: within a component
- `Question`: individual question linked to component and optionally topic/exam source
- `ExamBlueprint`: defines a mock exam structure with sections and mark allocations
- ComponentType: `PAPER` (GCE) or `COURSE` (HND semester)

When adding content:
- Follow this hierarchy for all exam-related data
- Use `ComponentType.COURSE` for HND structures (not PAPER)

## 21. Prefer Consolidation Over More Parallel Abstractions

Bad pattern:
- one feature uses direct page `fetch`
- another uses a hook
- another uses `lib/api-client.ts`
- another uses a custom service wrapper

Preferred pattern:
- query key in `lib/query-keys.ts`
- hook in `hooks/`
- route in `app/api`
- shared types only when they reflect the real contract

If you introduce a new abstraction, it must replace an existing one for a clear slice, not sit beside it.

## 22. Constants And Shared Values

- Shared constants belong in [`constants/`](./constants/).
- Currently: `FAQ_ITEMS` (18 items), `SAMPLE_MOCKS` (4 cards), max character limits for quiz generation.
- Do not sprinkle magic values across components and hooks.

## 23. Testing

- Test runner: Vitest (no custom config file — uses defaults).
- Test commands: `pnpm test`, `pnpm test:ui`, `pnpm test:coverage`.
- Testing philosophy: TBD (no tests currently exist in the codebase).

When adding tests:
- Co-locate tests with the source file when possible
- Follow the existing pattern once established

## 24. Watch For Existing Drift Before Adding More

Known drift already present:
- `app/api/subscription/me/route.ts` returns `{ subscription, previousPlan }` but `usePlan` may not consume the shape correctly.
- `app/(dashboard)/settings/page.tsx` references `/api/upload/profile` which does not exist (404).
- middleware writes `redirect`, sign-in reads `callbackUrl` — parameter name mismatch.
- `lib/api-client.ts` only partially covers app traffic — 31 raw `fetch()` calls in `hooks/usePaper3.ts` bypass it entirely.
- `hooks/useQuestions.ts:14` uses raw `fetch()` instead of api-client.
- `hooks/useAdmin.ts:304` uses raw `fetch()` for payout (inconsistency within same file).
- Plan/limit logic is duplicated across 6 files with no central authority.
- `app/api/notes/[id]/process/route.ts` does not emit Inngest, but `app/api/notes/process/route.ts` does.
- `lib/ai.ts` defines `createChatStream`, but `app/api/ai/chat/route.ts` builds its own streaming.
- Two lockfiles existed (`package-lock.json` + `pnpm-lock.yaml`) — `package-lock.json` has been removed.
- No `.env.example` existed — one has been created.
- No CI pipeline is configured (no `.github/` directory).
- Admin guard had missing `return` in `proxy.ts:93` — now fixed.

When you see existing drift:
- do not build a third competing pattern around it
- either follow the current live path exactly, or fix the drift directly

## 25. Read These Files Before Large Changes

- [`docs/codebase-index.md`](./docs/codebase-index.md)
- [`docs/feature-flows.md`](./docs/feature-flows.md)
- [`app/layout.tsx`](./app/layout.tsx)
- [`hooks/index.ts`](./hooks/index.ts)
- [`lib/query-keys.ts`](./lib/query-keys.ts)
- [`lib/api-client.ts`](./lib/api-client.ts)
- [`prisma/schema.prisma`](./prisma/schema.prisma)
- [`lib/auth.ts`](./lib/auth.ts)
- [`proxy.ts`](./proxy.ts)
- [`.env.example`](./.env.example)

## 26. Package Manager: Use pnpm

- This project uses **pnpm** as the package manager, not npm or yarn.
- Always use `pnpm install`, `pnpm add`, `pnpm dev`, etc.
- Do not use `npm` or `yarn` commands directly.
- Only `pnpm-lock.yaml` should exist — never commit `package-lock.json` or `yarn.lock`.

## 27. Database Changes Must Use Migrations

- Always use `pnpm db:migrate` to apply schema changes to the database.
- Never use `pnpm db:push` in production or for schema changes that need to persist.
- Use `pnpm db:push` only for quick local prototyping, then create a proper migration.
- When changing Prisma schema, always create a migration: `pnpm db:migrate --name <migration-name>`
- Review migrations before applying to ensure they are correct.

## 28. AI Models: Use gemini-2.5-flash for All AI Operations

- All AI-powered features MUST use `gemini-2.5-flash` model.
- Gemini 2.5 Flash handles text, vision, code, and reasoning natively.
- This applies to ALL AI operations: chat, evaluation, processing, generation.
- Do NOT use `gpt-5.5`, `gpt-4o`, or any OpenAI model.
- Override only if gemini-2.5-flash is unavailable in your Google AI account.

## 29. Biome Is The Linter And Formatter

- Linting uses Biome 2.2.0 with recommended rules + Next.js + React domain rules.
- Formatter uses 2-space indentation.
- Auto-organize imports on save is enabled.
- Tailwind's `@apply` and `@theme` directives are allowed (`noUnknownAtRules: off`).

Rules:
- Run `pnpm lint` before every commit.
- Do not disable Biome rules without a comment explaining why.
- Run `pnpm format` to auto-format all files.

## 30. Non-Negotiable Safety Rules

- Do not commit secrets from `.env`. Use `.env.example` for documentation.
- Do not expose provider keys in client code.
- Do not change route response shapes without checking all hook and page consumers.
- Do not add protected UI pages without matching auth behavior in both `proxy.ts` and the route.
- Do not add cache mutations without invalidation strategy.
- Do not assume a missing page or route is intentionally absent; verify first.
- Do not add secrets, tokens, or passwords to `.env.example`.
- The admin guard in `proxy.ts` must always have a `return` statement before `NextResponse.redirect()`.
