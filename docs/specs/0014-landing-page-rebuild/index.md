# 0014. Landing page rebuild

**Date**: 2026-10-23
**Status**: Accepted 2026-10-24. Partly superseded by [0015](../0015-landing-page-mockup/index.md). The page sections (AC-2, AC-5, AC-7, AC-16, AC-19, AC-20) are replaced there; the cut surfaces, the dashboard, the guard and the honesty script still stand.

## Summary

The public landing page is rebuilt around the three jobs the product actually does today: upload your own notes, generate quizzes from them, and ask Tip about them. The first screen is a real question to Tip, the proof is a real screenshot of the running app, and no invented claim appears anywhere on the page. For the page to be true, the app is cut back to those three jobs in the same change: community, leaderboard, feedback, the progress page, the dashboard stat cards and the readiness score all go, along with the dead code behind them. Pricing is not decided here; feature 15 rebuilds money, so this page says only what is free and links to `/pricing`.

## Requirements

**User stories**

- As a Cameroonian university student who found TiCLearn in a WhatsApp group, I want to see what this does and try it with my own question in the first screen, so that I sign up because I understood the product, not because a page promised me things.
- As a student who already has an account, I want the home page to take me to my work, so that I never see a sales pitch again.
- As the person running the product, I want every page to promise only what the app does today, so that the page keeps working after any feature changes.
- As a student who lands on a missing page, I want a way to reach a human and a way back into the app.

**Acceptance criteria**

- **AC-1**: Signed in students see only the three jobs. The routes `/community`, `/leaderboard`, `/feedback` and `/affiliate` return not found, no navigation entry or in page link points at them, and no page or component imports their client code.
- **AC-2**: The landing page promises notes, quizzes and Tip and nothing else. It shows no student count, no percentage, no score and no streak, and mentions no community, leaderboard, progress, readiness, exam, mock, GCE, A Level or Paper 1, 2 or 3. `scripts/check-landing-honesty.mjs` checks the built page and fails on a currency amount, a bare percentage, or any banned word, and runs beside `pnpm ui:check`.
- **AC-3**: The dashboard shows recent notes, the last quiz the student touched, the last open Tip conversation and one upload action. It shows no stat cards, no chart, no score and no readiness card, the sidebar shows no readiness badge, and the progress page no longer exists. The attempt review page stays as the one address that reopens a past attempt, and the dashboard's last quiz card points at it.
- **AC-4**: The tables `Post`, `Comment`, `PostLike`, `Feedback`, `Notification`, `RevisionGuide`, `KnowledgeChunk` and `TopicPerformance` are dropped in one migration with their enums and relations, and nothing in the app reads or writes them. The readiness engine, its API route and its dashboard prefetch are removed, and the weekly digest stops reading `TopicPerformance` and loses its readiness cell.
- **AC-5**: At 375 px wide and 640 px tall, the first screen shows the badge, the headline, one sub line, the Tip input, the See how it works link and no more than one micro line, with no scrolling.
- **AC-6**: The page addresses all Cameroonian university and HND students and names no institution. The free limits it states, two notes, four quizzes and eight Tip messages a day, are imported from `lib/plan-limits.ts` and never typed into the page.
- **AC-7**: The page names MTN Mobile Money and Orange Money, says starting is free and that no card is needed, prints no price, amount or currency figure, and links to `/pricing`.
- **AC-8**: The page says it works on a slow connection and on a small Android phone, with no download and no install. It makes no file size, data cost or storage claim.
- **AC-9**: One constants file holds the WhatsApp group link. The landing page, the marketing footer, the contact page and the not found page all read it, and it is the same link on all four.
- **AC-10**: The not found page shows the WhatsApp link, one plain sentence about what may have happened, and links to home and to sign up. It carries no phone number.
- **AC-11**: The page order is hero, demo, the three jobs, what is free, WhatsApp with one closing action, then the footer. There is no FAQ block and no pricing table on the page.
- **AC-12**: The headline sets one phrase in an italic serif in the single accent colour. The page uses one accent colour, with no gradient text, decorative glow, blurred blob or glass card.
- **AC-13**: The hero visual is a real screenshot of the running app inside a frame, with declared width and height and a text alternative that names what it shows. No fabricated interface, stock photograph or generated image appears anywhere on the page.
- **AC-14**: The page is a server component with one client island for the Tip input and nothing else. On a throttled 3G profile the largest contentful paint is 2.0 seconds or less and the layout shift is zero.
- **AC-15**: At 375 px, body text is at least 16 px, every tap target is at least 48 px tall, the input has an accessible name, focus is always visible, and reduced motion is honoured with no animation at all.
- **AC-16**: A signed out student who submits the Tip input is sent to sign in and, once signed in, lands in Tip with the question already written. A signed in student who submits it opens Tip with the question already written. The question travels as `q` through sign in and back, the composer opens with it written and nothing is sent until the student presses send, and `app/chat/page.tsx` reads `q` (today it reads only `note`). The hero form is a plain GET form to `/chat`, so it works with JavaScript off.
- **AC-17**: A signed in student who opens `/` is sent to `/dashboard` before any page content renders, and the three signed in redirects in `proxy.ts` that target `/chat` today (the onboarding gate, the auth page guard and the public page guard) all target `/dashboard`. A signed out visitor who opens a signed in route is sent to sign in. The `/notes` and `/attempts` prefixes are added to `protectedRoutes`, closing the gap where `/notes/[id]` and `/attempts/[id]` only redirect on the client.
- **AC-18**: The dead routes, hooks, components and broken links found in the audit are removed, including the public primitive gallery, the public email template preview, the fourteen uncalled API routes, the seven unused components, the unused hook exports across seven files, and the links to `/practice`, `/quiz/[id]`, `/forgot-password` and `/cookies`.
- **AC-19**: `prisma/seed.ts` seeds one demo note with real looking second year course material. Three screenshots are captured from it, the note view, a quiz question showing one right and one wrong answer, and a Tip answer citing a page, from a signed in development account at 375 px and 1280 px, saved under `public/marketing/` as WebP at 40 KB or less each, so the page can be regenerated after any interface change.
- **AC-20**: The landing page emits a title, a description and a canonical URL, renders them on the server and stays indexable. Sharing cards stay with feature 40.

## Decision

**Chosen option**: Option 2, Two Screens, carrying the local trust block, composed in the shape of the supplied mockup.

The landing page becomes one server rendered page whose first screen is a question to Tip, whose proof is a real screenshot of the app, and whose money section names the two Mobile Money rails without printing a price. The same change cuts the product back to notes, quizzes and Tip, because a page cannot stay honest about a product that still ships four extra surfaces. The design follows the supplied mockup: left aligned hero with a badge, a headline with one phrase in italic serif, a filled primary action with a quiet secondary link, a product panel on the right, and a three step loop with circular icons. It rejects the mockup's invented dashboard pieces (Review next, Topic practice 68%, Progress), because those are the stat surfaces being cut.

**Implementation skills**: none installed for this area. The project's own `docs/design-system.md`, root `AGENTS.md` and spec 0012 govern the build.

## Feature design

### Page composition

| Order | Section | What it must show |
|---|---|---|
| 1 | Header | Brand mark, three anchors (How it works, The three jobs, What is free), Log in, Start studying |
| 2 | Hero | Badge (`For university and HND students in Cameroon`), headline with one italic serif phrase, one sub line, Tip input as primary action, See how it works link, at most one micro line, real app screenshot in a frame at 768 px and up |
| 3 | Demo | The screenshot again at full width on mobile, captioned with the course it came from, then the three jobs as numbered steps with circular icons and thin connectors |
| 4 | What is free | The four free limits from `lib/plan-limits.ts`, one sentence each, and what a paid plan adds without any number |
| 5 | Trust and contact | MTN Mobile Money and Orange Money named in words, the no card sentence, the WhatsApp link, and one closing action |
| 6 | Footer | Product links, legal links, WhatsApp, no phone number |

### Typography and colour

- One sans family for everything, `Geist Sans` self hosted, with `Geist Mono` used only for anything the model read (file names, page references).
- One serif, `Instrument Serif`, used only in italic for the accent phrase in the headline and for the step numerals. It is never used for body text.
- One accent colour, the existing brand violet from the `@theme inline` block in `app/globals.css`, plus one semantic green for a correct answer inside the screenshot and one red for a wrong one. No purple gradient text, no glow.
- Scale at 375 px: display `2.25rem/1.1`, h2 `1.5rem/1.2`, body `1rem/1.6` (never smaller, Android zooms inputs under 16 px), meta `0.75rem`. At 1280 px: display `4rem/1.05`, h2 `2.5rem/1.15`, body `1.0625rem/1.55`.
- Section padding `3rem` at 375 px, `6rem` at 768 px, `8rem` at 1280 px. Text column `34rem`. Horizontal padding 20 px at 375 px, container `1120px` at 1280 px.
- Spacing scale only: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Card radius 12 px. Tap targets 48 px.

### Page copy

These are the strings the build uses. A change to any of them is a change to this spec.

| Where | Copy |
|---|---|
| Badge | `For university and HND students in Cameroon` |
| Headline | `Your course notes. A clearer way to learn.` with `clearer way` in the italic serif |
| Sub line | `Upload a handout, a slide photo or a typed course. Tip reads it, quizzes you on it, and answers from your own material.` |
| Input label and placeholder | `Ask Tip something from your course` |
| Primary action | `Ask Tip` |
| Secondary action | `See how it works` |
| Micro line | `Free to start. No card needed.` |
| Step 1 | `Add your materials`, `A handout, a slide photo or a typed course. Tip reads it and pulls out the topics.` |
| Step 2 | `Understand it with Tip`, `Stuck on a paragraph? Tip quotes your note back, then teaches it.` |
| Step 3 | `Practise with questions`, `Generate questions from any note. Every one traces back to the page it came from.` |
| Free heading | `What is free` |
| Free sentences | `{notes} notes. {quizzes} quizzes. {messages} messages to Tip a day. A paid plan raises the limits.` |
| Money sentence | `Pay with MTN Mobile Money or Orange Money when you are ready. No card needed.` |
| Closing action | `Start with one note.` and a WhatsApp button labelled `Join the WhatsApp group` |
| Meta title | `TiCLearn · Your course notes, taught back to you` |
| Meta description | `Upload your lecture notes, get quizzes from them, and ask Tip about your own material. Free to start for Cameroonian university and HND students.` |
| Not found heading | `That page is not here.` |
| Not found body | `The link may be old, or the page may have moved.` |
| Not found actions | `Go home`, `Start with one note`, and the WhatsApp link |

### Link map

Every destination on the page and in the rebuilt navigation, so no link is invented during the build.

| From | Label | Destination |
|---|---|---|
| Header | `How it works` | `/#demo` |
| Header | `Study tools` | `/#jobs` |
| Header | `What is free` | `/#free` |
| Header | `Log in` | `/sign-in` |
| Header | `Start studying` | `/sign-up` |
| Hero | primary submit | `/chat?q=<question>` (GET form), then sign in and back |
| Hero | `See how it works` | `/#demo` |
| Free | `See the plans` | `/pricing` |
| Trust and contact | WhatsApp | the group link from `constants/contact.ts` |
| Footer product | `How it works` | `/#demo` |
| Footer product | `Study tools` | `/#jobs` |
| Footer product | `Pricing` | `/pricing` |
| Footer product | `About` | `/about` |
| Footer product | `FAQ` | `/faq` |
| Footer product | `Contact` | `/contact` |
| Footer legal | `Terms` / `Privacy` | `/terms` / `/privacy` |
| Not found | `Go home` | `/` |
| Not found | `Start with one note` | `/sign-up` |
| Dashboard | a note card | `/notes/[id]` |
| Dashboard | last quiz card | `/attempts/[attemptId]` |
| Dashboard | last conversation | `/chat/[conversationId]` |
| Dashboard | upload action | `/upload` |
| Sidebar | Home, Upload, Quizzes, Tip | `/dashboard`, `/upload`, `/quizzes`, `/chat` |
| Sidebar account | Subscription, Settings | `/subscription`, `/settings` |

### Data model

This feature adds no entity. It removes eight, and the dashboard reads existing rows.

| Table | Action | Why | What depended on it |
|---|---|---|---|
| `Post`, `Comment`, `PostLike` | drop | community is cut | `app/(dashboard)/community`, two community API routes |
| `Feedback` | drop | the page and the rating prompts are cut | `app/(dashboard)/feedback`, `app/api/feedback`, admin feedback triage |
| `Notification` | drop | nothing ever writes it | unused hook, inert bell |
| `RevisionGuide` | drop | nothing references it | none |
| `KnowledgeChunk` | drop | nothing references it | none |
| `TopicPerformance` | drop | only a dead route wrote it; readiness could never score | `lib/readiness.ts`, `/api/readiness`, dashboard prefetch |

Retained and reused: `Note`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAttemptAnswer`, `Topic`, `TopicNote`, `ChatConversation`, `ChatMessage`, `User`, `Session`, `Account`, `Verification`, `Subscription`, `CreditTransaction`, `CreditPurchaseOrder`, `UserSettings`, `PaymentSettings`, `PlatformSettings`, plus the affiliate tables, which stay for their own spec.

Enums dropped with their tables: `FeedbackType`, `FeedbackStatus`, `NotificationType`. No other enum is touched.

Relations removed from the kept side: `User.posts`, `User.comments`, `User.postLikes`, `User.notifications`, `User.feedbacks`, `User.revisionGuides`, `Topic.performances`, `Topic.knowledgeChunks`, `Note.topicPerformances`, and the `Comment` self relation `CommentReplies`. `Rating` is left alone: no route in this change writes it, and its removal has no owner yet.

### API surface

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/` | GET | none | static server rendered page, one client island | public | none |
| `/api/dashboard/continue` | GET | none | `recentNotes[3]`, `lastAttempt {attemptId, quizId, title, answeredAt}`, `lastConversation {id, title, updatedAt}` | session | 401 |
| `/api/readiness` | delete | none | none | none | 404 after removal |
| fourteen uncalled routes | delete | none | none | none | 404 after removal |

No new public endpoint. The landing form posts to the existing chat route with the question in `?q=`, the same convention spec 0007 already sets for URL state.

### Value sourcing

| Value shown | Source |
|---|---|
| Free limits (two notes, four quizzes, eight messages a day) | `FREE_LIMITS` from `lib/plan-limits.ts`, plus the daily window the count already uses in `app/api/usage/route.ts` (`chatsToday`, verified today) |
| WhatsApp link | one new `constants/contact.ts`, holding the current group invite |
| Payment rails (MTN Mobile Money, Orange Money) | static copy decided in this spec, no logo asset needed |
| Hero and demo screenshots | three captures from the seeded demo note, stored under `public/marketing/` |
| Demo course line under the screenshot | the seeded demo note title |
| The question the student typed | the input value, carried as `?q=` to `/chat`, read by `app/chat/page.tsx`, then through sign in and back |
| Signed in redirect destination | session read in `proxy.ts` |
| Recent notes, last quiz, last conversation | `Note`, `QuizAttempt`, `ChatConversation` for the session user in `lib/dashboard-data.ts` |
| Attempt review address | `/attempts/[attemptId]`, the route that stays |
| Canonical URL origin | `metadataBase` already set in `app/layout.tsx` |
| Price or amount | none, deliberately absent until feature 15 |
| Phone number | none, removed |

### Key invariants

- No amount of money appears anywhere on the public landing page.
- No student count, percentage, score or streak appears on the landing page.
- One accent colour, one serif, one sans, one WhatsApp source, one free limits source.
- The landing page imports one client component, the Tip input island.
- A cut surface has no route, no navigation entry, no link, no API route and no table.
- The `/` redirect for a signed in student runs in `proxy.ts`, so there is no flash of the marketing page.
- The free sentence renders its three numbers and its daily window from one source, so enforcement and copy move together.
- The whole page is one server component plus one island; the screenshots are the only binary assets it loads.

### Security model

- The landing page is public and indexable. Signed in surfaces stay noindex through the rule spec 0012 already sets.
- The Tip input sends nothing until the student is authenticated. The question is carried in the URL, never stored before sign in.
- `/api/dashboard/continue` requires a session and filters every read by `session.user.id`.
- `proxy.ts` adds the `/notes` and `/attempts` prefixes, closing the gap where `/notes/[id]` and `/attempts/[id]` only redirected on the client.
- No phone number, no personal data and no affiliate data appears on any public page.

### Configuration required

None. The WhatsApp link is a constant, not an environment variable, so a copy change never needs a redeploy of secrets.

### Critical test scenarios

- Happy path: a signed out visitor types a question, submits, signs in, and lands in Tip with the question already written. Verifies **AC-16**.
- Happy path: a signed in student opens `/` and arrives on the dashboard with recent notes, the last quiz and the last conversation. Verifies **AC-3**, **AC-17**.
- Failure: with JavaScript off, the page still shows the copy, the WhatsApp link and a form that reaches sign in. Verifies **AC-14**, **AC-16**.
- Failure: the hero screenshot fails to load; the frame keeps its space and the text alternative is read. Verifies **AC-13**, **AC-14**.
- Performance: throttled 3G run on the built page, largest contentful paint 2.0 seconds or less, layout shift zero. Verifies **AC-14**.
- Accessibility: keyboard only pass, visible focus, 200 percent zoom, reduced motion with every animation off. Verifies **AC-15**.
- Permission: a signed out visitor opening `/notes` or `/attempts` is sent to sign in. Verifies **AC-17**.
- Cleanup: every cut route returns not found and no link reaches it. Verifies **AC-1**, **AC-18**.
- Honesty: a page scan finds no price, no student count and no cut feature name. Verifies **AC-2**, **AC-7**.

## Build plan

Tracer Bullet applies: the first slice takes the cut all the way through route, navigation, API and database so the app matches its promise before the new page is designed. The page is then stood up thin (text and input, no images), styled, and thickened with the demo and the money block. Each slice leaves the app working.

1. Remove the cut surfaces end to end: delete the four routes, their API routes, their hooks and their navigation entries. Satisfies **AC-1**.
2. Rebuild the dashboard as a continue surface: recent notes, last quiz touched, last open conversation, one upload action. Remove the stat cards, the readiness card and the sidebar badge. Delete the progress page, keep the attempt review page as the permalink the last quiz card opens, and keep the review inside the quiz page. Satisfies **AC-3**.
3. Drop the eight tables in one migration, remove the readiness engine, its route and its prefetch, remove the `topicPerformances` include and the readiness cell from the weekly digest job, and confirm nothing reads `TopicPerformance`. Satisfies **AC-4**.
4. Create `constants/contact.ts`, point the landing, footer, contact page and not found page at it, rebuild the not found page with WhatsApp only, add the `/notes` and `/attempts` prefixes to the `proxy.ts` guard, and re-point the three `/chat` redirects to `/dashboard`. Satisfies **AC-9**, **AC-10**, **AC-17**.
5. Stand up the landing page thin: a server component with the header, hero copy, the Tip input island, the free section, the WhatsApp closing action and the footer. No images yet. Add `q` handling to `app/chat/page.tsx` so the question arrives in the composer and is not sent. Satisfies **AC-5**, **AC-14**, **AC-16**.
6. Apply the design: the type scale, the italic serif accent, the single accent colour, the spacing rhythm, the header anchors, the three step loop and the responsive behaviour. Satisfies **AC-5**, **AC-6**, **AC-11**, **AC-12**, **AC-15**.
7. Seed the demo note, capture the three screenshots at 375 px and 1280 px into `public/marketing/` at 40 KB or less each, then add the demo section with declared dimensions, a text alternative and a caption. Satisfies **AC-13**, **AC-19**.
8. Write the money and trust copy, confirm the signed in redirect behaviour, and set the page title, description and canonical from `metadataBase`. Satisfies **AC-7**, **AC-8**, **AC-17**, **AC-20**.
9. Remove the dead code and the broken links from the audit, add `scripts/check-landing-honesty.mjs` and wire it beside `pnpm ui:check`, then run it over the final page. Satisfies **AC-2**, **AC-18**.
10. Verify on a throttled 3G profile, by keyboard and with reduced motion, and re check the 375 by 640 fold. Satisfies **AC-5**, **AC-14**, **AC-15**.

## Migration plan

**Strategy**: big bang in one deployment. There is no live data worth strangling, and every removed surface is a product decision that cannot be half kept.

**Phases**:
1. Backup the database, then deploy the code that no longer reads or writes the eight tables, with the routes and navigation already gone.
2. Run the single destructive migration that drops the eight tables, their enums and their foreign keys.
3. Rebuild later on the new page, capture screenshots, and verify.

**Rollback**: restore the pre migration backup and redeploy the previous commit. Writes are frozen from the backup until the migration is verified, so the restored data is not missing the window. A rollback also restores code that writes the eight dropped tables, so the restore only happens together with the revert.

**Risks**: a foreign key hidden in a relation the audit did not name will make the migration fail; the migration is irreversible once the tables are gone; a student with bookmarked links to community or leaderboard will land on the not found page, which is why that page is rebuilt in the same change.

## Consequences

**Positive**:
- The page can only promise what the app does, so it stops going stale.
- The first screen proves the product with an action rather than a claim, which is the strongest fold the research found.
- The schema loses eight unused tables, and the navigation loses four surfaces nobody needs.
- The page renders on the server with one small island, so it paints fast on the phones this product is built for.

**Negative / tradeoffs**:
- No student count or social proof means the page relies entirely on the product being self evident. That is honest, but it converts less well than a large number, and the number is not available yet.
- Saying nothing about price may cost signups until feature 15 lands, because a student on a tight data and money budget wants to know the cost before typing.
- Dropping the tables is irreversible, so any future progress or community feature starts from zero.
- The dashboard loses its scores, which some students read as value even when the number means little.

**Neutral**:
- Feature 15 owns pricing, the public page set and the FAQ, so the landing links out rather than duplicating.
- The affiliate system keeps its tables and is rebuilt under its own spec.
- The screenshots must be recaptured whenever the app interface changes, which is a manual step in the release checklist.
- The weekly digest loses its readiness cell in this change, so its layout is one cell shorter.

## Follow-up

- [ ] Feature 15, the public page set, rebuilds pricing and money, and the landing page gains a real price link once it lands.
- [ ] The affiliate invite only model still needs its own spec. The audit already holds the model: admin creates the link, `PENDING` means invited, the invited student accepts, payout is a ledger, and every self serve path is deleted.
- [ ] Features 36 and 40 own the final metadata, canonical and WhatsApp sized share image.
- [ ] The demo note in `prisma/seed.ts` must be kept in step with the demo section, or the screenshots become stale.
- [ ] `Rating` has no writer after this change and no owner. Decide later whether the quiz result still asks for one, or drop the table with the next cleanup.
- [ ] Re enroll the scope row for feature 14 from done to in progress when this rebuild starts, since the shipped page no longer matches the product.

## Appendix

### A. Dead routes, components and hooks removed by task 9

Uncalled API routes: `app/api/levels/route.ts`, `app/api/me/ai-usage/route.ts`, `app/api/performance/route.ts`, `app/api/subscription/route.ts`, `app/api/chat/messages/route.ts`, `app/api/search/route.ts`, `app/api/notifications/route.ts`, `app/api/community/posts/[id]/route.ts`, `app/api/community/posts/[id]/comments/route.ts`, `app/api/quizzes/[id]/status/route.ts`, `app/api/feedback/exam/route.ts`, `app/api/notes/[id]/process/route.ts`, `app/api/unsubscribe/[token]/route.ts`, `app/api/referral/route.ts`.

Public dead surfaces: `app/primitive-gallery/page.tsx` and `app/dev/email/[template]/route.ts`, plus `/primitive-gallery` in `publicPaths` and `/cookies` which points at no page.

Unused components: `components/app/ProtectedFeature.tsx`, `components/app/PlanBadge.tsx`, `components/theme-toggle.tsx`, `components/add-to-home-screen.tsx`, `components/markdown.tsx`, `components/seo/BreadcrumbSchema.tsx`, `components/chat/chat-message-list.tsx.bak`.

Unused hook exports, removed from the file without deleting exports that are used: `useNotifications`, `useProfile`, `useSearch`, `useCanAccess`, `useApplyReferralCode`, `useAddChatMessage`, `useChatConversation`, `useDeletePost`, `useRetentionData`.

Broken links to remove or point at a real route: `/quiz/[id]` in `dashboard-client.tsx`, `/practice` and `/practice/history` in the chat sidebar and header, `/forgot-password` in the sign in page, `/cookies` in `proxy.ts`, and the exam feedback link in the admin feedback page, which goes with the feedback surface.

### B. Cut surfaces and who links to them

| Surface | Route | Inbound links to remove |
|---|---|---|
| Community | `/community` | sidebar Discover, dashboard, quiz result |
| Leaderboard | `/leaderboard` | sidebar Discover, dashboard, quiz result |
| Feedback | `/feedback` | sidebar Account, marketing footer |
| Affiliate | `/affiliate` | sidebar Account (returns later, invited users only) |
| Progress | `/progress` | sidebar, attempt history links |

## Rationale

Reasoning, the options weighed, the surface audit and the design research: see [rationale.md](rationale.md).
