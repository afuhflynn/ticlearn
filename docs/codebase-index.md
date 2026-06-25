# TiCLearn Codebase Index

## Purpose

This document indexes the TiCLearn codebase as it exists today. It maps the UI, App Router structure, hooks, API routes, caching model, shared types, Prisma models, and external integrations, and it records the implementation drift that matters for future work.

Use this as the repo entrypoint before changing product behavior.

## Stack And Runtime

- Framework: Next.js 16 App Router with React 19 and `reactCompiler: true` in [`next.config.ts`](../next.config.ts).
- Styling/UI: Tailwind CSS 4, shared primitives under `components/ui`, feature components under `components/app`, `components/layout`, `components/user`, and `components/ai-elements`.
- State/cache: TanStack Query via [`providers/QueryProvider.tsx`](../providers/QueryProvider.tsx).
- Auth: Better Auth in [`lib/auth.ts`](../lib/auth.ts) with the Next handler in [`app/api/auth/[...all]/route.ts`](../app/api/auth/%5B...all%5D/route.ts).
- Database: Prisma 7 with generated client output under `lib/generated/prisma` and schema in [`prisma/schema.prisma`](../prisma/schema.prisma).
- Async/background: Inngest client/functions in [`lib/inngest/client.ts`](../lib/inngest/client.ts) and [`lib/inngest/functions.ts`](../lib/inngest/functions.ts).
- File uploads: UploadThing router in [`app/api/uploadthing/core.ts`](../app/api/uploadthing/core.ts).
- AI: AI SDK + OpenAI helpers in [`lib/ai.ts`](../lib/ai.ts), plus `useChat`/`UIMessage`-based streaming in [`app/(dashboard)/chat/page.tsx`](../app/%28dashboard%29/chat/page.tsx) and [`app/api/ai/chat/route.ts`](../app/api/ai/chat/route.ts).
- Payments: Fapshi wrapper in [`lib/fapshi.ts`](../lib/fapshi.ts) and payment routes under `app/api/payment` and `app/api/webhooks/fapshi`.
- Email: Nodemailer templates and transport in [`lib/email/send.ts`](../lib/email/send.ts).
- Request protection / auth redirects: Arcjet middleware in [`lib/arcjet.ts`](../lib/arcjet.ts).
- URL state: Nuqs schema in [`nuqs/index.ts`](../nuqs/index.ts).

## App Router Topology

### Global Shell

- [`app/layout.tsx`](../app/layout.tsx) is the global root.
- It installs:
  - `NuqsAdapter` for URL query state.
  - UploadThing `NextSSRPlugin`.
  - `QueryProvider` for TanStack Query.
  - global toaster and Vercel Analytics.
- Shared metadata is also defined there.

### Route Groups

#### Marketing

- Layout: [`app/(marketing)/layout.tsx`](../app/%28marketing%29/layout.tsx)
- Navigation/footer: [`components/layout/MarketingNav.tsx`](../components/layout/MarketingNav.tsx), [`components/layout/MarketingFooter.tsx`](../components/layout/MarketingFooter.tsx)
- Pages:
  - `/` -> [`app/(marketing)/page.tsx`](../app/%28marketing%29/page.tsx)
  - `/pricing` -> [`app/(marketing)/pricing/page.tsx`](../app/%28marketing%29/pricing/page.tsx)
  - `/about` -> [`app/(marketing)/about/page.tsx`](../app/%28marketing%29/about/page.tsx)
  - `/faq` -> [`app/(marketing)/faq/page.tsx`](../app/%28marketing%29/faq/page.tsx)
  - `/contact` -> [`app/(marketing)/contact/page.tsx`](../app/%28marketing%29/contact/page.tsx)
  - `/privacy` -> [`app/(marketing)/privacy/page.tsx`](../app/%28marketing%29/privacy/page.tsx)
  - `/terms` -> [`app/(marketing)/terms/page.tsx`](../app/%28marketing%29/terms/page.tsx)

#### Auth

- Layout: [`app/(auth)/layout.tsx`](../app/%28auth%29/layout.tsx)
- Pages:
  - `/sign-in` -> [`app/(auth)/sign-in/page.tsx`](../app/%28auth%29/sign-in/page.tsx)
  - `/sign-up` -> [`app/(auth)/sign-up/page.tsx`](../app/%28auth%29/sign-up/page.tsx)
  - `/verify-email` -> [`app/(auth)/verify-email/page.tsx`](../app/%28auth%29/verify-email/page.tsx)
- These pages use Better Auth client methods from [`lib/auth-client.ts`](../lib/auth-client.ts) and email OTP endpoints mounted through Better Auth.

#### Dashboard

- Layout: [`app/(dashboard)/layout.tsx`](../app/%28dashboard%29/layout.tsx)
- Shell components:
  - [`components/layout/AppSidebar.tsx`](../components/layout/AppSidebar.tsx)
  - [`components/layout/DashboardHeader.tsx`](../components/layout/DashboardHeader.tsx)
  - [`components/user/user-button.tsx`](../components/user/user-button.tsx)
- Pages:
  - `/dashboard` -> [`app/(dashboard)/dashboard/page.tsx`](../app/%28dashboard%29/dashboard/page.tsx)
  - `/upload` -> [`app/(dashboard)/upload/page.tsx`](../app/%28dashboard%29/upload/page.tsx)
  - `/quizzes` -> [`app/(dashboard)/quizzes/page.tsx`](../app/%28dashboard%29/quizzes/page.tsx)
  - `/progress` -> [`app/(dashboard)/progress/page.tsx`](../app/%28dashboard%29/progress/page.tsx)
  - `/chat` -> [`app/(dashboard)/chat/page.tsx`](../app/%28dashboard%29/chat/page.tsx)
  - `/community` -> [`app/(dashboard)/community/page.tsx`](../app/%28dashboard%29/community/page.tsx)
  - `/leaderboard` -> [`app/(dashboard)/leaderboard/page.tsx`](../app/%28dashboard%29/leaderboard/page.tsx)
  - `/gce-exams` -> [`app/(dashboard)/gce-exams/page.tsx`](../app/%28dashboard%29/gce-exams/page.tsx)
  - `/feedback` -> [`app/(dashboard)/feedback/page.tsx`](../app/%28dashboard%29/feedback/page.tsx)
  - `/settings` -> [`app/(dashboard)/settings/page.tsx`](../app/%28dashboard%29/settings/page.tsx)
  - `/affiliate` -> [`app/(dashboard)/affiliate/page.tsx`](../app/%28dashboard%29/affiliate/page.tsx)

#### Admin

- Layout: [`app/(admin)/layout.tsx`](../app/%28admin%29/layout.tsx)
- Sidebar: [`components/layout/AdminSidebar.tsx`](../components/layout/AdminSidebar.tsx)
- Present page:
  - `/admin` -> [`app/(admin)/admin/page.tsx`](../app/%28admin%29/admin/page.tsx)
- API routes exist for `/api/admin/users`, `/api/admin/feedback`, `/api/admin/subscriptions`, and `/api/admin/stats`, but matching admin UI pages are not present.

## Client Data Layer

### Query Provider

- [`providers/QueryProvider.tsx`](../providers/QueryProvider.tsx) creates one `QueryClient` with:
  - queries `staleTime: 60_000`
  - `retry: 1`
  - `refetchOnWindowFocus: false`
  - mutations `retry: 0`
- React Query Devtools are always mounted.

### Query Keys

- [`lib/query-keys.ts`](../lib/query-keys.ts) is the canonical query-key registry.
- Keys exist for notes, quizzes, exams, stats, subscription/plan/usage, feedback, affiliate, admin, chat, community, notifications, profile/settings, and search.

### Hooks Registry

- [`hooks/index.ts`](../hooks/index.ts) is the public export surface for app hooks.
- Most page-level data access happens through these hooks.

### Hook Ownership

| Area | Hooks | Backend contract | Cache keys |
| --- | --- | --- | --- |
| Notes | `useNotes`, `useNote`, `useUploadNote`, `useDeleteNote`, `useProcessNote` | `/api/notes`, `/api/notes/:id`, `/api/notes/process` | `notes`, `note(id)`, `usage` |
| Quizzes | `useQuizzes`, `useQuiz`, `useGenerateQuiz`, `useDeleteQuiz`, `useQuizAttempts`, `useSubmitQuizAttempt` | `/api/quizzes`, `/api/quizzes/:id`, `/api/quizzes/generate`, `/api/quizzes/attempts` | `quizzes`, `quiz(id)`, `quizAttempts(id)`, `userStats`, `leaderboard` |
| Exams | `useExams`, `useExam`, `useGenerateExam`, `useSubmitExam` | `/api/exams`, `/api/exams/:id` | `exams`, `exam(id)`, `userStats` |
| Usage / plan | `useUsage`, `useCheckLimit`, `usePlan`, both `useCanAccess` variants | `/api/usage`, `/api/subscription/me` | `usage`, `subscription` |
| Stats | `useUserStats`, `useLeaderboard` | `/api/stats`, `/api/leaderboard` | `userStats`, `leaderboard` |
| Community | `useCommunityPosts`, `useCreatePost`, `useLikePost`, `useDeletePost` | `/api/community/posts*` | `communityPosts`, `communityPost(id)` |
| Profile/settings/search | `useProfile`, `useUpdateProfile`, `useSettings`, `useUpdateSettings`, `useSearch` | `/api/profile`, `/api/settings`, `/api/search` | `profile`, `settings`, `search(query)` |
| Feedback | `useFeedbacks`, `useSubmitFeedback` | `/api/feedback` | `feedbacks` |
| Notifications | `useNotifications`, `useMarkNotificationRead` | `/api/notifications` | `notifications` |
| Affiliate | `useAffiliate`, `useApplyReferralCode` | `/api/affiliate`, `/api/referral` | `affiliate` |

### Shared API Helper vs Direct Fetch

- [`lib/api-client.ts`](../lib/api-client.ts) wraps Axios and currently covers only a subset of note operations.
- Everything else in hooks uses direct `fetch("/api/...")`.
- Result:
  - error handling is inconsistent across features
  - request base URL logic is split between Axios config and ad hoc fetch calls
  - the repo does not have one canonical client contract layer

### URL State

- [`nuqs/index.ts`](../nuqs/index.ts) defines the shared URL query schema.
- `callbackUrl` is the auth redirect parameter actually consumed on the sign-in page.
- Other common params are `page`, `limit`, `tab`, `conversationId`, and `email`.

## Shared Types And Contracts

### Type Sources

- Database source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma)
- Generated Prisma client/types: `lib/generated/prisma`
- App-level DTO-style interfaces: [`types/index.ts`](../types/index.ts)

### Important Type Groups

- Auth/user: `SafeUser`
- Notes: `NoteWithRelations`, `NoteSummary`
- Quizzes: `QuizWithRelations`, `QuizQuestion`, `QuizAttempt*`, `QuizGenerationOptions`
- Exams: `ExamSessionWithRelations`, `ExamQuestion`, `ExamAnswer`, `ExamGenerationOptions`
- Subscription: `SubscriptionWithUser`, `PlanLimits`, `FREE_LIMITS`, `PLAN_LIMITS`, `PREMIUM_LIMITS`
- Feedback, affiliate, ratings, FAQ content, generic `ApiResponse` and `PaginatedResponse`

### Contract Reality

- `types/index.ts` is an app-facing convenience layer, not the strict runtime source of truth.
- The route handlers often return raw Prisma payloads with ad hoc computed fields added inline.
- Several pages and hooks type their local response shape implicitly from `res.json()` rather than importing a shared response type.

## Backend Route Inventory

### Auth / Session

- [`app/api/auth/[...all]/route.ts`](../app/api/auth/%5B...all%5D/route.ts) exposes Better Auth GET/POST handlers.
- Server-side auth checks mostly use `auth.api.getSession({ headers: await headers() })`.
- Client-side session access uses `useSession`, `signIn`, `signUp`, `signOut`, and `getSession` from [`lib/auth-client.ts`](../lib/auth-client.ts).

### Notes

- [`app/api/notes/route.ts`](../app/api/notes/route.ts)
  - `GET`: user notes with quiz counts
  - `POST`: creates a note, enforces upload limits, then triggers processing via `/api/notes/process`
- [`app/api/notes/[id]/route.ts`](../app/api/notes/%5Bid%5D/route.ts)
  - `GET`: one note for the current user
  - `DELETE`: deletes matching note rows for the current user
- [`app/api/notes/process/route.ts`](../app/api/notes/process/route.ts)
  - marks note `PROCESSING`
  - emits Inngest event `note/process`
- [`app/api/notes/[id]/process/route.ts`](../app/api/notes/%5Bid%5D/process/route.ts)
  - marks a note as processing, but does not emit Inngest

### Quizzes

- [`app/api/quizzes/route.ts`](../app/api/quizzes/route.ts)
  - `GET`: current user's quizzes
- [`app/api/quizzes/[id]/route.ts`](../app/api/quizzes/%5Bid%5D/route.ts)
  - `GET`: quiz with questions and note data
- [`app/api/quizzes/generate/route.ts`](../app/api/quizzes/generate/route.ts)
  - validates note ownership/readiness
  - creates `GENERATING` quiz
  - tries Inngest `quiz/generate`
  - falls back to synchronous AI generation if Inngest send fails
- [`app/api/quizzes/[id]/attempts/route.ts`](../app/api/quizzes/%5Bid%5D/attempts/route.ts)
  - `GET`: attempts for one quiz
- [`app/api/quizzes/attempts/route.ts`](../app/api/quizzes/attempts/route.ts)
  - grades answers synchronously
  - creates `QuizAttempt` and `QuizAttemptAnswer` rows
  - updates `UserStats`

### Exams

- [`app/api/exams/route.ts`](../app/api/exams/route.ts)
  - `GET`: exam sessions for current user
  - `POST`: generates questions synchronously through `generateExamQuestions`, stores them in JSON, marks session `READY`
- [`app/api/exams/[id]/route.ts`](../app/api/exams/%5Bid%5D/route.ts)
  - `GET`: one exam session
  - `PUT`: grades answers and marks the session `COMPLETED`

### AI Chat

- [`app/api/ai/chat/route.ts`](../app/api/ai/chat/route.ts)
  - enforces auth
  - calculates plan/chat limit from subscription and `UserStats.totalChats`
  - increments usage before streaming the model response
  - converts `UIMessage[]` with `convertToModelMessages`
  - returns `toUIMessageStreamResponse()` for `useChat`
  - uses `streamText` with `google("gemini-2.5-flash")`

### Subscription / Payments

- [`app/api/subscription/route.ts`](../app/api/subscription/route.ts)
  - returns the latest subscription row
- [`app/api/subscription/me/route.ts`](../app/api/subscription/me/route.ts)
  - currently always returns `{ plan: null }`
- [`app/api/payment/initiate/route.ts`](../app/api/payment/initiate/route.ts)
  - creates a pending subscription
  - delegates payment initiation to `lib/fapshi.ts`
  - updates `fapshiTransId`
- [`app/api/webhooks/fapshi/route.ts`](../app/api/webhooks/fapshi/route.ts)
  - marks subscriptions `ACTIVE` or `FAILED`
  - ensures `UserStats` exists after successful activation

### Usage / Access

- [`app/api/usage/route.ts`](../app/api/usage/route.ts)
  - central current-state endpoint for plan, limits, usage counts, and `can*` flags

### Profile / Settings / Search

- [`app/api/profile/route.ts`](../app/api/profile/route.ts)
  - `GET`: user, settings, stats, affiliate
  - `PUT`: name/image update with Zod validation
- [`app/api/settings/route.ts`](../app/api/settings/route.ts)
  - `GET`: create-on-read settings row if absent
  - `PUT`: upsert settings
- [`app/api/search/route.ts`](../app/api/search/route.ts)
  - searches notes, quizzes, community posts

### Community / Notifications / Feedback / Affiliate

- Community:
  - [`app/api/community/posts/route.ts`](../app/api/community/posts/route.ts)
  - [`app/api/community/posts/[id]/route.ts`](../app/api/community/posts/%5Bid%5D/route.ts)
  - [`app/api/community/posts/[id]/comments/route.ts`](../app/api/community/posts/%5Bid%5D/comments/route.ts)
  - [`app/api/community/posts/[id]/like/route.ts`](../app/api/community/posts/%5Bid%5D/like/route.ts)
- Notifications:
  - [`app/api/notifications/route.ts`](../app/api/notifications/route.ts)
- Feedback:
  - [`app/api/feedback/route.ts`](../app/api/feedback/route.ts)
- Affiliate/referral:
  - [`app/api/affiliate/route.ts`](../app/api/affiliate/route.ts)
  - [`app/api/referral/route.ts`](../app/api/referral/route.ts)

### Admin

- [`app/api/admin/users/route.ts`](../app/api/admin/users/route.ts)
- [`app/api/admin/feedback/route.ts`](../app/api/admin/feedback/route.ts)
- [`app/api/admin/subscriptions/route.ts`](../app/api/admin/subscriptions/route.ts)
- [`app/api/admin/stats/route.ts`](../app/api/admin/stats/route.ts)
- All admin routes require an authenTiCted user with `role === "ADMIN"`.

### External / Infra Routes

- UploadThing:
  - [`app/api/uploadthing/core.ts`](../app/api/uploadthing/core.ts)
  - [`app/api/uploadthing/route.ts`](../app/api/uploadthing/route.ts)
- Inngest:
  - [`app/api/inngest/route.ts`](../app/api/inngest/route.ts)
- Contact:
  - [`app/api/contact/route.ts`](../app/api/contact/route.ts)
- Leaderboard and stats:
  - [`app/api/leaderboard/route.ts`](../app/api/leaderboard/route.ts)
  - [`app/api/stats/route.ts`](../app/api/stats/route.ts)

## Persistence Model

### Core Product Models

- `User`, `Session`, `Account`, `Verification`
- `Note`
- `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAttemptAnswer`
- `ExamSession`
- `UserStats`
- `Subscription`
- `Feedback`
- `Affiliate`, `AffiliateClick`, `AffiliateEarning`
- `Post`, `Comment`, `PostLike`
- `Notification`
- `UserSettings`
- `Rating`

### Model Ownership By Feature

- Notes and quizzes are directly tied by `Note.quizzes` and `Quiz.note`.
- Exam sessions store `questions` and `answers` as JSON rather than normalized rows.
- Product usage is inferred from:
  - note count
  - quiz count
  - `UserStats.totalChats`
- Community is normalized enough for likes and threaded replies.
- Subscription and affiliate accounting are present, but affiliate conversion/payout automation is not wired through the current subscription webhook.

## Integrations And Utilities

### Better Auth

- [`lib/auth.ts`](../lib/auth.ts) configures:
  - Prisma adapter
  - email/password auth
  - Google OAuth
  - session cookie cache
  - additional user fields `role`, `referredBy`, `refApplied`
  - email OTP plugin with custom senders from [`lib/email/send.ts`](../lib/email/send.ts)

### Prisma

- [`lib/prisma.ts`](../lib/prisma.ts) uses `PrismaPg` and a development singleton.

### Email

- [`lib/email/send.ts`](../lib/email/send.ts) owns:
  - raw `sendEmail`
  - verification, sign-in, reset, and welcome HTML templates
- [`app/api/contact/route.ts`](../app/api/contact/route.ts) reuses `sendEmail`.

### AI

- [`lib/ai.ts`](../lib/ai.ts) exposes:
  - `extractTextFromPDF`
  - `summarizeText`
  - `generateQuizFromNote`
  - `gradeOpenAnswer`
  - `generateExamQuestions`
  - `processNoteContent`
  - `createChatStream`
- Not all of these are wired consistently; the chat route bypasses `createChatStream`.

### Inngest

- [`lib/inngest/functions.ts`](../lib/inngest/functions.ts) defines:
  - `processNote`
  - `generateQuiz`
  - `sendVerificationEmail`

### UploadThing

- [`app/api/uploadthing/core.ts`](../app/api/uploadthing/core.ts) defines routes:
  - `imageUploader`
  - `profileImage`
  - `audioUploader`
  - `documentUploader`
- Client helpers are re-exported from [`lib/uploadthing.ts`](../lib/uploadthing.ts).

### Fapshi

- [`lib/fapshi.ts`](../lib/fapshi.ts) owns price config and payment initiation.

### Misc Utilities

- [`lib/utils.ts`](../lib/utils.ts) includes `cn`, `formatRelativeTime`, `truncate`, `hashString`, `sleep`, and `safeJsonParse`.

## Runtime Findings And Drift

### High-Impact

- [`app/api/subscription/me/route.ts`](../app/api/subscription/me/route.ts) always returns `plan: null`, but `usePlan` depends on it. Any UI relying on `usePlan` is effectively disconnected from real subscription state.
- [`app/(dashboard)/settings/page.tsx`](../app/%28dashboard%29/settings/page.tsx) calls `/api/upload/profile`, but no such route exists. UploadThing exposes `/api/uploadthing`, not `/api/upload/profile`.
- Admin navigation links to `/admin/users`, `/admin/feedback`, `/admin/subscriptions`, and `/admin/affiliates`, but only `/admin` has a page. The sidebar and cards currently point at missing UI routes.

### Contract / Flow Drift

- Plan/limit logic is duplicated in:
  - [`app/api/usage/route.ts`](../app/api/usage/route.ts)
  - [`app/api/notes/route.ts`](../app/api/notes/route.ts)
  - [`app/api/ai/chat/route.ts`](../app/api/ai/chat/route.ts)
  - [`hooks/usePlan.ts`](../hooks/usePlan.ts)
  - [`types/index.ts`](../types/index.ts)
- `lib/api-client.ts` only covers note fetch/delete/process, while the rest of the app uses direct `fetch`.
- `hooks/usePlan.ts` and `hooks/useUsage.ts` both export a `useCanAccess` helper with different backing logic. `hooks/index.ts` renames one of them to avoid collision, which is a sign of overlapping ownership.
- [`app/api/notes/[id]/process/route.ts`](../app/api/notes/%5Bid%5D/process/route.ts) and [`app/api/notes/process/route.ts`](../app/api/notes/process/route.ts) overlap, but only the non-parameterized route emits the Inngest event.
- [`lib/ai.ts`](../lib/ai.ts) defines `createChatStream`, but [`app/api/ai/chat/route.ts`](../app/api/ai/chat/route.ts) builds its own prompt and streaming call.

### Auth / Redirect Drift

- [`lib/arcjet.ts`](../lib/arcjet.ts) redirects unauthenTiCted users to `/sign-in?redirect=...`, but the sign-in page reads `callbackUrl` from Nuqs instead of `redirect`. The middleware and page disagree on the parameter name.
- The sign-in page contains a link to `/forgot-password`, and middleware lists `/forgot-password` and `/reset-password` as public auth routes, but those pages are not present.

### Data / Cache Risks

- `useSubmitQuizAttempt` invalidates stats and leaderboard, but not the quiz attempt list.
- Several pages fetch directly inside the page component instead of using existing hooks, which creates two client data patterns in the dashboard.
- `AppSidebar` always renders `<PlanBadge plan="FREE" />`, so the visible plan badge does not reflect subscription state.

### API / Response Risks

- [`app/api/community/posts/[id]/route.ts`](../app/api/community/posts/%5Bid%5D/route.ts) selects only like `id`s but later computes `isLiked` by reading `userId` from those likes through a cast. That logic is not sound as written.
- [`app/api/webhooks/fapshi/route.ts`](../app/api/webhooks/fapshi/route.ts) imports `headers` but does not validate webhook authenticity.
- [`lib/fapshi.ts`](../lib/fapshi.ts) sets the webhook URL to `/api/payment/webhook`, while the implemented webhook route is `/api/webhooks/fapshi`.
- [`app/api/notes/route.ts`](../app/api/notes/route.ts) computes `isActive` but never uses it.

## Config And Secrets Posture

- Local configuration currently lives in [`.env`](../.env).
- The repo contains values for app URL, auth, OAuth, OpenAI, UploadThing, SMTP, and other integrations.
- Do not duplicate those raw values in docs or commits. Treat `.env` as sensitive operational configuration, even in development.

## Recommended Reading Order

1. [`app/layout.tsx`](../app/layout.tsx)
2. [`providers/QueryProvider.tsx`](../providers/QueryProvider.tsx)
3. [`hooks/index.ts`](../hooks/index.ts)
4. [`lib/query-keys.ts`](../lib/query-keys.ts)
5. [`prisma/schema.prisma`](../prisma/schema.prisma)
6. [`docs/feature-flows.md`](./feature-flows.md)
