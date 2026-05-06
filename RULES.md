# TiCLearn Working Rules

This file defines the criTiCl rules that must be followed when reasoning about or changing this codebase.

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
  - dashboard: `app/(dashboard)`
  - admin: `app/(admin)`
- Global client infrastructure is installed in:
  - [`providers/QueryProvider.tsx`](./providers/QueryProvider.tsx)
  - [`lib/auth-client.ts`](./lib/auth-client.ts)
  - [`app/api/uploadthing/core.ts`](./app/api/uploadthing/core.ts)
  - [`nuqs/index.ts`](./nuqs/index.ts)

Do not add a second parallel architecture layer unless you are intentionally replacing the first one end to end.

## 3. The Data Flow Is UI -> Hook -> API -> Prisma/Integration

- Preferred mental model:
  - page/component triggers a hook
  - hook owns query or mutation behavior
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
- `hooks/index.ts` already has to rename one `useCanAccess` export.

Do not deepen this overlap. Consolidate ownership when touching plan/access logic.

## 6. `lib/api-client.ts` Is The Canonical Client Layer

- [`lib/api-client.ts`](./lib/api-client.ts) is now the centralized API client using axios with `withCredentials: true`.
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
- The axios instance handles cookies automaTiClly via `withCredentials: true`
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
- Exams:
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

If you change cache behavior, document the exact query keys affected.

## 8. Route Handlers Own Auth, Validation, And Side Effects

- Most protected routes use `auth.api.getSession({ headers: await headers() })`.
- Keep auth checks server-side even if the UI already redirects unauthenTiCted users.
- Validation belongs in the route or shared server utility, not only in the page.
- External side effects belong in server routes or background workers, not in client components.

Do not move payment, email, AI generation, or DB mutation logic into client code.

## 9. Prisma Schema Is The Persistence Source Of Truth

- [`prisma/schema.prisma`](./prisma/schema.prisma) defines the real model surface.
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

## 13.5. Chat Must Follow The AI SDK UI Contract

- The dashboard chat UI should use `useChat` from `@ai-sdk/react`.
- The chat route should accept `UIMessage[]`, convert them with `convertToModelMessages`, and return `toUIMessageStreamResponse()`.
- Client rendering should read `message.parts`, not assume assistant messages are plain `{ content: string }`.
- If you change the chat request or response shape, update both:
  - [`app/(dashboard)/chat/page.tsx`](./app/%28dashboard%29/chat/page.tsx)
  - [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts)

Do not reintroduce manual stream readers or raw text-only chat contracts unless you are intentionally removing AI SDK UI usage end to end.

## 14. Watch For Existing Drift Before Adding More

Known drift already present:
- `app/api/subscription/me/route.ts` does not return real subscription state.
- `app/(dashboard)/settings/page.tsx` references `/api/upload/profile`, which does not exist.
- admin UI links point to pages that are not implemented.
- middleware writes `redirect`, sign-in reads `callbackUrl`.
- `lib/api-client.ts` only partially covers app traffic.

When you see existing drift:
- do not build a third competing pattern around it
- either follow the current live path exactly, or fix the drift directly

## 15. Prefer Consolidation Over More Parallel Abstractions

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

## 16. Read These Files Before Large Changes

- [`docs/codebase-index.md`](./docs/codebase-index.md)
- [`docs/feature-flows.md`](./docs/feature-flows.md)
- [`app/layout.tsx`](./app/layout.tsx)
- [`hooks/index.ts`](./hooks/index.ts)
- [`lib/query-keys.ts`](./lib/query-keys.ts)
- [`lib/api-client.ts`](./lib/api-client.ts)
- [`prisma/schema.prisma`](./prisma/schema.prisma)
- [`lib/auth.ts`](./lib/auth.ts)

## 17. Package Manager: Use pnpm

- This project uses **pnpm** as the package manager, not npm or yarn.
- Always use `pnpm install`, `pnpm add`, `pnpm dev`, etc.
- Do not use `npm` or `yarn` commands directly.

## 18. Non-Negotiable Safety Rules

- Do not commit secrets from `.env`.
- Do not expose provider keys in client code.
- Do not change route response shapes without checking all hook and page consumers.
- Do not add protected UI pages without matching auth behavior.
- Do not add cache mutations without invalidation strategy.
- Do not assume a missing page or route is intentionally absent; verify first.

## 19. Database Changes Must Use Migrations

- Always use `pnpm db:migrate` to apply schema changes to the database.
- Never use `pnpm db:push` in production or for schema changes that need to persist.
- Use `pnpm db:push` only for quick local prototyping, then create a proper migration.
- When changing Prisma schema, always create a migration: `pnpm db:migrate --name <migration-name>`
- Review migrations before applying to ensure they are correct.

## 20. AI Models: Use gpt-5.4 for All AI Operations

- All AI-powered features MUST use `gpt-5.4` model.
- This applies to:
  - [`lib/ai/index.ts`](./lib/ai/index.ts) - main AI model export
  - [`lib/paper3/evaluate.ts`](./lib/paper3/evaluate.ts) - answer evaluation
  - [`lib/inngest/paper3-functions.ts`](./lib/inngest/paper3-functions.ts) - document processing
- Do NOT use `gpt-4o`, `gpt-4-turbo`, or any other model.
- Override this only if gpt-5.4 is unavailable in your OpenAI organization.
