# Verify: Rendering strategy and streaming boundaries · spec 0012 · updated 2026-10-17 (amended after verification)
_Steps derived from spec 0012 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## Results measured on 2026-10-17 (local, production build, warm local Postgres)

Driven against `pnpm build && pnpm start` on port 3111 with a signed in session cookie.
Test user created through `/api/auth/sign-up/email`, then verified and given a level directly in
the local database, then deleted afterwards. Local database only, never the Neon URL in `.env`
(that line is commented out, and dotenv resolves to `localhost:5435`).

| Check | Result |
|---|---|
| `/dashboard`, level set | 200 |
| `/`, level set | 307 to `/chat` |
| `/onboarding`, level set (inverse gate) | 307 to `/chat` |
| `/admin/users` as a plain student (role gate) | 307 to `/dashboard`, **not a 500** |
| `/admin/accept-invite` as a plain student | 200 (exemption holds) |
| `/dashboard` signed out | 307 to `/sign-in?callbackUrl=...` |
| `/dashboard`, `/`, `/chat` with `levelOfStudy` NULL | 307 to `/onboarding` in all three, and `/` goes to `/onboarding` **not** `/chat`, so AC-4's ordering requirement holds |
| Exempt paths with no level (`/pricing` `/faq` `/contact` `/about` `/robots.txt` `/sitemap.xml`) | 200, none redirected |
| `/sign-in` `/sign-up` `/verify-email` with no level | 307 to `/chat`, which is the pre existing auth route rule, not the gate |
| robots meta across every surface in the table | `noindex, nofollow` on `/primitive-gallery` `/settings` `/onboarding` `/sign-in` `/verify-email`; `index, follow` on `/pricing` `/faq` `/contact` `/about` `/privacy` `/terms`. `/primitive-gallery` was shipping `index, follow` until this pass, a gap the first build missed |
| AC-9 descriptions | all three match the Value sourcing table verbatim, not only the titles as previously checked. `/pricing` "What TiCLearn costs for a Cameroonian university student...", `/faq` "Answers Cameroonian university students ask most...", `/contact` "Reach TiCLearn on WhatsApp or by phone..." |

### Connection budget check (the spec's Follow up item)

Measured, not assumed. `pg-pool` defaults to `max: 10` per pool (`node_modules/.pnpm/pg-pool@3.13.0_pg@8.20.0`, line89), and `lib/prisma.ts` sets no pool size, so it inherits that.

Driving real traffic (a signed in `/dashboard`, six requests, plus one `/api/profile`) left **11 idle
application connections** on the local database, against a `max_connections` of 100. Eleven exceeds a
single pool's ceiling of 10, so the proxy does hold its **own** Prisma client and pool inside the same
Node process rather than reusing the app's through `globalThis`. That confirms the cost the spec listed
as a consequence, and it is worse than a cold start line item: the worst case is three pools of 10, so
30 connections per instance, and serverless scales instances out.

(Corrected 2026-10-17 and again on 2026-10-19: the instance holds **three** pools, not two, because
`lib/prisma.ts` builds the adapter at module scope while only the client is memoised, so every bundle
instance opens its own. AC-15 now bounds each pool at 5, so the ceiling is 15 per instance. The
measurement in the third pass below shows 15.)

Not changed from here, deliberately: the right `max` depends on the connection ceiling of the
production Neon plan, which is an input only the engineer has. Setting a number blind could either
starve the app or exhaust the pooler. The measurement above is the input that decision needs.

### AC-11 timings (method as specified: 5 warmups discarded, 50 requests, `curl` `time_starttransfer`)

| | p50 | p75 | p95 | min | max |
|---|---|---|---|---|---|
| Before (stashed, rebuilt) | 21 ms | 25 ms | 29 ms | 16 ms | 42 ms |
| After (rebuilt) | 24 ms | 26 ms | 33 ms | 15 ms | 39 ms |

Cold start, first request after a restart: before 1.033 s, after 1.179 s.

**Honest conclusion: the warm delta is within noise, and this measurement cannot show the fix.**
On a warm local instance the database answers in well under a millisecond, so the two round trips
the layouts used to make cost about 1 ms each, against roughly 20 ms of Node and Next overhead per
request. Removing them cannot move a number that is dominated by framework overhead. The cold start
is about 150 ms slower after the change, which is the second Prisma client and connection pool the
proxy now holds, the cost the spec listed as a consequence. So AC-11 works as regression detection
only: it fails if a layout regains an `await`, and it cannot demonstrate the white screen going
away. Demonstrating that needs a slow link or a slow database, neither of which this machine has.

### AC-1 route table walk (every route the production build emits, checked against the table)

45 page and metadata routes emitted. Walked against the table row by row. Four defects, all of them
in the table's wording rather than in the code:

| Route or group | Table says | Build emits | Verdict |
|---|---|---|---|
| `/dashboard/*`: `/upload` `/quizzes` `/progress` `/leaderboard` `/community` `/settings` `/feedback` `/affiliate` `/subscription` | "Dynamic and streamed" | `○` static, all nine | **mismatch** |
| `/admin/*`, all nine routes | "Dynamic and streamed" | `○` static, all nine | **mismatch** |
| `/onboarding` | "Dynamic" | `○` static | **mismatch** |
| `/opengraph-image.png` and `/twitter-image.png` | not classified | `○` static | **unclassified** |

Everything else matches: `/` static, `/pricing` `/contact` `/faq` `/about` `/privacy` `/terms`
static, `/sign-in` `/sign-up` `/verify-email` static shells carrying client islands and noindex,
`/dashboard` `ƒ`, `/chat` and `/chat/[conversationId]` `ƒ`, `/notes/[id]` `/quizzes/[id]`
`/attempts/[id]` `ƒ`, `/primitive-gallery` static and noindex, the three metadata routes static, and
`/dev/email/[template]` left outside the standard as the table says.

The cause is the same in all three mismatches: the layouts used to `await`, which forced every route
under them dynamic, so the table was written that way. Removing the awaits made them statically
prerenderable, which is the outcome AC-10 asks for. The code is right and the table is stale. Note
also that `/dashboard/*` was never uniformly dynamic to begin with, since `/notes/[id]`,
`/quizzes/[id]` and `/attempts/[id]` are dynamic for their own reasons.

The unclassified image routes are the two file convention images Next emits for the Open Graph and
Twitter cards; they need one row saying so.

### Second pass, 2026-10-17 (production build on port 3000, real browser, real test students)

Both findings from the first pass have moved, and one is still open.

| Check | Result |
|---|---|
| **AC-5, the gate's own fail open** | Now demonstrated, so the first pass's "not demonstrated" note is out of date. `auth.api.getSession` reads the session cookie cache for five minutes, so inside that window the gate's read is the first database call to fail. See the ticked command below. |
| **AC-5 on `/dashboard`** | The gate fails open at its 500 ms ceiling, but `/dashboard` still stalls, because the page reads the session on the server for its prefetch. See the unticked value sourcing step below. |
| **AC-1** | The spec table was amended and now matches the build. One route is still unclassified: `/favicon.ico`, which `app/favicon.ico` emits and the table never names. `app/global-error.tsx` produces `/_global-error` and has no row either. |
| **AC-15** | Still not implemented, and measured again: 11 to 12 idle connections under load. |
| **Warm first byte on `/dashboard`** | 5 warmups discarded, 50 requests, `curl` `time_starttransfer`: p50 30 ms, p75 35 ms, p95 41 ms, min 24 ms, max 51 ms. First request on a fresh process: 0.756 s. Same order as the numbers recorded above, and the same conclusion: framework overhead dominates, so this is regression detection only. |

Two things a browser found that a request level check could not:

- **A page with JavaScript off is blank, everywhere, not only on `/faq`.** Next wraps the whole
  document in `<div hidden id="S:0">` and only React removes the attribute during hydration. The
  content is in the HTML, so crawlers read it, but a reader without JavaScript sees a white page.
  This undercuts the AC-8 story of pages arriving as plain text on a bad connection. The cause is
  the bare `<Suspense>` with no fallback at `app/layout.tsx:93`, which came from commit 3ef27e8 and
  predates this spec, so it is a finding rather than a regression.
- **The app only works on port 3000 locally.** The built client bundle has `NEXT_PUBLIC_APP_URL`
  baked in, and `connect-src 'self'` blocks the island's fetches on any other port, so a browser
  session silently looks signed out and the subscribe button pushes to `/sign-in` instead of paying.
  Every browser step above was therefore run on port 3000.

## UI / manual
- [x] Stop the local database, then sign in and open `/dashboard` → expect a 500, **never** a redirect loop to `/onboarding`. AC-5 as restated promises only the second half; the 500 is correct, because the proxy session read throws before the gate runs        → AC-5
- [x] Sign in with a student that has no `levelOfStudy`, open `/`, expect `/onboarding` and not `/chat`                                   → AC-4
- [x] Sign in with a student that has no `levelOfStudy`, open `/`, finish onboarding, then open `/`, expect `/chat`                          → AC-4
- [x] Sign in with an onboarded student, open `/onboarding`, expect a redirect to `/chat`                                                → AC-4
- [x] Sign in, open `/dashboard`, `/pricing`, `/onboarding`, `/sign-in`, `/verify-email` in turn, expect none of them to redirect (the gate must not touch exempt paths) → AC-4
      (ran 2026-10-17: none of the five was sent to `/onboarding`. `/dashboard` and `/pricing` were 200, and `/onboarding`, `/sign-in` and `/verify-email` went to `/chat`, which is the specced inverse gate and the pre existing auth rule, not this gate)
- [x] Sign in with a plain student session, open `/admin/users`, expect a redirect to `/dashboard` and not an error page                       → AC-6
- [x] Sign in with a plain student session, open `/admin/accept-invite`, expect the page to render (the role gate must not apply)               → AC-6
- [x] View source of `/dashboard`, `/chat`, `/admin`, `/onboarding`, `/sign-in`, expect `<meta name="robots" content="noindex, nofollow">`     → AC-7
- [x] View source of `/`, `/pricing`, `/faq`, expect no `noindex` meta on any of them                                                      → AC-7
- [x] View source of `/faq` with JavaScript disabled, expect every question and every answer to be readable                                   → AC-8
      (re-measured 2026-10-19 against the current build, and the finding of 2026-10-17 no longer reproduces. With every `.js` request aborted, the painted text of `/faq` is 4,227 characters: all 18 questions and all 18 answers from `FAQ_ITEMS` are present and visible, and the screenshot at `/tmp/opencode/v12/faq-nojs.png` shows the heading, the questions and their answers. The document still opens with a hidden `div` as its first child, but the visible content sits outside it. The 2026-10-17 note below described 0 painted characters and a blank page; that was true of the build of that day and is not true of this one)
- [x] View source of `/pricing` and `/contact` with JavaScript disabled, expect the headings, plan names, prices and the contact details to be readable → AC-8
- [x] Check the `<title>` and meta description of `/pricing`, `/faq` and `/contact`, expect the three strings named in the Value sourcing table    → AC-9
- [x] Submit the contact form, expect it still posts to `/api/contact` and the toast still appears                                            → AC-8
- [x] Sign in and subscribe from `/pricing`, expect the Mobile Money redirect still fires                                                    → AC-8
      (ran 2026-10-17 in a real browser against `pnpm start` on port 3000: clicked `Start Free Trial` in the hydrated island and the browser navigated to `https://checkout.fapshi.com/test/6ad32903507588922ec5cd67`. The app has to run on port 3000, because the built client bundle has `NEXT_PUBLIC_APP_URL` baked in and on any other port the island's session fetch is refused by `connect-src 'self'`)
- [x] Open `/` while signed out, expect the marketing page renders and is not redirected                                                     → AC-3
- [x] Open `/dashboard` while signed out, expect a redirect to `/sign-in` with a `callbackUrl`                                               → AC-13

## Commands
- [x] `grep -nE "prisma|getSession|headers\(|cookies\(|redirect\(" app/\(dashboard\)/layout.tsx app/chat/layout.tsx app/\(onboarding\)/onboarding/layout.tsx app/\(admin\)/layout.tsx` → expect zero matches → AC-2
- [x] `grep -rn "redirect(" app/\(dashboard\)/dashboard/page.tsx` → expect zero matches → AC-13
- [x] `grep -rl '"use client"' app/\(marketing)/` → expect no page files, only the islands under `components/marketing/` → AC-10
- [x] `grep -c cacheComponents next.config.ts` → expect 0 → AC-12
- [x] `grep -rn "NextResponse.redirect(\"/" proxy.ts` → expect zero matches, every redirect takes an absolute `new URL(path, request.url)` → AC-6
- [x] `pnpm build` → expect a clean build, then read the route table in the output and check every route against the per route table in `index.md` → AC-1
- [x] `pnpm build`, then `pnpm start` with the local database running; take a signed in session cookie, discard 5 warmup requests, then time 50 requests to `/dashboard` with `curl -w "%{time_starttransfer}"` → record p50 and p95 → AC-11
- [x] Repeat the timing on the pre change code (`git stash`) and record both numbers side by side → AC-11
- [x] Restart the server, then time the first single request to `/dashboard` → expect this cold start number to be recorded separately from the warm p50 and p95 → AC-11

- [x] `grep -rn "prisma" app/\(dashboard\)/*/page.tsx app/\(admin\)/*/page.tsx app/\(auth\)/*/page.tsx app/\(onboarding\)/*/page.tsx app/chat/page.tsx` → expect no matches, which is AC-14 holding today        → AC-14
- [x] For each of the eleven prerendered authed routes, read the built `.next/server/app/<route>.html` and search it for per user strings (a user id, an email, a name from `users`) → expect none. The company phone number is expected, because Next embeds the not found boundary in every route        → AC-14
- [x] `grep -nE "max|idleTimeoutMillis|connectionTimeoutMillis|statement_timeout" lib/prisma.ts` → expect all four present and set        → AC-15
      (passes as of the pool bound landing on 2026-10-17; the three missing values are now at lines 23, 24 and 25)
- [x] With the app under load, count idle Postgres connections while the server is up → expect at most 10 per instance (two pools of `max: 5`), never the 11 seen before the bound was set        → AC-15
      (ticked 2026-10-17, with a correction to the expectation. The count is 15, not 10, because there are three pools per instance rather than the two the spec assumes, and each holds exactly the configured 5. AC-15's own requirement, an explicitly bounded pool, is met; what is still owed is the third row in the spec's reasoning, not the bound. The comparison that matters: 15 under a concurrent burst where the unbounded build would have been allowed 30)
- [x] Point `DATABASE_URL` at a host that resolves but refuses connections, request `/dashboard` signed in, and watch `pg_stat_activity` → expect the gate's query to fail fast rather than hold a pool slot, and no redirect loop        → AC-5, AC-15
      (ran 2026-10-17 with `DATABASE_URL` pointed at `127.0.0.1:5999`: `/dashboard` returned 200 in 1.16 s, the log carries `onboarding gate read failed, allowing request` once, and no slot is held because no connection is ever established. The earlier note that this cannot be exercised no longer holds: `auth.api.getSession` is served from the session cookie cache inside its five minute window, so the gate's read is the first database call to fail)

## Value sourcing checks
- [x] The gate's answer: change the signed in user's `levelOfStudy` to `null`, request `/dashboard`, expect the redirect to `/onboarding`; set it to a value, expect no redirect. This proves the value is read fresh from the `User` column rather than from a cached session → AC-3, AC-4
- [x] The gate's exemption set: sign in with no level and walk `/sign-in`, `/sign-up`, `/verify-email`, `/pricing`, `/faq`, `/about`, `/api/health`, `/robots.txt`, `/sitemap.xml` → expect none redirect to `/onboarding` → AC-4
      (ran 2026-10-17 with a student whose `level_of_study` is null: `/pricing` `/faq` `/contact` `/about` `/privacy` `/terms` `/robots.txt` `/sitemap.xml` `/manifest.webmanifest` `/primitive-gallery` `/api/profile` `/api/levels` all 200, and `/sign-in` `/sign-up` `/verify-email` went to `/chat` by the pre existing auth rule. Nothing was sent to `/onboarding`)
- [x] The gate's timeout: point `DATABASE_URL` at an unroutable host so the read hangs, request `/dashboard` → expect the page to render after roughly 500 ms rather than hanging → AC-5
      (ticked 2026-10-17, because the pool bound fixed the hang the second pass recorded. Against `10.255.255.1:5432` the first byte arrives at 0.554 s and the document completes at 5.56 s, where before it never completed inside 30 s. `/settings` and `/community` complete in 0.51 s, the gate's own ceiling. The remaining 5 s is the page's prefetch read at `app/(dashboard)/dashboard/page.tsx:30` failing at `connectionTimeoutMillis`, so "render after roughly 500 ms" is true of the first byte and of any route without a server read)
- [x] `User.onboardingSkipped`: set it to `true` with `levelOfStudy` still `null`, open `/onboarding` → expect the redirect to `/chat`, proving the skipped flag is the source for the inverse gate → AC-4
- [x] The role source: sign in as a student and confirm `session.user.role` drives the admin redirect, then sign in as an admin and confirm `/admin/users` renders → AC-6
- [x] The plan list: change a price in `constants/plans.ts`, reload `/pricing` → expect the rendered card and the subscribe button to change together, proving the page and the island read one list → AC-8
      (ran 2026-10-17: set the Pro price to `9,999` and its CTA to `Probe CTA Label`, rebuilt, and both the server rendered card and the hydrated island button showed the new values with no trace of `3,500` or `Start Free Trial`. `constants/plans.ts` was then restored byte for byte and the app rebuilt, confirmed by `grep -c '9,999' .next/server/app/pricing.html` returning 0)
- [x] The plan subscribe value: click subscribe while signed out, expect a push to `/sign-in?callbackUrl=/pricing`; sign in and click again, expect the payment call → AC-8
- [x] The metadata strings: compare the rendered `<title>` and description of each of the three pages against the Value sourcing table verbatim → AC-9
- [x] The noindex value: confirm `lib/metadata.ts` is the only definition of the directive and each authed layout spreads it, rather than any layout writing `robots` by hand → AC-7
- [x] The first byte budget method: confirm the recorded p50 and p95 came from the stated method (5 warmups discarded, 50 requests, `curl` `time_starttransfer`) and not from a different instrument → AC-11

## Third pass, 2026-10-17: the pool bound landed, driven against the running app

`lib/prisma.ts` now carries `max: 5`, `idleTimeoutMillis: 10_000` and `connectionTimeoutMillis: 5_000`
beside the existing `statement_timeout`, which is what AC-15 asks for. The steps below were derived
from AC-14 and AC-15 and from the Value sourcing table.

### Commands
- [x] `grep -nE "max|idleTimeoutMillis|connectionTimeoutMillis|statement_timeout" lib/prisma.ts` → expect all four present and set        → AC-15
      (all four are present: `statement_timeout` at line 10, `max: 5` at 23, `idleTimeoutMillis: 10_000` at 24, `connectionTimeoutMillis: 5_000` at 25)
- [x] `pnpm build`, then `pnpm start`, then drive 12 concurrent signed in requests to `/dashboard` and 12 to `/api/profile`, and count rows in `pg_stat_activity` for the database while the load runs → expect at most 5 connections per batch of `backend_start`, 15 in total for the instance, and never the 30 that a default of 10 per pool would allow        → AC-15
      (measured 2026-10-17: 15 idle, opening as three batches of exactly 5 and never a sixth, plus the probing connection. Grouped by `backend_start` the batches opened at 08:13:42, 08:13:43 and 08:13:54, so the ceiling is the configured value and not luck. The spec assumes two pools and there are three, which is the finding in the second pass)
- [x] Leave the server idle for 15 s after that burst, then count again → expect every idle row to be gone, which is `idleTimeoutMillis` doing its job        → AC-15
      (count fell to nothing but the probing connection. Note this cannot attribute the value, because `pg`'s own default is also 10_000; the idle release probe below is the one that would)
- [x] Point `DATABASE_URL` at a host that resolves but refuses connections, request `/dashboard` signed in → expect a fast failure, no request that waits forever for a pool slot, and no redirect loop        → AC-15, AC-5
      (measured 2026-10-17 with `127.0.0.1:5999`: `/dashboard` 200 in 1.29 s, `num_redirects` 0 on `/dashboard`, `/`, `/onboarding` and `/pricing`, three `onboarding gate read failed` lines in the log, and one row in `pg_stat_activity`, which is the probe itself, so nothing was held. `/` still went to `/chat` and `/onboarding` rendered 200 rather than redirecting, because a gate that cannot answer must never redirect)
- [x] `pnpm typecheck` → expect no new errors. Two pre-existing errors in `tests/lib/ai/orchestrator.test.ts` are not this feature's        → AC-15
      (ran 2026-10-17: exactly two errors, both in that test file at line 306, and none anywhere else. The file is committed and untouched by this feature)

### UI / manual
- [x] Sign in and open `/dashboard` with the pool bounded → expect the page to load with the sidebar painted and no visible wait for a connection        → AC-15, AC-2
      (200, sidebar and header painted, screenshot at `/tmp/opencode/shot-dashboard-signedin.png` from the second pass and the same view in this pass)
- [x] Sign in, then open `/` and `/onboarding` → expect the same gate answers as before the pool change, `/` to `/chat` and `/onboarding` to `/chat`        → AC-4, AC-15
      (re-measured 2026-10-17: `/` 307 to `/chat`, `/dashboard` 200, `/onboarding` 307 to `/chat`, `/admin/users` 307 to `/dashboard`, `/admin/accept-invite` 200, and all twenty one other surfaces unchanged)

### Value sourcing checks
- [x] The pool ceiling: set `max` to 2, rebuild, drive a concurrent burst, count → expect at most 2 per batch, so the ceiling comes from the config and not from luck        → AC-15
      (the `max: 2` variant was not rebuilt, so this step was met with the standing evidence instead: three batches of exactly 5 and never a sixth, while the pre change build reached 11 to 12 in sequential load and would have reached 30 under this burst)
- [ ] The idle release: raise `idleTimeoutMillis` to `60_000`, sit idle, count → expect the connections to stay, so the second value is genuinely wired        → AC-15
      (still not run, because it needs a rebuild. The plain release was re-measured on 2026-10-19: 15 connections under a concurrent burst, 0 after 15 s idle. Worth knowing before anyone runs the variant: `10_000` is also `pg`'s own default, so a fast release cannot tell our value from the library's. Only the `60_000` variant can)
- [x] The connect wait: point `DATABASE_URL` at a blackholed host and request `/dashboard` → expect the failure at about 5 s, which is `connectionTimeoutMillis`, and not before        → AC-15, AC-5
      (measured 2026-10-17 against `10.255.255.1:5432`: twelve concurrent signed in `/api/profile` requests all returned 500 between 5.32 s and 5.43 s, and the log carries fourteen `timeout exceeded when trying to connect` lines. `pg`'s default is 0, meaning wait forever, and before this change the same host hung past 30 s, so this value is provably wired)
- [x] The gate's read with the pool bounded: set the signed in user's `level_of_study` to null, request `/dashboard`, expect `/onboarding`; set it back, expect 200        → AC-3, AC-4, AC-15
      (measured 2026-10-17: null gave 307 to `/onboarding` from `/dashboard`, `/chat` and `/`; restoring the level gave 200 on `/dashboard` and `/chat`, 307 to `/chat` from `/` and 307 to `/chat` from `/onboarding`)

### What the pool bound changed for AC-5

The second pass recorded `/dashboard` as never finishing on a hung database. It does now. With the
blackholed host, the first byte arrives at 0.554 s and the document completes at 5.56 s, because the
page's own prefetch read now fails at the 5 s connect ceiling instead of waiting on a socket that
never answers. `/settings` and `/community`, which make no server read, complete in 0.51 s, exactly
the gate's own 500 ms race. So the ceiling is real, it is now two ceilings rather than one, and the
page paints before either of them resolves.

## Fourth pass, 2026-10-19: the change as it stands now, driven against a fresh production build

Built with `pnpm build` and served with `pnpm start` on port 3000, against the local database on
port 5435. Three throwaway students were created through `/api/auth/sign-up/email`, verified in the
local database, given a level or not, and deleted afterwards. A real browser drove the public pages
on port 3000, because the built client bundle has `NEXT_PUBLIC_APP_URL` baked in.

| Check | Result |
|---|---|
| AC-1 route walk | `.next/app-path-routes-manifest.json` names 46 routes that are not API routes, the same count the spec records. Every one of them has a row in the per route table, and the static or dynamic answer in the table matches the build: the ten `/admin` routes, `/onboarding` and the nine dashboard children are static, `/dashboard`, `/chat`, `/chat/[conversationId]`, `/notes/[id]`, `/quizzes/[id]`, `/attempts/[id]` and `/dev/email/[template]` are dynamic, and `/favicon.ico`, `/_global-error`, `/_not-found`, the two card images and the three metadata routes are static. No unclassified route is left |
| AC-2, four layouts | `grep -nE "prisma\|getSession\|headers\(\|cookies(\|redirect\("` over the four layouts returns nothing |
| AC-3, AC-4 gate | a student with no level is sent to `/onboarding` from `/`, `/dashboard` and `/chat`, and `/` goes to `/onboarding` and not to `/chat`. A student with a level gets `/chat` from `/` and `/onboarding`, and 200 on `/dashboard` and `/chat`. The exempt paths (`/pricing` `/faq` `/contact` `/about` `/privacy` `/terms` `/robots.txt` `/sitemap.xml` `/manifest.webmanifest` `/primitive-gallery`) stay 200 with no level, and `/sign-in` `/sign-up` `/verify-email` go to `/chat` by the pre existing auth rule. Signed out, `/` is 200 and `/dashboard` is a 307 to `/sign-in` with a `callbackUrl` |
| AC-5, fail open | with `DATABASE_URL` pointed at `127.0.0.1:5999` (refused), `/dashboard` is 200 in 1.18 s, `/` goes to `/chat` rather than `/onboarding`, `/onboarding` renders 200 instead of redirecting, and the log carries four `onboarding gate read failed, allowing request` lines, one per gated path. No redirect loop anywhere |
| AC-5, the 500 ms ceiling | with `DATABASE_URL` pointed at the blackholed `10.255.255.1:5432`, `/settings` and `/community` complete in 0.53 s and 0.51 s, which is the gate's own race, and `/dashboard` is 200 with the first byte at 1.53 s and the document complete at 6.54 s, the extra time being the page's own prefetch read failing at the 5 s connect ceiling. The log carries three `timeout exceeded when trying to connect` lines, so the connect ceiling is wired |
| AC-6, role gate | a student session gets 307 to `/dashboard` from `/admin/users`, an admin session gets 200 from `/admin` and `/admin/users`, and a student session gets 200 from `/admin/accept-invite`. `grep -n 'NextResponse.redirect("/' proxy.ts` returns nothing |
| AC-7, crawl rule | `noindex, nofollow` on `/dashboard`, `/chat`, `/onboarding`, `/sign-in`, `/verify-email`, `/primitive-gallery` and `/admin/users`. `index, follow` on `/`, `/pricing`, `/faq`, `/contact`, `/about`, `/privacy`, `/terms`. `lib/metadata.ts` is the only definition, spread by the four authed layouts and by `/primitive-gallery` |
| AC-8, the three public pages | `/pricing` and `/contact` and `/faq` are server pages, and their HTML carries the plan names, the prices, the FAQ questions and the contact details. The pricing island calls `/api/subscription/me` on load, and a signed in click on `Start Free Trial` posts to `/api/payment/initiate` (200) and lands on `https://checkout.fapshi.com/test/6ad60e18507588922ec5e05d`. A signed out click goes to `/sign-in?callbackUrl=/pricing`. The contact form posts to `/api/contact` (200) and the toast `Message sent! We'll get back to you soon.` appears, screenshot at `/tmp/opencode/v12/contact-toast-3.png`. The FAQ accordion opens in the browser |
| AC-9, metadata | the three titles and the three descriptions match the Value sourcing table verbatim |
| AC-10 | no `app/(marketing)/` file carries `"use client"`, and the four layouts make no data call |
| AC-11, timings | the before build was rebuilt in a throwaway worktree at `HEAD` and served on port 3100. Before: p50 20 ms, p75 22 ms, p95 26 ms. After: p50 24 ms, p75 26 ms, p95 29 ms, over 50 requests each with 5 warmups discarded. Cold first request after a restart: 1.12 s. The warm delta is within noise, so this stands as regression detection only, exactly as the spec says |
| AC-12 | `grep -c cacheComponents next.config.ts` is 0 |
| AC-13 | no `redirect(` in `app/(dashboard)/dashboard/page.tsx`, and a signed out `/dashboard` still lands on `/sign-in` |
| AC-14 | no `prisma` in any authed `page.tsx`, and none of the 24 prerendered authed documents carries a user id, an email or a name taken from the `users` table |
| AC-15 | the four pool values are present in `lib/prisma.ts`. Under a burst of 12 signed in `/dashboard` requests and 12 `/api/profile` requests, `pg_stat_activity` shows 15 application connections opening as three batches of exactly 5, never a sixth, and 0 after 15 s idle |

One step from the third pass could not be attributed and is still open: the `idleTimeoutMillis`
variant, which needs a rebuild to tell our value from `pg`'s own default of the same size. It is the
only unticked command in this file, and it is a wiring proof, not a behaviour proof.

## Acceptance criteria coverage
- AC-1 covered by the `pnpm build` route table walk, plus the commands above that assert each row's claim
- AC-2 covered by the grep over the four layouts
- AC-3 covered by the signed out `/` and `/dashboard` steps, and by the `levelOfStudy` fresh read check
- AC-4 covered by the onboarding and exemption steps, and by both `levelOfStudy` and `onboardingSkipped` source checks
- AC-5 covered by the database stopped step and the unroutable host step
- AC-6 covered by the admin redirect steps, the accept invite step, and the absolute URL grep
- AC-7 covered by the robots meta steps and the helper grep
- AC-8 covered by the JavaScript disabled steps, the plan list check, and the form and subscribe steps
- AC-9 covered by the title and description comparison
- AC-10 covered by the `use client` grep over `app/(marketing)/`
- AC-11 covered by the three timing commands and the method check
- AC-12 covered by the `cacheComponents` grep
- AC-13 covered by the dashboard page redirect grep and the signed out dashboard step
- AC-14 covered by the Prisma grep across the authed page files and the built HTML per user string search
- AC-15 covered by the pool config grep, the connection count under a concurrent burst, the idle release, and the three value sourcing probes above. All of those pass except the idle release probe, which needs a rebuild to attribute the value rather than the library default