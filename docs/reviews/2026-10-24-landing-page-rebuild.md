# Review, feat/data-route-caching-revalidation, 2026-10-24

**Reviewed by**: DeepSeek V4.1 Flash Free (author model not recorded in the working tree)
**Scope**: 206 files, uncommitted (173 tracked changed, 33 untracked, 1428 insertions / 9975 deletions)
**Verdict**: Changes requested

## Summary

This change cuts five product surfaces end to end (community, leaderboard, progress, feedback, affiliate), rebuilds `/` section for section from the approved mockup, and adds a server-prefetched "where you left off" dashboard, with a landing honesty checker wired into `pnpm check`. The discipline is unusually good: no spinner survives, the cut surfaces leave no dangling link or route, and the new tests assert routes, payload shapes and honest empty states rather than markup. Two things should be fixed before merge. The dark CTA band tells the public that the two notes and four quizzes reset every day, while the app enforces both as all-time totals, and the new dashboard server-renders a student's timestamp in the server's timezone, which mismatches at hydration for anyone in Douala. All five gates pass as run by the author (`typecheck`, `lint`, `test --run` 71 files / 622 tests, `ui:check`, `honesty:check`), and I re-ran them.

## Major

### 🟠 The page says the free notes and quizzes reset daily; the app counts them for life, `components/marketing/landing/cta-band.tsx:39`

**Problem**: The sentence reads "Free to start: {2} notes, {4} quizzes and {8} messages to Tip a day." The "a day" attaches to the whole list. Enforcement does not agree. `app/api/notes/route.ts:61-66` counts every note the student has ever created and refuses at two; `app/api/quizzes/generate/route.ts:69-73` does the same for quizzes at four; `app/api/usage/route.ts:41-56` returns those two as bare totals with no window, and only `chatsToday` is bounded by `windowStart`/`nextResetAt`. A student who uploads two notes in January is told they are out of notes for good, having been promised two a day. `tests/app/(marketing)/page.test.tsx:67-84` pins the current wording, so the overclaim is now enforced by a test rather than caught by one. The new honesty checker cannot see this: it only matches vocabulary and number shapes (`scripts/check-landing-honesty.mjs:24-49`).

**Why it matters**: This is a false promise about what the free plan gives, printed on the one page whose entire point is that it makes no false promises, and it is the kind of promise a student discovers by hitting the wall within minutes of signing up. `docs/specs/0014-landing-page-rebuild/index.md:163` and `:184` already assert that the free sentence renders "its daily window from one source, so enforcement and copy move together" — the copy was moved, the window was not. The spec line is wrong too, so fixing the page alone leaves the next author to reintroduce it.

**Suggested fix**: Say only what resets. For example "Free to start: 2 notes and 4 quizzes to try, and 8 messages to Tip a day." Then correct the two spec lines so the next reader does not rebuild the claim, and make the page test assert the reset scope it intends instead of one string. If the intent really is a daily allowance for notes and quizzes, that is a bigger change: add the day window to both routes and to `/api/usage`, then keep the sentence as it is.

### 🟠 A prefetched timestamp is formatted in the server's timezone, `app/(dashboard)/dashboard/dashboard-client.tsx:148`

**Problem**: `new Date(lastAttempt.answeredAt).toDateString()` and the same call at `:194` for the conversation are rendered inside a client component that `app/(dashboard)/dashboard/page.tsx:35-43` server-renders with `HydrationBoundary` data already in the cache. So the date string exists in the server HTML, produced with whatever `TZ` the server has, and is then produced again on the client with the browser's. A student in `Africa/Douala` (UTC+1) whose last attempt landed between 23:00 and 23:59 UTC sees the server's day in the HTML and the next day after hydration: a mismatch, a React hydration warning, and a visibly wrong date. The rest of the app escapes this only because its dates arrive after hydration, which is why this is the first surface where it bites.

**Why it matters**: A React hydration mismatch in the dashboard means React throws away the server subtree and re-renders it, so the first paint flashes and the console fills with errors on every dashboard load in that window. The fix is cheap and the window is the hour a student is most likely to be revising.

**Suggested fix**: Format the date in one fixed zone rather than the host's. `lib/ai/usage.ts:162` already sets `timeZone: "Africa/Douala"`, so use the same zone through a small shared formatter and let both server and client call it. Passing the formatted string out of `getDashboardContinue` would work too, but then the payload carries presentation. Add a test that pins `TZ` and asserts the rendered day, or the same bug returns on the next timestamp.

## Minor

### 🟡 No mutation invalidates the dashboard read, so the continue cards go stale, `lib/query-families.ts:120`

**Problem**: `queryGroups.dashboard` is defined but `invalidateGroups` is never called with it (`hooks/useQuizzes.ts:83,101,133`, `hooks/useNotes.ts:104,124,142,157`, `hooks/usePayment.ts:33`, `hooks/useProfile.ts:16`). The comment at `lib/query-families.ts:89-93` states the opposite: "a submission writes it and then invalidates it". The policy is `CONTENT_LIST`, sixty seconds of `staleTime`.

**Why it matters**: A student submits a quiz, opens the dashboard, and the "Last quiz" card still shows the previous attempt for up to a minute, which is exactly the card the dashboard exists to show. A comment that documents invalidation which does not happen is worse than no comment: the next author will trust it.

**Suggested fix**: Add `"dashboard"` to the invalidate calls that write it — quiz submission and chat conversation creation at least — and correct the comment. If the read is intentionally left to `staleTime`, delete the claim.

### 🟡 The upload panel promises drag and drop it cannot do, `components/marketing/landing/get-started.tsx:36`

**Problem**: The card is styled as a drop zone and says "Drag and drop your files here or click to browse." Nothing in it accepts a drop or a click; the only interactive element is a `Button` that links to `/sign-up` (`:47-49`). It is a server component with no handlers.

**Why it matters**: On a page that ships a script to catch dishonest copy, this is the one claim the script cannot see, and it is the claim a reader will try first. It costs the page the credibility the honesty rule is there to buy.

**Suggested fix**: Either make the panel honest ("Upload a PDF, photo or Word file when you sign in") or make the card a real `Link` that looks clickable and drop "Drag and drop". Keep the dashed border if it reads as a placeholder rather than a control.

### 🟡 Framing headers were relaxed for a reason the headers cannot deliver, `next.config.ts:16`

**Problem**: `X-Frame-Options` goes from `DENY` to `SAMEORIGIN` and CSP `frame-ancestors` from `'none'` to `'self'`, justified by the note page framing its own PDF (`app/(dashboard)/notes/[id]/page.tsx:248`). Both headers control who may frame *this* app; neither affects the app framing someone else. The embedded `note.fileUrl` is an UploadThing URL on `*.ufs.sh`, and the CSP has no `frame-src`, so that iframe falls back to `default-src 'self'` and is blocked in any build where the header is enforced. The change therefore weakens clickjacking protection for every route and cannot fix the thing it names.

**Why it matters**: The security posture drops for the whole app, and the PDF pane it was meant to enable is still blocked. Right now the failure is invisible because `pnpm dev` is not where the header is exercised; a `pnpm build && pnpm start` run would show a blank pane.

**Suggested fix**: Revert both headers and add `frame-src https://*.ufs.sh https://*.utfs.io` so the same-origin PDF actually loads. Then verify the pane against a built server. If some future surface genuinely needs to be framed by our own pages, narrow the relaxation to that path rather than `/:path*`.

### 🟡 The seed creates a known account with a fixed password and no guard, `prisma/seed.ts:18`

**Problem**: `demo@tic.local` / `TicLearn2026` is hashed and written on every seed run, with no environment check and no override from the environment. `pnpm db:seed` against a production database creates a working credential that is published in the repository and printed in the file's doc comment (`:14-15`).

**Why it matters**: Anyone who reads the repo can sign in to any environment that has been seeded, and the account is a normal student with no special handling. The one safeguard is that nobody runs seed in production, which is not a safeguard.

**Suggested fix**: Gate the demo account on an explicit opt-in (`SEED_DEMO=1`) and read the password from the environment, or refuse to run when `NODE_ENV === "production"`. Keep the email public so `/sign-in` can be tested; the password is the part that must not be a constant.

### 🟡 A new lint warning was left behind, `app/(admin)/admin/metrics/page.tsx:749`

**Problem**: Removing the mastery block left a fragment wrapping a single `<div>`: `lint/complexity/noUselessFragments`, reported at `749:15` in the working tree. Nothing else in the diff adds a warning.

**Why it matters**: `pnpm lint` exits 0 because warnings do not fail, so this will merge and join the pre-existing count. The rule the project wrote for itself is that drift comes from additions next to existing patterns, and this is one.

**Suggested fix**: Delete the `<>…</>` pair, or run `biome check --write` on the file.

### 🟡 Removing the user-scoped read left dead code behind a type widening, `lib/cache/reads.ts:59`

**Problem**: With `read:readiness` gone (`:36-38`), every namespace in `READ_NAMESPACES` is `"global"`, so `scope.kind !== expected` no longer overlaps and TypeScript rejects it. The fix applied was `const expected: string = …`, which silences the check for good. The user branch it guards is now unreachable: `readKey` at `:51` and the `!scope.userId` throw at `:63` can never run.

**Why it matters**: The widening is exactly the exhaustiveness signal that would have told the next author "you just made the user scope impossible". It also leaves a `ReadScope` union, a `readKey` branch and an error path that no caller can reach, in a module whose own doc comment says a programmer error should fail loudly.

**Suggested fix**: Drop `ReadScope`'s user variant and the branches that handle it, or keep the user scope and give the types the room to express it. Do not keep `expected: string`.

### 🟡 Mock-era copy and schema comments survived the cut, `app/(admin)/admin/platform-settings/page.tsx:183`

**Problem**: Three references to the deleted mock family remain in copy an admin reads: the enforcement help text at `:183-184` still says "Same as enabling mocks, practice (quizzes + Paper 1/2 mock builds), and AI tutor enforcement at once" while only two switches exist (`:193`, `:200`); `prisma/schema.prisma:487` is a dangling doc comment (`Distinguishes student practice sessions vs admin-only preview sessions on Mock exams (Paper 1 & 2)`) sitting immediately above `enum Plan`; and `prisma/schema.prisma:577` documents `enforceCreditsForPractice` as "Student mock assembly", with `:581` still promising "all four per-area enforce flags below" where two remain.

**Why it matters**: The admin console is where the next person learns what the flags mean. Copy that describes a deleted product teaches them the wrong model, and the orphaned comment attaches a false description to an unrelated enum.

**Suggested fix**: Reword the toggle help to name the two categories, delete the orphaned comment at `:487`, re-describe `enforceCreditsForPractice` as credit gating for quiz generation, and change "all four" to "each".

## Nits

- ⚪ `tests/setup.ts:113`, `knowledgeChunk: { findMany: vi.fn() }` mocks a table this change drops; it is the only remaining mention in the tree outside migration history.
- ⚪ `components/layout/MarketingNav.tsx:60`, `pathname === link.href` is never true for `/#how`-style hrefs, so no header link ever takes its active style. Either drop the comparison or compare `pathname` with the path part.
- ⚪ `public/marketing/note-view-375.webp`, `quiz-question-375.webp`, `tip-answer-375.webp`, about 82 KB committed and referenced nowhere, although `docs/specs/0015-landing-page-mockup/index.md:37` names the 375 hero. Use them at the phone breakpoint or delete them and amend the spec line.
- ⚪ `components/marketing/landing/benefits.tsx:33`, three `<h2>` siblings with no section heading above them; the benefits are page-level features, so one heading plus `<h3>` items would keep the outline honest.
- ⚪ `components/layout/MarketingNav.tsx:34`, the announcement strip is 11px with `tracking` on the primary background; it is the smallest text on the site and it is the first thing read.
- ⚪ `components/layout/MarketingNav.tsx:133,138`, the mobile sheet buttons are `h-11` where the rest of the page uses `min-h-12`; the design system asks for the larger target.
- ⚪ `components/layout/AppSidebar.tsx:127-129`, the sidebar still prints `{streak}-day streak` and `{totalPoints} pts` on every student screen while the dashboard and the landing page deliberately carry no score or streak; the spec's intent and the chrome disagree.
- ⚪ `lib/api-client.ts:191-212` hand-writes the `DashboardContinue` payload that `lib/dashboard-data.ts:17-36` also declares, so the "same shape by construction" claim in `lib/dashboard-data.ts:8-10` holds for the server and not for the client. Import the type.
- ⚪ `components/marketing/landing/hero.tsx:60`, the browser frame shows `app.ticlearn.org` while `app/layout.tsx:41` sets `metadataBase` to `https://ticlearn.ticsummit.org`; one of the two is the product's address.
- ⚪ `app/layout.tsx:20-36`, Geist Mono and Instrument Serif are downloaded and declared for every route, including the admin console, which uses neither.
- ⚪ `constants/index.ts:57`, the FAQ still asks "How do leaderboards work?" on `/faq`; the answer is honest, but the question advertises a feature that no longer exists.
- ⚪ `docs/specs/0015-landing-page-mockup/index.md:60` says dashboard, guard and cut-surface changes are out of scope, while this diff touches all three. Acceptable, since 0014 still governs those parts and 0015 only supersedes the page sections, but the spec's scope line should say so before the next reader trusts it.

## Strengths

- The cut is genuinely end to end. Deleted routes, hooks, nav entries, API handlers, Prisma models and enums agree with each other, and a grep for every removed path (`/community`, `/leaderboard`, `/progress`, `/feedback`, `/affiliate`, `/api/community`, `/api/referral`, `/api/search`, `/api/notifications`, `/api/readiness`, `/api/levels`, `/api/performance`, `/api/quizzes/[id]/status`, `/api/me/ai-usage`) comes back empty. `proxy.ts` drops the same names it stops guarding and adds `/notes` and `/attempts`, which were previously unguarded pages.
- The empty and waiting states are the ones the project asked for: `PendingRegion` with a shape-matched skeleton, `RefreshBar` for content already on screen, a plain read-failure notice, no spinner anywhere. `app/api/dashboard/continue/route.ts` and `app/(dashboard)/dashboard/page.tsx:35-38` call the same `getDashboardContinue`, so the prefetch and the fetch cannot drift in shape.
- The new tests are behaviour-level rather than snapshot theatre: `tests/app/api/dashboard-continue.test.ts` covers 401, the happy path and a 500 that does not leak the cause; `tests/lib/dashboard-data.test.ts` pins the mapping, the nullables and the absence of a score; `tests/app/(dashboard)/dashboard/dashboard-client.test.tsx:126` asserts that "no score" means no score, no streak and no bare percentage. `tests/components/marketing/landing-nav.test.tsx:79` asserts the nav cannot link a cut surface.
- `scripts/check-landing-honesty.mjs` is a real gate, not a decoration: I ran it against `/pricing` and it failed as intended, and it is wired into `pnpm check` alongside `ui:check`.

## Test coverage

Coverage of the new logic is good for the dashboard slice and thin exactly where the two majors are. `getDashboardContinue`, its route, the client, the nav and the footer all have tests; the landing page test asserts sections, anchors, screenshots with alt text and the free-limit sentence.

Gaps worth closing with the fixes above:
- Nothing tests that the free-limits sentence matches enforcement, which is why the "a day" claim survived. A test that reads `FREE_LIMITS`, compares the copy to what `/api/notes` and `/api/quizzes/generate` actually enforce, or simply asserts the reset scope, would have caught it.
- Nothing tests date rendering, and `tests/app/(dashboard)/dashboard/dashboard-client.test.tsx` deliberately does not look at the date lines, so a timezone regression is invisible. Pin `TZ` in a test and assert the day.
- `honesty:check` needs a live server, so it cannot run in the same pass as `pnpm test --run`; it was verified by hand here. Worth a note in `docs/` on what has to be running, since there is no CI.
- The deleted surfaces took their tests with them (`tests/app/(dashboard)/leaderboard/page.test.tsx`, `tests/app/api/community-comments.test.ts` and others), which is correct. `tests/proxy.test.ts` was updated for `/notes`, `/attempts` and the `/chat` → `/dashboard` retarget, which is the right place for it, but nothing asserts that the dropped public paths (`/cookies`, `/primitive-gallery`) stay dropped, and outside the nav and footer tests nothing would notice a cut surface being relinked.
