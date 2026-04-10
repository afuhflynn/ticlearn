# TiCLearn Feature Flows

## Purpose

This document traces how the main product behaviors move through pages, hooks, cache, API routes, Prisma, and external integrations.

## 1. AuthenTiCtion And Session

### Sign up

- UI: [`app/(auth)/sign-up/page.tsx`](../app/%28auth%29/sign-up/page.tsx)
- Client call: `signUp.email` from [`lib/auth-client.ts`](../lib/auth-client.ts)
- Server: Better Auth route [`app/api/auth/[...all]/route.ts`](../app/api/auth/%5B...all%5D/route.ts)
- Persistence: `User`, `Account`, `Verification`
- Email: Better Auth email OTP plugin in [`lib/auth.ts`](../lib/auth.ts) dispatches branded templates from [`lib/email/send.ts`](../lib/email/send.ts)
- Next step: user is sent to `/verify-email?email=...`

### Sign in

- UI: [`app/(auth)/sign-in/page.tsx`](../app/%28auth%29/sign-in/page.tsx)
- Client call:
  - `signIn.email`
  - `signIn.social({ provider: "google" })`
- Session source in UI: `useSession`
- Redirect expectation: page reads `callbackUrl`, but middleware writes `redirect`

### Verify email

- UI: [`app/(auth)/verify-email/page.tsx`](../app/%28auth%29/verify-email/page.tsx)
- Client calls:
  - `/api/auth/email-otp/send-verification-otp`
  - `/api/auth/email-otp/verify-email`
- These endpoints are provided through Better Auth plugin wiring rather than handwritten route files in this repo.

## 2. Note Upload -> Processing -> Ready State

### Upload flow

- UI: [`app/(dashboard)/upload/page.tsx`](../app/%28dashboard%29/upload/page.tsx)
- Upload transport: `useUploadThing("documentUploader")` from [`lib/uploadthing.ts`](../lib/uploadthing.ts)
- Upload router: [`app/api/uploadthing/core.ts`](../app/api/uploadthing/core.ts)
  - checks session
  - returns uploaded file URL

### Note creation

- Mutation hook: `useUploadNote` in [`hooks/useNotes.ts`](../hooks/useNotes.ts)
- API route: [`app/api/notes/route.ts`](../app/api/notes/route.ts)
  - checks auth
  - derives latest subscription
  - counts notes
  - enforces upload limit
  - creates `Note` row with `status: "UPLOADING"`

### Processing trigger

- `useUploadNote` then calls `/api/notes/process`
- Route: [`app/api/notes/process/route.ts`](../app/api/notes/process/route.ts)
  - confirms ownership
  - updates note to `PROCESSING`
  - emits Inngest event `note/process`

### Background processing

- Function: `processNote` in [`lib/inngest/functions.ts`](../lib/inngest/functions.ts)
- Reads note from Prisma
- For PDFs, calls `extractTextFromPDF` in [`lib/ai.ts`](../lib/ai.ts)
- Summarizes via `summarizeText`
- Writes back:
  - `extractedText`
  - `summary`
  - `topics`
  - `status: "READY"`

### Cache impact

- Notes query key: `queryKeys.notes`
- Usage query key: `queryKeys.usage`
- `useUploadNote` invalidates both after upload
- There is no polling hook for processing completion; the page relies on refetch/manual refresh behavior

## 3. Quiz Generation And Submission

### Generate quiz

- UI surfaces:
  - upload page action links into quizzes
  - quiz generation behavior is driven by hooks, not a central shared page-specific service
- Mutation hook: `useGenerateQuiz` in [`hooks/useQuizzes.ts`](../hooks/useQuizzes.ts)
- API route: [`app/api/quizzes/generate/route.ts`](../app/api/quizzes/generate/route.ts)
  - verifies note ownership and `READY` status
  - creates `Quiz` with `status: "GENERATING"`
  - emits Inngest `quiz/generate`
  - falls back to direct AI generation if Inngest send fails

### Async quiz build

- Inngest function: `generateQuiz` in [`lib/inngest/functions.ts`](../lib/inngest/functions.ts)
- AI helper: `generateQuizFromNote`
- Persistence:
  - updates quiz status
  - creates `QuizQuestion` rows

### View quizzes

- Page: [`app/(dashboard)/quizzes/page.tsx`](../app/%28dashboard%29/quizzes/page.tsx)
- Hook: `useQuizzes`
- Route: [`app/api/quizzes/route.ts`](../app/api/quizzes/route.ts)

### Submit quiz

- Mutation hook: `useSubmitQuizAttempt`
- Route: [`app/api/quizzes/attempts/route.ts`](../app/api/quizzes/attempts/route.ts)
- Logic:
  - loads quiz and questions
  - grades answers synchronously
  - creates `QuizAttempt` and `QuizAttemptAnswer`
  - updates `UserStats.totalPoints`, `quizzesTaken`, `avgScore`

### Cache impact

- `useGenerateQuiz` invalidates `quizzes`
- `useSubmitQuizAttempt` invalidates `userStats` and `leaderboard`
- Attempt-specific cache is not invalidated after submission

## 4. Exam Generation And Completion

### Generate exam

- Page: [`app/(dashboard)/gce-exams/page.tsx`](../app/%28dashboard%29/gce-exams/page.tsx)
- Hook: `useGenerateExam`
- Route: [`app/api/exams/route.ts`](../app/api/exams/route.ts)
- AI helper: `generateExamQuestions` in [`lib/ai.ts`](../lib/ai.ts)
- Persistence: creates `ExamSession` with questions stored in JSON and `status: "READY"`

### Complete exam

- Hook: `useSubmitExam`
- Route: [`app/api/exams/[id]/route.ts`](../app/api/exams/%5Bid%5D/route.ts)
- Logic:
  - loads JSON questions
  - grades answers synchronously
  - stores graded answers JSON
  - marks exam `COMPLETED`

### Cache impact

- Exams invalidate `exams`
- Exam submission also invalidates `userStats`

## 5. AI Chat

### UI

- Page: [`app/(dashboard)/chat/page.tsx`](../app/%28dashboard%29/chat/page.tsx)
- Client state/transport: `useChat` from `@ai-sdk/react`
- Guards:
  - `useUsage`
  - `useCheckLimit("chat")`
- Request transport: `useChat({ api: "/api/ai/chat", credentials: "include" })`
- Client rendering uses `UIMessage.parts`, not plain `content` strings

### Route

- [`app/api/ai/chat/route.ts`](../app/api/ai/chat/route.ts)
- Reads subscription and `UserStats.totalChats`
- Applies chat limits
- Increments `totalChats`
- Converts incoming `UIMessage[]` with `convertToModelMessages`
- Streams result from `openai("gpt-5.2-chat-latest")`
- Returns `toUIMessageStreamResponse()` so the client can use SDK-native streaming/state handling

### Notes

- Chat usage is counted before the response stream completes.
- The route uses its own prompt instead of `createChatStream` from [`lib/ai.ts`](../lib/ai.ts).
- Conversation grouping remains local to the page via local storage; the AI SDK owns per-conversation message streaming/state.

## 6. Subscription And Payment Activation

### Pricing UI

- Page: [`app/(marketing)/pricing/page.tsx`](../app/%28marketing%29/pricing/page.tsx)
- Reads current subscription from `/api/subscription`
- Starts checkout via `/api/payment/initiate`

### Payment initiation

- Route: [`app/api/payment/initiate/route.ts`](../app/api/payment/initiate/route.ts)
- Uses `getPlanPrice` and `initiatePayment` from [`lib/fapshi.ts`](../lib/fapshi.ts)
- Creates a pending `Subscription` row first

### Webhook activation

- Route: [`app/api/webhooks/fapshi/route.ts`](../app/api/webhooks/fapshi/route.ts)
- On success:
  - updates subscription to `ACTIVE`
  - stamps `activatedAt`
  - upserts `UserStats`
- On failure:
  - updates subscription to `FAILED`

### Drift

- `lib/fapshi.ts` advertises `/api/payment/webhook`
- Implemented receiver is `/api/webhooks/fapshi`

## 7. Usage, Access Gates, And Paywall

### Central route

- [`app/api/usage/route.ts`](../app/api/usage/route.ts) returns:
  - current plan
  - status
  - feature limits
  - current usage counts
  - boolean gates such as `canUpload`, `canGenerateQuiz`, `canUseAIChat`

### Client consumers

- `useUsage`
- `useCheckLimit`
- dashboard chat/upload pages
- any feature using `ProtectedFeature`

### Duplicate limit owners

- `types/index.ts`
- `hooks/usePlan.ts`
- `app/api/usage/route.ts`
- `app/api/notes/route.ts`
- `app/api/ai/chat/route.ts`

There is no single authoritative shared limit module.

## 8. Community

### List and create posts

- Page: [`app/(dashboard)/community/page.tsx`](../app/%28dashboard%29/community/page.tsx)
- Hooks:
  - `useCommunityPosts`
  - `useCreatePost`
  - `useLikePost`
  - `useDeletePost`
- Routes:
  - [`app/api/community/posts/route.ts`](../app/api/community/posts/route.ts)
  - [`app/api/community/posts/[id]/route.ts`](../app/api/community/posts/%5Bid%5D/route.ts)
  - [`app/api/community/posts/[id]/comments/route.ts`](../app/api/community/posts/%5Bid%5D/comments/route.ts)
  - [`app/api/community/posts/[id]/like/route.ts`](../app/api/community/posts/%5Bid%5D/like/route.ts)

### Persistence

- `Post`
- `Comment`
- `PostLike`

### Cache impact

- Most mutations invalidate `queryKeys.communityPosts`
- Per-post keys exist, but the current hook layer mostly works from the collection key

## 9. Progress, Leaderboard, And Stats

### Dashboard/progress

- Dashboard page: [`app/(dashboard)/dashboard/page.tsx`](../app/%28dashboard%29/dashboard/page.tsx)
- Progress page: [`app/(dashboard)/progress/page.tsx`](../app/%28dashboard%29/progress/page.tsx)
- Hooks:
  - `useUserStats`
  - `useNotes`
  - `useQuizzes`

### Stats routes

- [`app/api/stats/route.ts`](../app/api/stats/route.ts)
- [`app/api/leaderboard/route.ts`](../app/api/leaderboard/route.ts)

### Persistence

- `UserStats`
- derived counts from notes/quizzes/quiz attempts

## 10. Profile, Settings, Notifications, Search

### Profile/settings

- Settings page: [`app/(dashboard)/settings/page.tsx`](../app/%28dashboard%29/settings/page.tsx)
- Hooks exist for profile/settings, but the settings page also performs direct `fetch` calls
- Routes:
  - [`app/api/profile/route.ts`](../app/api/profile/route.ts)
  - [`app/api/settings/route.ts`](../app/api/settings/route.ts)

### Notifications

- Hook: `useNotifications`
- Route: [`app/api/notifications/route.ts`](../app/api/notifications/route.ts)
- Backing model: `Notification`

### Search

- Hook: `useSearch`
- Route: [`app/api/search/route.ts`](../app/api/search/route.ts)
- Searches notes, quizzes, and community posts only

## 11. Feedback And Contact

### In-app feedback

- Page: [`app/(dashboard)/feedback/page.tsx`](../app/%28dashboard%29/feedback/page.tsx)
- Hooks:
  - `useFeedbacks`
  - `useSubmitFeedback`
- Route: [`app/api/feedback/route.ts`](../app/api/feedback/route.ts)
- Model: `Feedback`

### Marketing contact form

- Page: [`app/(marketing)/contact/page.tsx`](../app/%28marketing%29/contact/page.tsx)
- Route: [`app/api/contact/route.ts`](../app/api/contact/route.ts)
- Email sender: `sendEmail` in [`lib/email/send.ts`](../lib/email/send.ts)

## 12. Affiliate Flow

### Affiliate dashboard

- Page: [`app/(dashboard)/affiliate/page.tsx`](../app/%28dashboard%29/affiliate/page.tsx)
- Uses direct `fetch` to `/api/affiliate`

### Referral tracking

- Route: [`app/api/referral/route.ts`](../app/api/referral/route.ts)
- Creates `AffiliateClick` and increments `Affiliate.totalClicks`
- Returns `redirectUrl: "/sign-up?ref__=" + code`

### Gaps

- Sign-up page does not currently consume `ref__`
- `User.referredBy` and `User.refApplied` exist in schema/auth config, but the signup flow shown in this repo does not connect them
- Affiliate conversion and earnings creation are not wired from successful subscription activation

## 13. Admin

### Implemented backend

- Users, stats, subscriptions, feedback admin APIs all exist and enforce admin role.

### Implemented frontend

- Only [`app/(admin)/admin/page.tsx`](../app/%28admin%29/admin/page.tsx) exists.

### Missing frontend

- `/admin/users`
- `/admin/feedback`
- `/admin/subscriptions`
- `/admin/affiliates`

These URLs are linked from the admin dashboard and sidebar but do not currently resolve to pages in the repo.
