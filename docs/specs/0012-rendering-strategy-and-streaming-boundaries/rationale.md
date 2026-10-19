# 0012. Rendering strategy and streaming boundaries: rationale

The decision record for spec 0012. `/feature-build` does not read this file; it
builds from `index.md`.

## Context

> ⚠️ Premise note: the previous version of this spec was written for a product with a public course catalogue and a landing page that fetched its own content from an API. Feature 5 deleted the catalogue outright and the client fetch is already gone, so roughly half the original criteria described work that can never be done. The right framing now is a routing and gating standard for the app that exists.

The app is a study platform for Cameroonian university students, used mostly on low end Android phones over congested mobile networks, with data priced by the gigabyte. Four layouts block their first paint on a database call. `app/(dashboard)/layout.tsx` and `app/chat/layout.tsx` each read the session and then read one Prisma column before rendering any markup at all, and those two files are the same guard copied. `app/(onboarding)/onboarding/layout.tsx` repeats the same read to push a student who has finished onboarding somewhere else, and `app/(admin)/layout.tsx` checks the admin role that `proxy.ts` has already checked on the line before. On a slow connection that is one to three seconds of white screen on every navigation, for every student, on every screen.

The blocking read buys almost nothing. `AppSidebar.tsx`, `DashboardHeader.tsx`, `ChatSidebar.tsx` and `ChatHeader.tsx` are all client components that get their data from client hooks, `useSession`, `usePlan`, `useCredits`, `useUsage`, `useChatConversations`, so no part of the chrome needs the server to know who the student is. The layouts touch the database for one redirect decision and nothing else.

Three public pages carry the same disease in a milder form. `pricing/page.tsx`, `contact/page.tsx` and `faq/page.tsx` are `"use client"` from line one, so each ships a hydration of the whole page for one subscribe handler, one form, or one accordion. A client page cannot export `metadata`, which is why `/pricing` has no title of its own and inherits the `(marketing)` group title and description from `app/(marketing)/layout.tsx:5`.

Search crawling is governed by two mechanisms that disagree. `app/robots.ts` disallows thirteen path prefixes while `app/layout.tsx:70` marks the whole app `index, follow`, and the disallow list is already partly fictional: `/onboarding` is protected in `proxy.ts` and absent from it. A blocklist can only ever be wrong about routes nobody thought of yet.

The consequence of not deciding is that every new route repeats the blocking pattern, and the perceived speed work in row 35 has no shared target to build against.

## Options considered

### Option 1: Move the gates into `proxy.ts`, leave the layouts as pure shells

Move all four gates into the request guard, which already runs on every navigation and already reads the session, and delete every await from the layouts.

**Pros**:
- The layouts become ordinary static shells, so the shell paints without waiting on anything.
- The chrome was never server dependent, so nothing is lost.
- One gate in one file, which is the one place that can redirect before any byte is sent.
- No new caching system, no new dependency, no global framework flag.

**Cons**:
- The gate moves, it does not disappear: one Prisma read still happens before the first byte of a dashboard request, so navigation latency is lowered rather than eliminated.
- `proxy.ts` grows, and it now holds auth, rate limiting, bot defence and two gates.
- A student with no level can briefly reach a dashboard page when the read times out.

### Option 2: Keep the gates in the layouts and stream the page behind them

Leave the redirect where it is and wrap the page in a Suspense boundary with a fallback, so the shell streams around the slow gate.

**Pros**:
- No change to the guard, and the redirect stays next to the pages it protects.
- No extra query on any request.

**Cons**:
- A redirect cannot be streamed. Until the gate resolves, nothing can be sent, because the answer might be a redirect, so the boundary buys nothing and the white screen stays.
- The layout stays dynamic, so every future page inherits the shape we are trying to remove.

### Option 3: Put `levelOfStudy` in the session and read it from the cookie

Add the field to the better auth session so `proxy.ts` reads it with no database call at all.

**Pros**:
- Zero queries on the critical path, which is the strongest form of this option.
- No Prisma call in the guard at all.

**Cons**:
- `lib/auth.ts` already enables the session cookie cache with a 5 minute lifetime, and `app/api/onboarding/level/route.ts` writes the level with a direct `prisma.user.update`, which does not refresh that cache. A student who finishes onboarding would be bounced back to onboarding for up to five minutes. Fixing that means either invalidating the cache on every write or turning it off, and the cookie carries the value to the client.
- It trades correctness of the gate for latency, and the gate is the one thing standing between a new student and an empty dashboard.

### Option 4: Enable the Next.js cache components model, as the previous version of this spec proposed

Set `cacheComponents: true` and use `use cache` with `cacheTag` and `generateStaticParams` for shared content, invalidated on publish.

**Pros**:
- One mechanism that covers the static shell, cached content and request time content together.
- It is the model the framework is steering toward.

**Cons**:
- It is a global flag with broad effects on every route, and `docs/research/seo-and-rendering.md` §6.2 records that it is not enabled today, so this would be a framework migration wearing a performance hat.
- It would sit beside `lib/cache/`, which spec 0010 shipped and this repo's own rules forbid: a new abstraction must replace an existing one for a clear slice, not sit beside it.
- There is nothing left to cache. The catalogue it was written for was deleted by feature 5, and the cached reads that do exist (platform settings, readiness, leaderboard) belong to row 41, which already plans to use `lib/cache/`.

## Rationale

Option 2 fails on a hard fact about how redirects work: a redirect is not streamable, so the layout cannot begin its response until the gate resolves. That is the exact defect we are removing, and wrapping the page in Suspense around it changes nothing. Option 1 is the only option that actually removes work from before the first byte, because it deletes two of the three round trips outright (the layouts stop reading the session at all) and leaves one in the one place that cannot avoid it.

Option 3 is faster in the number and worse in the truth. The five minute cookie cache is the reason the level would come back stale after onboarding, and a gate that can send a student who just finished onboarding back to onboarding is worse than a gate that costs one indexed read. Option 4 was the previous spec's answer and it has no subject left: the catalogue is deleted, the long tail it was written to cache does not exist, and adopting it would put a second caching substrate next to the one spec 0010 built. The engineer chose to keep `lib/cache/` as the single substrate, which is also what this repo's rule about competing patterns demands (basis: `AGENTS.md`, and spec 0010's own substrate).

The gate fails open on purpose, and this is the one place where the spec deliberately trades strictness for availability. A database blip must not turn into a redirect loop between onboarding and the dashboard for everyone who is online. What failing open actually exposes is small and worth stating plainly: a signed in student with no level reaches one dashboard page that has no content for them, and nothing else. The gate never grants access to anyone, it only ever redirects, so no other user's data becomes reachable. The security path stays closed, because the admin role check in `proxy.ts` does not fail open.

On the budgets: we cannot reproduce a Cameroonian network from the build machine, and the chrome only paints after a client session fetch, so a byte measurement cannot see the white screen this spec exists to remove. AC-11 is therefore written as regression detection with a fully named method, not as a latency claim: it fails if a layout ever starts reading the database again, and it may barely move otherwise, because the proxy gate now dominates the first byte. The published thresholds (basis: Core Web Vitals, LCP 2.5 s) are what the real device has to hit, and the honest way to check that is row 35 and a phone in Buea, not a build machine.

## References

**Project sources** (verifiable, in this repo):
- `docs/research/seo-and-rendering.md` §1.14 rendering state measured, §1.15 live production measurements, §6.2 what caching is enabled, §6.6 which routes must never block the first paint, §6.8 authed surfaces and SEO, §9.5 rendering decisions one line each, §9.6 metadata rules
- `app/(dashboard)/layout.tsx:12-27` and `app/chat/layout.tsx:12-25`, the same blocking guard twice
- `app/(onboarding)/onboarding/layout.tsx:17-24`, the inverse gate
- `app/(admin)/layout.tsx:13-18`, the role check `proxy.ts` already made
- `proxy.ts:63-120`, the protected route list, the existing redirects and the session read
- `app/(marketing)/pricing/page.tsx:1`, `app/(marketing)/contact/page.tsx:1`, `app/(marketing)/faq/page.tsx:1`, three client pages
- `app/(marketing)/pricing/page.tsx:26-60` the inline plan table, and `:63-71` the session read and `subscription()` call that make the plan grid one island
- `app/(marketing)/layout.tsx:5-25`, the group metadata the three pages inherit today
- `app/layout.tsx:70-73` and `app/robots.ts:8-23`, two crawl mechanisms that disagree
- `components/layout/AppSidebar.tsx:80-95`, `components/layout/DashboardHeader.tsx:12`, `components/chat/chat-sidebar.tsx:93`, `components/chat/chat-header.tsx:11`, proof the chrome never needed the server
- `app/(dashboard)/dashboard/page.tsx:27-61`, the server prefetch and hydration pattern from spec 0010, and `:30-32` the page redirect AC-13 removes
- `lib/cache/` and `lib/query-families.ts`, the one caching substrate, from spec 0010
- `lib/prisma.ts`, the `globalThis` Prisma singleton with no pool size and no statement timeout
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:219`, proxy runs on the Node.js runtime by default, and `:19`, proxy is invoked separately and shared globals are not relied on
- spec 0010 caching and cold start speed
- `docs/scope/pivot.md` row 5, the deletion of the public catalogue
- `docs/scope/platform.md` rows 34, 35, 36 and 41
- `AGENTS.md` rules: `proxy.ts` is the guard, one abstraction replaces another and never sits beside it

**Practices & standards**:
- Next.js App Router streaming server rendering, and the fact that a redirect cannot be streamed
- Core Web Vitals: LCP 2.5 s, INP 200 ms, CLS 0.1
- Nielsen Norman response time thresholds: 0.1 s, 1 s, 10 s
- Fail open on the availability path, fail closed on the security path

## Amendment of 2026-10-17: what verification measured

`/verify-release` drove the production build with three real accounts (a student, an admin, and a
student with no level) over HTTP and in a real browser. Twelve of thirteen criteria passed. This
amendment records what the measurements showed, and fixes the four things they exposed.

**The route table was written against a world where the layouts were still dynamic.** They awaited,
which forced every route beneath them to render per request, so "Dynamic and streamed" was accurate
when written. Removing the awaits made eleven of them statically prerenderable, which is the outcome
AC-10 asks for and not a defect. The table now says what the build manifest emits, and splits the
dashboard group into the nine that prerender and the three that stay dynamic for their own reasons.

**The performance claim, measured properly, is smaller than the first version of this spec claimed.**
Byte timing cannot show it: on a warm local machine p50 moved from 21 ms to 24 ms, because the local
database answers in well under a millisecond and the number is dominated by framework overhead.
Counting SQL statements is the measurement that works, with the server restarted to clear the in
memory session cookie cache and the shared cache purged so both builds were cold. Before: 21 queries
per signed in `/dashboard`. After: 19. The two that disappeared are precisely the layout's, one
duplicate session read and one `level_of_study` read, and the gate's single query now serves both
columns. The gate did not disappear; it moved into the proxy, which is what the Decision says and
what the Consequences already said, but the earlier Rationale overstated it as removing two of three
round trips outright.

A methodological note worth keeping: the first instrument reported zero queries for every request.
Postgres logs the extended query protocol as `execute:`, not `statement:`, and Prisma uses it. The
instrument was fixed only after a control request that had to hit the database also reported zero.
A measurement that says "nothing happened" is usually a broken measurement.

**AC-5 was written for a warmer failure mode than the one that exists.** The gate's read is wrapped
and fails open, but `auth.api.getSession` runs earlier in the proxy and is not wrapped, so a total
database outage returns 500 before the gate is reached. AC-5 now says what holds in every case: no
database failure becomes a redirect loop, because a gate that cannot answer never redirects. The
alternative considered was to wrap the session read as well, which would let requests through on an
unverified session to reach a page that re-reads the session and errors anyway, so it buys a
different error message and costs a security posture.

**The edge cache is a standing footgun, so it gets a rule rather than a review note.** Eleven authed
routes now serve HTML a CDN holds. None embeds per user data today, verified by reading the built
files, and AC-14 makes that structural: an authed page reads no per user data on the server, so its
cached document cannot carry it. `/dashboard` is the one exception and is already safe, because the
proxy gate makes it dynamic. The engineer chose this over forcing dynamic on any page that reads
user data, which would have surrendered the caching win, and over relying on review, which is what
let the original table drift in the first place.

**The pool is bounded for a free tier.** The project is on Neon's free plan through the pooler
endpoint, and an instance holds more than one pool, so the library default of 10 per pool would
allow more than the two times ten this record first assumed. AC-15 sets `max: 5` with an idle timeout
so connections are released rather than held against a small quota, and a connection timeout so a
request cannot wait indefinitely. The exact free tier ceiling was not looked up and is not quoted
here; the sizing is deliberately conservative and the Follow-up says to raise it when the plan
changes. Measurement on 2026-10-17 corrected the arithmetic in both directions: there are three
pools per instance, not two, because `lib/prisma.ts` builds the adapter at module scope while only
the client is memoised, so every bundle instance opens its own pool. The ceiling is therefore 15
rather than the 30 the default would have allowed, which is still conservative enough for a free
tier and is the reason the number was worth measuring rather than guessing.

## Second amendment, 2026-10-17: two more verification passes, after the pool bound landed

Two further `/verify-release` passes ran after AC-15's code landed. Fourteen of fifteen criteria now
hold, and AC-1 was the only one still out, for a reason worth recording because it is the same
reason the table drifted the first time.

**The table was short two routes, not one.** Walking the build manifest against the table by script
rather than by eye found that 46 page routes are emitted and 44 were named. `/favicon.ico` and
`/_global-error` were both unclassified. Both now have rows. The general lesson is already recorded
above and it is worth restating because it cost two rounds: a rendering table is only worth what
the check that maintains it is worth, and the cheap check is to read the manifest, not the table.

**AC-5 described a failure mode that turned out not to be the one that exists.** The first amendment
recorded that the gate's read is wrapped and fails open, while `auth.api.getSession` runs earlier
and unwrapped, so a total outage returns 500 before the gate is reached. That is true in principle
but it is not what happens in practice, because `auth.api.getSession` is served from its cookie cache
for five minutes. Inside that window the gate's read is the first database call to fail, so the fail
open is directly observable: against a database that refuses connections, `/dashboard` returns 200
in 1.29 s with `onboarding gate read failed` logged once, and `/onboarding` renders rather than
redirecting, which is precisely the "a gate that cannot answer never redirects" invariant. The
criterion had been argued rather than demonstrated, and it now rests on a measurement.

**The one read AC-5 left unbounded is now bounded, by AC-15.** `app/(dashboard)/dashboard/page.tsx`
reads the session on the server for its prefetch, and against a blackholed database host that read
waited on a socket that never answered, so `/dashboard` never completed. `connectionTimeoutMillis:
5000`, added for a different reason, bounds it as a side effect: first byte at 0.554 s, document
complete at 5.56 s. Two bounded waits instead of one, and the shell paints before either resolves.
This is the case where a spec criterion fixed a problem its author did not know existed, which is
the argument for bounding resources by name rather than by intent.

**A page paints nothing without JavaScript, on every route.** Next wraps the whole document in
`<div hidden id="S:0">` and only React removes the attribute during hydration, so painted text with
JavaScript off is 0 characters while the source carries 85,554, including every FAQ answer. The
cause is the bare `<Suspense>` with no fallback at `app/layout.tsx:93`, from commit 3ef27e8, before
this spec. No criterion here is breached, because AC-8 asks for server components with named islands
and says nothing about working without JavaScript, but the `/faq` row's honest limit was wrong: it
promised a reader with JavaScript off would see questions, and in fact they see nothing. The row is
corrected, and a Follow-up records the decision. Row 35, loading states and perceived speed, already
owns boundaries, and removing the boundary outright is a decision rather than a patch, since
something may genuinely suspend.
