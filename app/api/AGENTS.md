# API routes

## Overview

There are 143 route handlers under `app/api/`. They are the only place that touches Prisma or an external service on the server. Every route follows the same shape and there is no shared wrapper, so the pattern is copied in each file.

## Key files

| File | Owns |
|---|---|
| `app/api/auth/[...all]/route.ts` | The better-auth catch-all handler |
| `app/api/inngest/route.ts` | The Inngest serve list, the registry of every background job |
| `app/api/usage/route.ts` | Usage counters and server side plan limits |
| `app/api/webhooks/fapshi/route.ts` | The payment provider callback |
| `app/api/notes/route.ts` | Note upload, enforces the upload limit |
| `app/api/paper3/` | 27 routes for the Paper 3 exam system |
| `app/api/admin/` | 42 routes, each re-checks the admin role |

## Conventions

- Route handlers are `route.ts`, they export `GET`, `POST`, `PATCH`, or `DELETE`, and they return `NextResponse.json()`.
- Read the session with `auth.api.getSession({ headers: await headers() })` at the top and return 401 when there is none. This is inlined in every route, not wrapped.
- Admin routes also check `session.user.role !== "ADMIN"` and return 403.
- Validate the request body with zod before writing.
- Server state lives in TanStack Query on the client. A route returns JSON, it does not shape data for a specific page.
- Client calls go through `lib/api-client.ts` on top of `config/axios.config.ts`. Do not add a new raw `fetch` path next to it.
- Long work goes to Inngest. Return quickly and send an event rather than awaiting a model call.

## Gotchas

- **Plan limits live in three places and they disagree.** `hooks/usePlan.ts` and the `getPlanLimits` function in `app/api/usage/route.ts` define separate maps, and several routes hardcode their own copy (`app/api/notes/route.ts`, `app/api/quizzes/generate/route.ts`, `app/api/quizzes/generate/from-weak-areas/route.ts`, `app/api/ai/chat/route.ts`, `lib/ai/tools.ts`). Known divergence: `usePlan` gives STANDARD an unlimited Paper 3 exam limit using the `-1` sentinel, while the usage route caps it at 5. `usePlan` allows STANDARD to use Paper 3 AI, the usage route does not. **Change one, expect to change the others, and check which one the UI reads before assuming.**
- `-1` is the sentinel for unlimited. It is defined in `lib/chat-usage.ts`.
- Money is XAF in whole integers. There are no minor units anywhere.
- **Prices are duplicated in four places**: `PLAN_PRICES` in `lib/fapshi.ts`, `app/api/webhooks/fapshi/route.ts`, `app/api/subscription/manual/route.ts`, and `app/(dashboard)/subscription/page.tsx`. The `PRO` plan is missing from three of the four. STARTER 3000, STANDARD 5000, PREMIUM 10000, PRO 3500.
- `Plan` in the schema is `STARTER | STANDARD | PREMIUM | PRO`. There is no `FREE`. Free is synthesised in `app/api/usage/route.ts` when no active subscription exists.
- Credits and money are separate. `lib/credits.ts` uses `Math.ceil` for the effective cost, `lib/platform-settings.ts` uses `Math.floor` when converting XAF to credits. That asymmetry is deliberate, do not unify them.
- Credit costs and multipliers are tunable and live in the `PlatformSettings` row where `key="global"`, not in code.
- The Fapshi webhook at `app/api/webhooks/fapshi/route.ts` verifies `FAPSHI_WEBHOOK_SECRET`. It sits in `publicPaths` in `proxy.ts`, so it must not require a session.
- Timezone handling is inconsistent. `lib/chat-usage.ts` hardcodes a 60 minute offset for Douala, while `app/api/usage/route.ts` builds month and day boundaries from server local time. A deploy outside that offset sees different month boundaries.
- `app/api/paper3/mocks/route.ts` imports the Prisma enums through a four level relative path instead of the `@/` alias. Every other file uses `@/lib/generated/prisma/enums`. Correct it if you touch that file.
- The public share page at `/result/[shareId]` is ungrouped and outside the dashboard layout. Do not add auth to it.
- `proxy.ts` guards page routes, not API routes. A route handler must do its own auth check.
- **Drift already in the tree.** `hooks/usePaper3.ts` holds 31 raw `fetch` calls that bypass `lib/api-client.ts` entirely, so Paper 3 data does not share the axios config, base URL, or error handling the rest of the app uses. When you change a Paper 3 endpoint, check whether the caller is that file.
- `app/api/notes/process/route.ts` emits an Inngest event but `app/api/notes/[id]/process/route.ts` does not. Two paths, one behaviour. Do not assume processing is wired the same way in both.
- `app/api/subscription/me/route.ts` returns `{ subscription, previousPlan }`. Confirm the consuming hook actually reads `previousPlan` before relying on it.
- There is no CI. `.github/` does not exist. `pnpm lint` and `pnpm build` before committing is the only gate.