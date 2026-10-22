# 0013. Loading states and perceived speed

**Date**: 2026-10-19
**Status**: In Progress

## Summary

TiCLearn has no rule for what a student sees while the app waits, so every screen made one up: 78 spinner render sites, 15 skeletons in the wrong places, and a blank page wherever the server is slow. This spec sets one standard for every student and admin surface. The shape of the content appears at once as a shadcn skeleton, content the student already saw stays on screen while fresh data loads, a real process gets a real progress bar, and a long AI answer streams into a bubble with a caret. Nothing new is installed, and the database changes by one nullable column.

## Requirements

**User stories**:

- As a student on a slow phone connection, I want a screen to show me its shape at once so I know the app is working and I am not staring at a blank page.
- As a student who comes back to a screen, I want the list I was looking at to stay there while fresh data loads so I never lose my place.
- As a student who uploaded a note, I want a real percentage and a real stage list so I know the upload is alive and not lost.
- As a student reading an AI answer, I want the answer to stream into place with a caret so a long answer never reads as broken.
- As a student whose connection dropped, I want to be told plainly and offered a retry so a failed panel never reads as a lost answer.
- As a developer, I want one rule for what to show while waiting so that I stop inventing a loader per screen.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A region that is waiting for its first data renders a skeleton that mirrors the real layout of that region, built from the shadcn `Skeleton` primitive, and no screen in the student app or the admin console renders a bare spinner as its first load state.
- **AC-2**: The skeleton appears as soon as the request starts. Nothing waits before an indicator appears.
- **AC-3**: No spinner appears anywhere in the student app or the admin console. Where content is already on screen and fresh data is loading, the content stays, a thin indeterminate bar appears at the top of the region, and the content dims slightly. A poll the app started on its own, such as the three second poll that watches a note being processed, dims nothing and shows no bar. Only a mount or a refresh the student asked for does.
- **AC-4**: Returning to a screen the student has already seen shows the previous data at once, with the thin bar and no skeleton. The named list hooks, `useNotes`, `useQuizzes`, `useCommunity` and `useLeaderboard`, keep the previous data. The id keyed hooks, `useNote`, `useQuiz`, `useQuizAttempt` and `useChatConversation`, never do, because a previous record shown under a new title is worse than a skeleton. `useMessagesPaginated` takes the family policy from `lib/query-families.ts` like every other hook, because today it sets none of its own.
- **AC-5**: Typing in a search box or changing a filter keeps the current results on screen and dims them slightly while the new results load. This covers the community search, the quiz scope filter and the note search. No skeleton and no empty list.
- **AC-6**: A skeleton appears only where the shape of the real content is known. A region whose shape is not known shows a neutral block or nothing.
- **AC-7**: Every surface this spec touches shows its empty state through the shared shadcn `Empty` primitive, so "nothing here yet" is one pattern and not a hand written paragraph per screen.
- **AC-8**: A process shows a progress bar with a real number where the byte count or the step count is known, and a list of the named stages where it is not. A process never shows a skeleton.
- **AC-9**: The note upload shows a real byte percentage taken from the upload client's progress callback, not an indeterminate spinner.
- **AC-10**: The note processing shows the named stages, the stage that is running, and the step count out of the total, and the stage the interface shows is the one the background job records. Every run of the job overwrites the stage at the start, so a note that is processed again starts from the first stage, and a failure leaves the stage where it failed.
- **AC-11**: A wait that crosses ten seconds replaces the skeleton with a plain line that says what is happening and roughly how long it will take. The ten seconds are measured on the client clock from the moment the wait began, never against a server date, because a phone with the wrong time would otherwise see the line too early or too late. The estimate itself is a fixed phrase, not a number computed from a server date.
- **AC-12**: The AI answer streams into the message bubble and the bubble grows. A caret sits at the end of the text while tokens arrive. There is no skeleton or placeholder in place of the answer. When the answer fails, the bubble shows a plain line and a retry that re-sends the last user message through the same transport the send button uses.
- **AC-13**: The thinking line appears inside the message bubble before the first token and the first token replaces it. It is the only thing shown while the model has not answered.
- **AC-14**: The root `Suspense` in the root layout has a real fallback, a neutral shell with the brand mark and generic blocks and nothing else, so the document paints something even when no content can be streamed. The blocks are generic because the shape of the content is not known at that level.
- **AC-15**: A read that fails because the device is offline shows a plain notice that says the connection dropped, with a retry button. It shows no skeleton and no generic error. The failure is recognised as a lost connection because the request had no response at all, which is what `lib/api-client.ts` names when it raises the network failure.
- **AC-16**: A read that fails on a surface that has other content shows that content plus a notice. The global error page is styled to the design system and offers a retry.
- **AC-17**: The swap from a skeleton to content is a short cross fade. When the reader has asked for reduced motion, the skeleton is a static block and the swap is instant. The swap uses the reduced motion hook from the installed motion library, and the skeleton pulse is stopped by a media query in the global stylesheet, because the pulse is a continuous repaint and that costs data on the phone this project is built for.
- **AC-18**: The admin console follows the same standard as the student app, and each of the seven metrics panels, Overview, Engagement, Learning, Growth, Monetization, Retention and Data, has a skeleton that matches its own shape.
- **AC-19**: The public pages that are prerendered show no loading state at all.
- **AC-20**: The auth screens render the form at once and resolve the session in the background. They show no loader.
- **AC-21**: A waiting region is marked busy for assistive technology, its decorative blocks are hidden from it, and the caret is hidden from it.
- **AC-22**: The convention checker fails when a raw spinner or a hand written loader appears outside an agreed allowlist, and the rule is written into the root `AGENTS.md`. The rule reports any `Loader2` or `Loader` import outside `components/ui/` and `components/ai-elements/` that is not inside a `Button`, and `scripts/loading-allowlist.json` holds the file paths that are allowed, each with a one line reason. A spinner inside a button that is performing the student's own action is not a loading state and is never reported.
- **AC-23**: The unit tests cover the shared primitives, and a browser test proves that a screen with fast data shows no loader at all.
- **AC-24**: One run on a throttled phone connection records the largest contentful paint and the responsiveness numbers before and after, and the numbers are recorded in the pull request. The run is a Playwright script with the network throttled to a phone connection, and it is the same script that runs before and after, so the two sets of numbers are comparable.

## Decision

**Chosen option**: Option 1: Section skeletons in the screens, with shared primitives

The content of a screen is wrapped in one shared region component that renders the region's own skeleton while it has no data, keeps the previous data on screen while it refreshes, and swaps between them with a short cross fade. The skeleton for each card is authored next to the screen that uses it, so the shape cannot drift from the real thing. Processes get a progress bar, the chat answer gets a caret, and no screen in the student app or the admin console shows a spinner.

**Implementation skills**: `context7` (installed, the right tool for checking the loading file and `Suspense` behaviour in this Next.js version before the build starts; root `AGENTS.md` has no `## Agent skills` section, so it is only found by luck).

**Design source**: `docs/design-system.md` and the shadcn primitives in `components/ui/`. No new visual direction is invented here. The engineer's written instruction for this row, that the standard is shadcn skeletons at the level of the section rather than a whole page block, is the direction this decision follows.

**The one pattern**:

```tsx
// A region waits, shows its own shape, and keeps what it already had.
<PendingRegion
  fallback={<NotesCardSkeleton />}   // authored next to this screen, mirrors the real card
  isPending={isPending}             // true only when the region has no data at all
  isRefreshing={isFetching && !isPending}
  label="Your notes"
>
  {notes.map((note) => <NoteCard key={note.id} note={note} />)}
</PendingRegion>

// A process is never a skeleton. It is a bar with a real number, and named stages.
<ProcessProgress
  stage={note.processingStage}   // EXTRACTING | SUMMARIZING | INDEXING, written by the job
  steps={NOTE_STAGES}            // the same ordered list, so the count is real
  failed={note.status === "ERROR"}
/>

// The chat answer grows. The caret sits at the end of the text while tokens arrive.
<Streamdown mode="static">{message.content}</Streamdown>
{message.content ? <StreamingCaret /> : null}
```

**The rule in one paragraph**: a region that has no data shows the shape of what is coming, at once, as a skeleton; a region that has data keeps it, dims it a little, and shows a thin bar at its top; a process shows a bar with a real number and the names of its stages; a long answer streams in with a caret; a failed read shows a plain notice and a retry; a spinner is not a loading state anywhere in the student app or the admin console, and the only spinner left in the codebase is inside a button that is performing the student's own action.

## Feature design

**Data model sketch**:

One migration. One new enum and one new nullable column. Nothing else in the schema changes.

```prisma
enum NoteProcessingStage {
  EXTRACTING
  SUMMARIZING
  INDEXING
}

model Note {
  // ... existing fields unchanged ...
  processingStage  NoteProcessingStage?  @map("processing_stage")
  // @@index([status]) already exists and covers the polling read
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `Note.processingStage` | `NoteProcessingStage` | nullable | The stage the note pipeline is in. Null before the job starts and after it finishes. Written only by the `processNote` Inngest function |

- The enum order is the stage order, so the step count is the index of the current stage plus one, out of three.
- The writer is `lib/inngest/functions.ts`, at three points in the `processNote` function: before the file type switch (`EXTRACTING`), before `summarizeText` (`SUMMARIZING`), and before `attachTopicsToNote` (`INDEXING`). The job already sets `status` to `PROCESSING` at the start and `READY` or `ERROR` at the end, so the two fields together describe the pipeline.
- Every run of the job overwrites the stage at the start, so a note that is processed again starts at `EXTRACTING` again. When the job fails, the stage is left as the stage it failed in and `status` becomes `ERROR`, so the interface can name the stage that broke. A note that is `PROCESSING` with a null stage is one that failed before the extraction began, and the interface shows the first stage as the one that failed.
- The reader is `getDashboardNotes` in `lib/dashboard-data.ts`, which already produces the notes payload for `GET /api/notes` and for the dashboard prefetch. The stage is added to the `NoteSummary` type in `types/index.ts`.
- `Quiz` gets no stage column. `Quiz.status` stays as it is, and the quiz process indicator is a plain line with a fixed estimate, measured on the client clock from the moment the wait began.
- After the migration, `pnpm db:generate` must run, because the Prisma client generates into source and is gitignored.

**State transitions** (the loading state of a region):

```
idle → first load (skeleton) → content → background refresh (thin bar, dimmed) → content
first load → first load → failed (plain notice with a retry) → first load
```

```
process: uploading (real byte percentage) → processing (stage list, step N of 3) → ready
                                                  ↘ failed (the stage it failed in, plus a retry)
```

```
chat: submitted (thinking line inside the bubble) → streaming (bubble growing, caret at the end) → ready
                                                  ↘ error (a plain line inside the bubble, plus a retry)
```

**API surface**: no new endpoints. One existing response gains one field.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/notes` | GET | none | `{ notes: NoteSummary[] }`, each note gains `processingStage` | session cookie, 401 | 401, 500 |
| `/api/notes/[id]` | GET | note id | the note, gains `processingStage` | session cookie, owner only, 401 and 403 | 401, 403, 404 |

- A retry after a failed read is a refetch of the same GET through the query client. There is no retry endpoint.
- The upload percentage comes from the upload client itself, so no route changes for it.
- The chat transport is untouched. The caret, the thinking line and the retry are client side, and the retry re-sends the last user message through that same transport.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| A region waiting for its first data | Whether the region has any data yet | TanStack Query `isPending` on the hook that owns the data |
| A region refreshing | Whether a request is in flight over existing data | TanStack Query `isFetching` and `isPending` on the same hook |
| The skeleton shape | The blocks that stand in for the real content | The screen's own skeleton file, authored next to the screen and mirroring the real card's layout |
| The thin refresh bar | Whether the bar is drawn | Derived from `isFetching && !isPending` |
| The content dim while refreshing | The dim amount | A new dim opacity token in the `@theme inline` block of `app/globals.css`. No such token exists today, and the global stylesheet has only a shadow opacity token, so it is added in the first slice |
| The background poll | Whether a refresh was the app's own doing or the student's | The query client, which knows the difference between a poll the hook set and a fetch the student triggered. The hooks that poll are `useNotes`, `useQuizzes` and `useAdmin` |
| The previous data on a revisit | The data already on screen | The value the query client already holds for that key, which the named list hooks ask it to keep while a new one loads |
| The upload percentage | The percentage of bytes sent | The upload client progress callback, the same one the chat composer already uses |
| The note processing stage | The stage the pipeline is in | `Note.processingStage`, written by the `processNote` job |
| The processing step count | The step out of the total | The order of the `NoteProcessingStage` enum, three values, so the count is the index plus one |
| The processing stages | The names of the stages | One ordered list in the app, the same list the enum order describes, so the interface and the database cannot disagree |
| The quiz generation estimate | What the line says and when it appears | A fixed phrase for the expected duration, and the elapsed time measured on the client clock from the moment the wait began. The server date `Quiz.createdAt` is not used for the estimate, because a phone with the wrong clock would show the line at the wrong time |
| The ten second threshold | When a plain line replaces a skeleton | A constant in the shared region component, measured on the client clock from the moment the wait began |
| The chat caret | Whether tokens are still arriving | The chat transport status `streaming` from `useChat` |
| The thinking line text | The name of the tutor | The tip name constant the chat already uses |
| The chat retry | The resent user message | The last user message, sent again through the existing chat transport, the same path the send button uses |
| The offline notice | Whether the failure was a lost connection | The network failure raised by `lib/api-client.ts` when the request had no response. That failure is not distinguishable today, because the client throws a plain error for it, so the client names it as part of this build |
| The retry action | The fresh read | A refetch of the failed query through the query client |
| The reduced motion behaviour | Whether to fade or swap instantly | The `prefers-reduced-motion` media query, which the design system already requires and which nothing in the repo reads today. The swap uses the reduced motion hook from the installed motion library, and the skeleton pulse is stopped by a media query added to the global stylesheet |
| The busy state for assistive technology | The busy flag and the hidden decoration | The `aria-busy` attribute on the region and `aria-hidden` on the decorative blocks and the caret |

**Key invariants**:

- No screen in the student app or the admin console shows a spinner as a loading state. A spinner inside a button performing the student's own action is allowed and is not a loading state.
- A skeleton is used only where the shape of the real content is known.
- A process never shows a skeleton.
- Content that is already on screen is never removed to make room for a skeleton.
- A poll the app started on its own never dims the content and never shows the refresh bar.
- A skeleton is a promise about the shape of the content, so a skeleton whose shape does not match the real content is a defect and not a rough edge.
- One slow region never blocks the rest of the page.
- The prerendered public pages show no loading state.
- Every waiting region is marked busy for assistive technology, and the decorative blocks and the caret are hidden from it.
- Every skeleton is authored next to the screen it belongs to, and mirrors that screen's real layout.
- The convention checker fails on a loader that is not on the allowlist.

**Security model**:

No compliance scope is triggered, and no new data is created or exposed. The skeletons show generic blocks and never another student's data: the leaderboard and community skeletons are shape only, with no names, no scores and no avatars. The retry button refetches the same read the session already authorizes, so it opens no new path. The offline notice shows no request content, and the stage column exposes nothing that the note's owner could not already see from the note's own status. The admin skeletons show shape only and the admin role check stays where spec 0012 put it, in `proxy.ts`.

**Configuration required**: none. No new environment variable, no new credential, no flag, and no new package. Everything is built from what is installed: the shadcn `Skeleton`, `Progress`, `Spinner` and `Empty` primitives, the `motion` library that is already installed for the cross fade, and TanStack Query for the pending and fetching states.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a student opens `/quizzes` on a slow connection, the three quiz cards appear as skeletons at once, the cards land, and the skeleton is replaced with a short cross fade, verifies **AC-1**, **AC-2**, **AC-17**.
- Revisit: a student comes back to `/notes`, the previous list is on screen with the thin bar at the top and no skeleton anywhere, verifies **AC-4**, **AC-3**.
- Background poll: a note is being processed, so the notes list polls every three seconds, and the list does not dim and shows no bar while it polls, verifies **AC-3**.
- Search: a student types in the community search box, the current posts stay on screen and dim slightly while the new results load, verifies **AC-5**.
- Process: a student uploads a note, the bar shows a real byte percentage, then the stage list shows step one of three, extracting, and the stage matches what the job wrote, verifies **AC-8**, **AC-9**, **AC-10**.
- Long wait: a quiz generation crosses ten seconds, the skeleton is replaced by a plain line that says what is happening and roughly how long it will take, verifies **AC-11**.
- Chat: a student sends a message, the thinking line appears inside the bubble, the first token replaces it, and the caret sits at the end of the text while the rest of the tokens arrive, verifies **AC-12**, **AC-13**.
- Failure: the phone loses signal while the note list is open, the list shows the connection notice with a retry, not an empty panel and not a generic error, verifies **AC-15**.
- Failure with content: a read fails on a screen that has other content, the other content stays and a notice appears beside it, and the global error page is styled with a retry, verifies **AC-16**.
- Reduced motion: with reduced motion turned on, the skeleton is a static block and the swap to content is instant, verifies **AC-17**.
- Admin: an admin opens `/admin/metrics`, and each of the seven panels shows a skeleton matching its own shape, verifies **AC-18**.
- Enforcement: a bare `Loader2` is added to a screen that is not on the allowlist, `pnpm ui:check` fails, verifies **AC-22**.
- Accessibility: a waiting region is marked busy, and the decorative blocks and the caret are not announced, verifies **AC-21**.

## Build plan

Ordered as thin end to end slices, which is the project's Tracer Bullet approach: each slice is one surface taken all the way through the rule, the primitives and the check, so the standard is proven on a screen before it is copied across the app.

1. The shared primitives and the enforcement: `components/ui/pending-region.tsx` with `PendingRegion` and `RefreshBar`, `components/ui/process-progress.tsx` with `ProcessProgress` and `ProgressLine`, the `StreamingCaret` in `components/ai-elements/`, the dim opacity token and the reduced motion media query in `app/globals.css`, the reduced motion hook from motion for the swap, the network failure named by `lib/api-client.ts` so that a lost connection is distinguishable from a server error, the allowlist file `scripts/loading-allowlist.json`, the new rule in `scripts/check-ui-conventions.mjs` that reports a `Loader2` or `Loader` import outside the primitives folders that is not inside a `Button`, and the rule written into the root `AGENTS.md`. The rule reports rather than fails at first, so the whole list of spinners is visible, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-15**, **AC-17**, **AC-21**, **AC-22**.
2. The first surfaces, end to end: `/dashboard`, the one route that waits on the server during the render, and the auth screens, which today block the whole sign in form behind a session spinner. The dashboard gets the only route level loading file in the app, the section skeletons for the four stat cards, the notes card, the quizzes card and the readiness card, the auth screens render the form at once and resolve the session in the background, and the root `Suspense` gets its neutral fallback shell, satisfies **AC-1**, **AC-6**, **AC-14**, **AC-16**, **AC-20**.
3. The student list surfaces: `/notes`, `/quizzes`, `/progress`, `/leaderboard`, `/community`. Each gets a skeleton file next to its screen, `useNotes`, `useQuizzes`, `useCommunity` and `useLeaderboard` keep the previous data while the id keyed hooks stay as they are, `useMessagesPaginated` takes the family policy from `lib/query-families.ts` like every other hook, the community search, the quiz scope filter and the note search keep the current results, and the empty states move onto the shared `Empty` primitive, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-7**.
4. The process surfaces: the migration adding `NoteProcessingStage` and `Note.processingStage`, the `processNote` job writing the stage at each phase and overwriting it at the start of every run, the notes read exposing it, the upload percentage, the stage list on the upload and note screens, and the plain line with a fixed estimate for a quiz past ten seconds, satisfies **AC-8**, **AC-9**, **AC-10**, **AC-11**.
5. The chat: the thinking line inside the bubble with the spinner taken out of it, the caret at the end of the streaming text, the bubble that grows, the retry that re-sends the last message through the same transport, and the removal of `components/ai-elements/loader.tsx` if nothing else imports it, satisfies **AC-12**, **AC-13**.
6. The admin console: all ten admin pages, including a shape matched skeleton for each of the seven metrics panels, satisfies **AC-18**.
7. The failure states: the offline notice with a retry, the failed read notice beside existing content, and the global error page styled to the design system with a retry, satisfies **AC-15**, **AC-16**.
8. The public surfaces: the prerendered pages show no loading state, and the marketing navigation stops reserving space with a skeleton and renders the signed out buttons until the session resolves, satisfies **AC-19**.
9. The proof: the unit tests for the shared primitives, the browser test that a fast screen shows no loader, and a Playwright script that throttles the network to a phone connection and records the largest contentful paint and the responsiveness numbers before and after into the pull request, satisfies **AC-23**, **AC-24**.
10. The sweep and the switch: every one of the 78 spinner render sites is either deleted or moved inside a button, each remaining one is on `scripts/loading-allowlist.json` with a one line reason, and the rule in `scripts/check-ui-conventions.mjs` switches from reporting to failing, satisfies **AC-3**, **AC-22**.

## Consequences

**Positive**:
- A student on a slow connection sees the shape of the page at once instead of a blank screen or a lone spinner.
- A student who comes back to a screen never loses the list they were reading.
- A student who uploads a note sees a real percentage and a real stage list, so an extraction that takes two minutes no longer reads as a lost upload.
- The chat answer streams into a bubble with a caret, so a long answer no longer reads as a stalled one.
- The bare root `Suspense` gets a fallback, which also fixes the blank page that every route shows today with JavaScript turned off.
- The rule is enforced by a script the project already runs, so it survives the next screen.

**Negative / tradeoffs**:
- Every surface needs its own skeleton file, so the work is spread across the tree and the diff is wide. A screen that has no skeleton yet is still a screen that shows nothing while it waits.
- A skeleton that appears at once still flashes for a query that returns in two hundred milliseconds. The flash is less ugly than a spinner because the shape does not shift, but it is a flash.
- Keeping the previous data on screen means a student can read a value that is about to change, for example a leaderboard that is a minute old, without being told it is stale. The thin bar is the only signal.
- The stage column is one more write on the note pipeline, and the pipeline now has two fields that have to agree.
- A skeleton is a promise, and a promise that is broken by a later design change will look worse than the spinner it replaced.
- The allowlist is a place where the rule can leak. Each entry needs a reason, and a reason that says "later" is how the rule dies.
- The app has to tell a poll it started from a refresh the student asked for, so every hook that polls now carries that distinction. A hook that gets it wrong dims the page every three seconds, which is worse than the flash the feature removes.
- The throttled run proves the numbers on a build machine and a simulated network, which is not a real phone on a real network. It bounds the improvement, it does not measure the student's experience.

**Neutral**:
- No new package, no new environment variable, and no new endpoint.
- The cache and the render strategy are untouched. Spec 0010 and spec 0012 keep their own ground, and this spec only changes what is drawn while they finish.
- The chat interface rebuild, scope row 18, keeps the layout and the activity line. This spec owns the thinking line and the caret only.
- Scope row 21 keeps the upload transport and scope row 25 keeps the offline packs. This spec owns the indicators only.
- Scope row 33 keeps the bar on a low end phone, and this spec obeys it: a skeleton that repaints continuously is a data cost on that device, so the reduced motion path is a static block and the cross fade is short.

## Follow-up

- [ ] The scope row for this feature says "nothing under a second shows a loader". The engineer chose that the shape appears at once and that no spinner ever appears, so that line in `docs/scope/platform.md` needs to be amended to say that a shape matched skeleton appears at once and that no spinner appears for any wait.
- [ ] The `context7` skill is installed and is the right tool for checking the loading file and `Suspense` behaviour in this Next.js version, but the root `AGENTS.md` has no `## Agent skills` section listing it, so it is only found by luck. Spec 0012 recorded the same gap.
- [ ] The ten hand written empty states on the screens this spec does not touch stay hand written. The shared `Empty` primitive is used on every surface the spec touches, and the rest is a cleanup for a later pass.
- [ ] `hooks/useMessagesPaginated` bypasses `lib/query-families.ts` entirely and has no stale time, so the chat message list has no policy of its own. It is a query policy problem rather than a loading state problem, so it belongs to spec 0010's ground, but the loading state of the chat list depends on it. This spec takes it anyway, because the chat list needs the previous messages on screen, and that is the one thing it cannot do without a policy.
- [ ] No hook returns `isError` and no screen renders a read failure, so the failure states in AC-15 and AC-16 have no source today. Wiring the error state of the query into the surface is part of the build, and it is worth naming that it touches every hook that returns `isLoading`.
- [ ] Nothing records which screens are actually slow. A server side record of a slow first load would tell us where to spend the next round, and spec 0010 already records first byte timings for the chat. This spec does not add it, because the measurement it does add is the throttled run.
- [ ] The rule that a screen the student has seen paints its previous data was written in spec 0010 and applied only to the admin hooks. This spec settles it for the student hooks as well, so spec 0010's acceptance criteria read narrower than the code will be. Flagged here so the two specs do not drift.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md` and `docs/design-system.md`: the design system, the primitives layer, the reduced motion rule
- `docs/research/seo-and-rendering.md` section 7: the loading state research this spec applies, including the thresholds and the rule set
- `docs/scope/platform.md` row 35: the feature this spec is linked to, and the engineer's written instruction on skeletons at the level of the section
- spec 0010 caching and cold start speed: the previous data rule, the query family policy, and the boundary of this spec
- spec 0012 rendering strategy and streaming boundaries: the shell that paints first, and the loading boundary it hands over
- spec 0004 design system and UI toolkit convention: the primitive layer and the convention checker this spec extends
- `scripts/check-ui-conventions.mjs` and `scripts/ui-conventions-baseline.json`: the checker that grows the loader rule
- The current code: zero `loading.tsx` files, one bare `Suspense` in `app/layout.tsx`, fifteen skeleton render sites across four student routes, 78 spinner render sites across 36 files, no delay threshold, and the chat thinking line that stops at the first token

**Practices & standards**:
- Nielsen Norman Group, skeleton screens: skeletons for a full page load, a spinner for a single module, a progress bar for a process
- Nielsen Norman Group, response time limits: one tenth of a second, one second, ten seconds
- Core Web Vitals thresholds: largest contentful paint, interaction to next paint, cumulative layout shift
- Optimistic rendering for the user's own action
- Streaming the first token into the region it belongs to, rather than into a placeholder
- Progressive disclosure: a known shape is shown as a skeleton, an unknown shape is not
