# 0012. Rendering strategy and streaming boundaries

**Date**: 2026-10-17
**Status**: In Progress

## Summary

Every student screen waits on the database before it shows anything, because the sidebar and the header live in a layout that reads the session first. This decision moves that check into `proxy.ts`, the request guard that already runs on every navigation, and leaves the four layouts as empty shells that paint immediately. It also turns the three public pages that ship a whole page of JavaScript for one form or one accordion into static server pages, and gives every signed in surface one shared noindex rule. Nothing else changes: no new caching system, no course catalogue, no second pattern.

## Requirements

**User stories**:

- As a student on a slow connection, I want navigation to paint the sidebar and header immediately so I never see a white screen.
- As a student who has not chosen a level of study yet, I want to be sent to onboarding before I land on an empty dashboard, without that redirect costing every other page a database round trip.
- As an admin, I want one search crawler rule for signed in surfaces so I never have to remember to add a route to a list.
- As a student arriving from a search result, I want the pricing, FAQ and contact pages to arrive as plain text so I can read them on a bad connection.
- As a developer, I want one written rendering decision per route so I know how to build each page.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Every route in `app/` appears in the per route table below, the table matches what the code actually does, and no route is left unclassified. **Amended 2026-10-17 after this criterion failed twice.** The check is named here now, because "walking `app/`" is not a runnable check and both misses came from it: the routes this criterion actually failed on, `/favicon.ico` and `/_global-error`, are not page files at all, so walking the tree cannot find them. The enumeration source is the build: run `pnpm build` and read `.next/app-path-routes-manifest.json`, which names every route the app emits whatever produced it, then check each against the table. The count is 40 page routes as of 2026-10-26, after spec 0023 added the public catalogue index and faculty detail pages, and it is recorded here rather than in passing so that a change in the number is visible instead of silent. The two earlier counts recorded elsewhere, 44 and 45, were both taken by hand and both were wrong.
- **AC-2**: `app/(dashboard)/layout.tsx`, `app/chat/layout.tsx`, `app/(onboarding)/onboarding/layout.tsx` and `app/(admin)/layout.tsx` contain no `await` of the session, of `headers()`, of `cookies()`, or of Prisma, and no `redirect` call. Their chrome renders from static JSX and the page segment streams behind it.
- **AC-3**: The onboarding redirect lives in `proxy.ts` and nowhere else. The gate runs whenever the request carries a session cookie and the path is not in the exemption set declared in this spec, whether or not the path is in `protectedRoutes`, so `/` and `/pricing` are covered too. It reads `User.levelOfStudy` from the database on the Node.js runtime `proxy.ts` already runs on.
- **AC-4**: A signed in student with no `levelOfStudy` is redirected to `/onboarding` from any non exempt path, including `/` and `/chat`. A signed in student who already has a level, or who skipped onboarding, is redirected away from `/onboarding` to `/chat`. At `/`, the level gate is evaluated **before** the existing signed in redirect to `/chat`, otherwise a student with no level could never reach onboarding. The same order applies to every path where both rules could fire.
- **AC-5**: The gate fails open, and only the gate. The wait for the Prisma read in `proxy.ts` is bounded at 500 ms: on expiry the failure is logged and the request continues to the page. The cost of failing open is that one signed in student with no level reaches one dashboard page instead of being redirected. The query itself is bounded too, because a 500 ms race alone does not cancel it: `lib/prisma.ts` passes a `statement_timeout` in the `pg.PoolConfig` it already hands to `PrismaPg`, so a hung read cannot outlive the gate and hold a pool connection. (Prisma's own query arguments take no `signal`, so the timeout belongs in the pool config, not at the call site.) **Measured boundary:** this does not survive a total database outage, and it is not meant to. `auth.api.getSession` runs earlier in the proxy and is not wrapped, so when the database is unreachable the request returns 500 before the gate is reached. What holds in every case is that no database failure turns into a redirect loop between onboarding and the dashboard, because a gate that cannot answer never redirects. **Amended 2026-10-17 after measurement.** Two things this criterion got wrong about how it fails. First, the session read is served from `auth.api.getSession`'s cookie cache for five minutes, so inside that window the gate's read is the first database call to fail: against a database that refuses connections, `/dashboard` returns 200 in 1.29 s with `onboarding gate read failed` logged once, which is the fail open this criterion asks for, demonstrated rather than argued. Second, `AC-15` later added `connectionTimeoutMillis: 5000` to the same pool config, which bounds the one read this criterion leaves unbounded: the server side prefetch read at `app/(dashboard)/dashboard/page.tsx:30`. With that value in place, a blackholed database host gives `/dashboard` its first byte at 0.554 s and completes the document at 5.56 s, where before the bound it never completed inside 30 s. Two bounded waits instead of one, and the shell paints before either resolves.
- **AC-6**: `app/(admin)/layout.tsx` performs no role check. `proxy.ts` is the only place that reads the role and redirects a non admin away from `/admin`, and that redirect passes an absolute URL built from `request.url`, because `NextResponse.redirect` rejects a relative string, and every redirect in the guard passes an absolute `new URL(path, request.url)`. Cited by name rather than by line number, deliberately: this spec's own history is a table that drifted because it cited lines. `/admin/accept-invite` is exempt from the role gate, since the person using it is signed in but not yet an admin.
- **AC-7**: One helper in `lib/metadata.ts` exports `noindex, nofollow` as a `robots` metadata object, and every signed in surface spreads it into its own `metadata` export: the `(dashboard)`, `(admin)`, `(auth)` route groups and `app/chat/layout.tsx`, plus `app/(onboarding)/onboarding/layout.tsx` (which is the only layout in the `(onboarding)` group, so it stands for that group rather than joining it). `follow` is false so a crawler cannot walk links out of a signed in page into another private URL. No route group writes the directive by hand.
- **AC-8**: `app/(marketing)/pricing/page.tsx`, `app/(marketing)/contact/page.tsx` and `app/(marketing)/faq/page.tsx` are server components. Their interactive parts are separate client components that the page imports: the pricing plan grid with its subscribe handler and current plan state (it reads the session and calls `subscription()` today, so the whole grid is the island, not one button), the contact form, and the FAQ accordion.
- **AC-9**: `/pricing`, `/contact` and `/faq` each export their own `metadata` with the title and description written in the Value sourcing table below, so none of them inherits the `(marketing)` group description verbatim.
- **AC-10**: No route pays for a render, an API call and a hydration it does not need. Verified against the per route table: there is no `"use client"` page left under `app/(marketing)/`, and the four layouts make no data call of any kind.
- **AC-11**: This is regression detection, not a latency claim. It catches the layouts going back to reading the database; it does not measure the white screen, because the sidebar only appears after a client session fetch, and it may not move much at all, because the proxy gate now dominates the first byte. The method: run `pnpm build` then `pnpm start` against the local database, take a signed in session cookie, discard 5 warmup requests, time 50 consecutive requests to `/dashboard` with `curl` and `time_starttransfer`, and record p50 and p95 in the pull request next to the same measurement taken on the pre change code. A separate cold start measurement records the first request after a restart, because the proxy holds its own Prisma client and its own connection pool.
- **AC-12**: `cacheComponents` stays out of `next.config.ts`. `lib/cache/` remains the only server caching substrate in the app, so there is one pattern for caching and not two.
- **AC-13**: No redirect gate lives outside `proxy.ts`. `app/(dashboard)/dashboard/page.tsx:30-32` reads the session and redirects to `/sign-in` today, which duplicates what `proxy.ts` already does for every protected path, so that redirect is removed. A page may still read the session for its own data, which the dashboard page needs for its prefetch; what moves is the redirect, not the read.
- **AC-14**: A page under `(dashboard)`, `(admin)`, `(auth)`, `(onboarding)` or `app/chat` reads **no per user data on the server**. Per user data arrives only from a client hook or an API route, both of which run after the page's HTML is already sent and therefore outside the edge cache. `app/(dashboard)/dashboard/page.tsx` is the single exception and it is already safe, because the proxy gate makes the route dynamic, so its server read never reaches a cached document. This is what makes the static prerender of the other authed routes safe rather than merely lucky: their HTML is cached, so it must never contain one student's data. Checked by grepping those trees for Prisma in a `page.tsx`, and by reading the built HTML of each for any per user string. **Amended 2026-10-17 after measurement.** The count this criterion used, eleven, was wrong and understated the exposure by more than half: twenty four authed documents actually prerender, being the ten `/admin` routes, `/onboarding`, `/sign-in`, `/sign-up`, `/verify-email`, `/primitive-gallery`, and the nine dashboard children, which sit at root paths (`/upload` `/quizzes` `/progress` `/leaderboard` `/community` `/settings` `/feedback` `/affiliate` `/subscription`) rather than under `/dashboard`, which is how they came to be missed twice. All twenty four were swept for a real email, name and user id on 2026-10-17 and none carried one. The `/dashboard` exception also has the wrong stated cause: the route is dynamic because the page itself calls `auth.api.getSession` and `headers()` at line 30, not because the proxy gate ran. Next has no idea the proxy ran, so the next person to remove that session read would remove the property that makes this route safe, and the manifest would quietly turn it into a cached document.
- **AC-15**: The Postgres pool is bounded explicitly for a free tier. `lib/prisma.ts` passes `max: 5`, `idleTimeoutMillis: 10000` and `connectionTimeoutMillis: 5000` in the `pg.PoolConfig`. The project runs on Neon's free plan through the pooler endpoint, and there are three pools per instance rather than one, so the default of 10 per pool would allow 30 connections per instance with no stated ceiling behind it. **Amended 2026-10-17 after measurement:** the original wording said two pools and 20 connections. Two is wrong. `lib/prisma.ts` constructs the adapter at module scope while only the client is memoised, so each bundle instance that imports the module opens its own pool, and the proxy bundle is a second one. Measured under a concurrent burst of 24 signed in requests: 15 idle, opening as three batches of exactly 5 and never a sixth. So the bound holds and the ceiling is 15, not the 10 this criterion first predicted. `idleTimeoutMillis` releases connections instead of holding them against a small quota while an instance is idle, and `connectionTimeoutMillis` means a request cannot wait indefinitely for a connection.

## Decision

**Chosen option**: Option 1: Move the gates into `proxy.ts`, leave the layouts as pure shells

Every layout in `app/` renders chrome from static JSX with no database call and no redirect, and every gate that has to answer before the first byte lives in `proxy.ts`. Shared public pages are static server components whose only client surface is a named island, and every signed in surface declares noindex through one helper.

**Implementation skills**: none installed in this project shaped this decision. The framework guide the repo already mandates lives at `node_modules/next/dist/docs/`, and it is what settled that `proxy.ts` may run Prisma.

## Feature design

**Data model sketch**:
No schema change. `User.levelOfStudy` and `User.onboardingSkipped` already exist and are already written by `app/api/onboarding/level/route.ts`. This decision changes where they are read, not what they are.

**API surface**:
No new endpoints and no changed request or response shapes. `proxy.ts` gains one Prisma read. `/api/contact` and `/api/payment/initiate` are called exactly as they are today, from the new islands rather than from a client page.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Proxy gate, any non exempt path | Whether the student has a level of study | `User.levelOfStudy`, read fresh per request by `proxy.ts` |
| Proxy gate, request to `/onboarding` | Whether onboarding is already done or skipped | `User.levelOfStudy` or `User.onboardingSkipped`, same fresh read |
| Proxy gate, paths the gate must never touch | The exemption set | The existing `publicPaths` array in `proxy.ts`, plus the `authPaths` array beside it, plus `/onboarding` itself, plus every `/api` prefix and the metadata routes. Declared as one named set plus one prefix check in `proxy.ts`, and the gate never redirects a path in it |
| Proxy gate, request to `/admin` | Whether the student is an admin | `session.user.role`, unchanged from today. `/admin/accept-invite` is exempt (AC-6) |
| Proxy gate, read that is slow or broken | Whether to continue or redirect | Fixed 500 ms ceiling (AC-5); continue, never redirect. The wait is a race, and the query is bounded by `statement_timeout` in the `pg.PoolConfig` in `lib/prisma.ts` |
| Layout render | Sidebar, header and navigation markup | Static JSX, no data |
| Public page render | Headline, plan names, prices, FAQ answers and copy | Static JSX, plus the plan table currently inline at `app/(marketing)/pricing/page.tsx:26-60`, which moves to `constants/plans.ts` so the server page and the island read one list |
| Public page render | Current plan and subscribe state | Client component state, `useSession` and the existing `subscription()` call from better-auth |
| Metadata, `/pricing` | Title `TiCLearn Pricing · Free and Semester Pass Plans`, description `What TiCLearn costs for a Cameroonian university student: what the free tier includes, what the semester pass adds, and how you pay over Mobile Money.` | Written in this spec; do not reuse the group description |
| Metadata, `/faq` | Title `FAQ · Cost, Data Use and Offline Access`, description `Answers Cameroonian university students ask most: what TiCLearn costs, how much data it uses, and whether it works on a weak connection.` | Written in this spec; do not reuse the group description |
| Metadata, `/contact` | Title `Contact TiCLearn`, description `Reach TiCLearn on WhatsApp or by phone, or send the team a message from this form.` | Written in this spec; do not reuse the group description |
| noindex on a signed in surface | The robots directive | `lib/metadata.ts`, the one helper named in AC-7: `{ index: false, follow: false }`, spread into `metadata.robots` |
| First byte budget | The p50 and p95 figures and the method | Decided in AC-11: `pnpm build` then `pnpm start`, 5 warmups discarded, 50 timed requests with `curl` and `time_starttransfer`, plus one cold start request recorded separately |

**Key invariants**:
- No layout in `app/` reads the session, cookies, headers or the database.
- No redirect gate lives outside `proxy.ts`. A page may still read the session for its own data; what may not live outside the proxy is a redirect.
- The gate never redirects a path in its exemption set, and the set is declared in one place.
- A page that exports `metadata` is never a client component.
- A page under an authed group reads no per user data on the server, because its HTML is cached.
- Every signed in surface gets noindex through the helper, never by hand.
- One caching substrate: `lib/cache/`. `cacheComponents` and `use cache` do not enter this codebase.
- The database connection pool is explicitly bounded, sized for a free tier, not left to a library default.

**Security model**:
No compliance scope is triggered. The gate reads one column for the signed in user only, keyed by the session's user id, and it can only redirect, never grant. The admin role check stays closed on failure and now uses an absolute URL, so it cannot throw instead of redirecting. Crawl policy is centralised by route group rather than by path prefix, because a prefix list can only ever be wrong about routes nobody has thought of yet.

The edge cache is the security surface this decision creates, and AC-14 is what closes it. Twenty four authed routes prerender to HTML that a CDN holds and serves to whoever asks, so those documents must never carry one student's data. Verified as of this amendment: the built HTML of all twenty four contains no per user string. The only per user value present is the company phone number, which arrives because Next embeds the not found boundary markup into every route's payload. The residual risk is a future page that reads the session on the server and prerenders, so the rule is written as a prohibition rather than as a review instruction.

One pre existing gap worth naming, not caused by this decision and not fixed by it: `proxy.ts`'s `protectedRoutes` omits `/notes` and `/attempts`, so those two pages render their shell for an anonymous visitor. Their APIs return 401, so no data is exposed, and the old layout never redirected them either. Closing it means adding the two prefixes to `protectedRoutes`, which is a separate change.

**Configuration required**:
None. No new environment variables, no new dependencies, no flag.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: a signed in student with a level navigates between dashboard pages, and the sidebar and header are in the first flush of the response with no database call from the layout, verifies **AC-2** and **AC-10**.
- Failure case: Prisma is unreachable while a signed in student opens `/dashboard`, the failure is logged, and the page still renders rather than looping to onboarding, verifies **AC-5**.
- Edge case: a signed in student with no level opens `/`, is sent to `/onboarding` rather than to `/chat`, sets a level, and lands on `/chat`, verifies **AC-3** and **AC-4**.
- Edge case: the gate visits `/onboarding`, `/sign-in`, `/api/*` and `/pricing` and redirects none of them, verifies **AC-4**.
- Permission: a student session opens `/admin/users` and is redirected to `/dashboard` by `proxy.ts` alone, with an absolute URL, while the same session can still open `/admin/accept-invite`, verifies **AC-6**.
- Crawl: the HTML of `/dashboard` carries `noindex, nofollow` and the HTML of `/pricing` carries its own title, verifies **AC-7** and **AC-9**.
- Rendering: `app/(dashboard)/dashboard/page.tsx` contains no redirect, verifies **AC-13**.
- Performance: 50 warm requests to `/dashboard` are timed before and after the change, plus one cold start request, verifies **AC-11**.

## Standard definition

**Canonical pattern**:

```tsx
// A layout is a shell. No session, no cookies, no database, no redirect.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col h-full w-full">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Every gate that must answer before the first byte lives in proxy.ts.
// The exemption set is declared once, next to publicPaths, and the gate
// never redirects anything inside it. Without /onboarding in it, /onboarding
// would redirect to itself. Prefixes are matched too, so /api/* is covered.
const isExempt = (pathname: string) =>
  pathname.startsWith("/api") || EXEMPT.has(pathname);

// Order matters: the level gate runs before the signed in redirect to /chat,
// or a student with no level can never reach onboarding.
const level = await Promise.race([
  prisma.user.findUnique({
    where: { id: session.user.id },
    select: { levelOfStudy: true },
  }),
  new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
]).catch((error) => {
  log.warn("onboarding gate read failed, allowing request", { error });
  return null;
});

// null means "we do not know", which must never become a redirect.
if (level && !level.levelOfStudy && !isExempt(pathname)) {
  return NextResponse.redirect(new URL("/onboarding", request.url));
}

// Admin: absolute URL, or NextResponse.redirect throws on a relative one.
if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/accept-invite")) {
  if (session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
```

**Replaces**:
- The session plus Prisma read in `app/(dashboard)/layout.tsx` and `app/chat/layout.tsx`, which is one pattern copied twice.
- The inverse read in `app/(onboarding)/onboarding/layout.tsx`.
- The duplicate admin role check in `app/(admin)/layout.tsx`.
- `"use client"` at the top of a page in `app/(marketing)/`, which costs a whole page hydration for one interactive piece.

**Enforcement**:
A rule in root `AGENTS.md` next to the existing framework note, plus code review. No lint rule: Biome has no rule that reads for `await` inside a layout, and a custom rule is not worth the maintenance for a convention this small. AC-14 and AC-15 are the two that a reviewer must actually run rather than eyeball, and their commands are in `verify.md`.

**Rollout**:
One coupled change, because the gates and the layouts are the same edit seen from two ends: landing a layout without its gate would let a student with no level walk into an empty dashboard. The order inside the change is one gate end to end first (the dashboard), then the other three layouts, then the absolute URL fix and the accept invite exemption, then the noindex helper, then the three public pages.

**Exceptions**:
`app/(auth)/sign-in`, `sign-up` and `verify-email` stay client components, because a password field and a one time code input need state and a client page that renders a form is not paying for a hydration it does not need. `app/dev/email/[template]` is a development route and is outside the standard entirely.

## Per route rendering decision table

| Route | Decision |
|---|---|
| `/` | Static shell. A server component with no data. `LandingHero` stays a client island for now; shrinking it is row 14's call. Nothing on the first paint waits on data. |
| `/pricing` | Fully static. Server component with its own `metadata`. The plan grid is one client island: it reads the session and the current subscription, and it holds the subscribe handler. The plan table moves to `constants/plans.ts` so the server page and the island read one list. |
| `/contact` | Fully static. Server component with its own `metadata`. The form is one client island posting to the existing `/api/contact`. |
| `/faq` | Fully static. Server component with its own `metadata`. The accordion is one client island over static answer text, and every answer is in the first HTML. Note two honest limits, both measured on 2026-10-17. Radix renders each closed answer with `hidden` and `data-state="closed"`, so a crawler reads all 18 questions and all 18 answers from the source. And a reader with JavaScript turned off sees nothing at all, not even the questions: Next wraps the whole document in `<div hidden id="S:0">` and only React removes that attribute during hydration, so painted text is 0 characters while the source carries 85,554. That second limit is not this page's doing and applies to every route; see the Follow-up. |
| `/about` `/privacy` `/terms` | Fully static already. Correct metadata already on `/about`. |
| `/catalogue` | Fully static. Server component listing universities and faculties with links to faculty detail pages. Prerendered at build time. noindex: false, indexable. |
| `/catalogue/[university]/[faculty]` | Dynamic per faculty. Server component listing courses in one faculty, with async `metadata` for dynamic titles and JSON-LD Course structured data. Server rendered on demand. noindex: false, indexable. |
| `/sign-in` `/sign-up` `/verify-email` | Client components, by the exception above. Static shell with a client island per form. noindex through the helper. |
| `/onboarding` | Static shell. The wizard is a client component and the shell no longer awaits, so this prerenders like the marketing pages. The gate that keeps finished students out is in `proxy.ts`. noindex. |
| `/dashboard` | Dynamic and streamed. The one authed route that stays dynamic, because the page reads the session to prefetch, which makes the route uncacheable. Shell paints from the layout; the page prefetches on the server and hydrates the client cache. noindex. |
| `/dashboard/*` that prerender static: `/upload` `/quizzes` `/progress` `/leaderboard` `/community` `/settings` `/feedback` `/affiliate` `/subscription` | Static shell with client data through TanStack Query, using the families in `lib/query-families.ts`. These prerender because nothing in their render path reads the database, which is AC-14 working as intended. noindex. |
| `/dashboard/*` that stay dynamic: `/notes/[id]` `/quizzes/[id]` `/attempts/[id]` | Dynamic, for their own reasons and not because of the layout: a route parameter or an id keyed read. Streamed. noindex. |
| `/chat` and `/chat/[conversationId]` | Dynamic. Client shell, streamed tokens, optimistic user message. The conversation list is a client hook. noindex. |
| `/admin` and its nine pages (`accept-invite` `affiliates` `feedback` `metrics` `payment-settings` `plan-upgrades` `platform-settings` `subscriptions` `users`), ten routes in all | Static shell with client data through hooks, for the same reason as the dashboard group. Role check in `proxy.ts` only, exempting `/admin/accept-invite`. noindex. |
| `/primitive-gallery` | Static. Not in the navigation and not in the sitemap, so noindex through the helper. |
| `/_not-found` | The 404 page from `app/not-found.tsx`. Static, no data, no gate, indexable like the marketing pages. Carries the contact details, which is why Next embeds its markup in every route's payload. |
| `/dev/email/[template]` | Development route, outside the standard. |
| `/opengraph-image.png` `/twitter-image.png` | The two file convention images Next emits for the Open Graph and Twitter cards. Static image routes, no rendering decision beyond that. |
| `/favicon.ico` | The file convention icon from `app/favicon.ico`. A static image route with no markup, no gate and no data, so nothing here applies to it beyond that. It was the one route the build emitted that this table did not classify, found by the 2026-10-17 walk against the build manifest. |
| `/_global-error` | The document level error boundary from `app/global-error.tsx`. Static, no data, no gate, and it replaces the whole document rather than rendering inside the root layout, so it inherits none of the shell. It is served only when the root layout itself throws, which is why it is a route in the manifest and never something a student navigates to. Also unclassified until the same walk. |
| `sitemap.xml` `robots.txt` `manifest.webmanifest` | Metadata routes, already static. `robots.ts` is row 36's to rewrite. |
| `app/api/**` | Outside this standard. Route handlers are dynamic by nature and the client cache families already govern what they serve. |

## Consequences

**Positive**:
- The sidebar and header paint on every student screen with no database call in front of them.
- Measured cold, a signed in `/dashboard` issues 21 queries before this decision and 19 after. The two that disappeared are exactly the layout's: one duplicate session read and one `level_of_study` read, the gate's now serving both purposes in a single query. The gate itself did not vanish, it moved into the proxy.
- Four layouts stop being dynamic shells that happen to read data.
- `/pricing` can declare its own title and description for the first time.
- One file holds every gate, and one helper holds the crawl rule, so neither can drift per route.
- Twenty four authed documents became static as a side effect, so their HTML is served from the edge for free.

**Negative / tradeoffs**:
- Navigation still pays one Prisma read before the first byte, so this lowers latency rather than removing it. Measured warm on a local machine the first byte barely moves (p50 21 ms before, 24 ms after), because the local database answers in well under a millisecond and the measurement is dominated by framework overhead. Demonstrating the white screen going away needs a slow link or a slow database, neither of which a build machine has.
- `proxy.ts` is now the most load bearing file in request handling: auth, rate limiting, bot defence, the onboarding gate and the admin role check all live there.
- Failing open means a database blip can show one student with no level an empty dashboard page. A full outage is worse than that: it returns 500, because the session read runs first and is not wrapped (AC-5).
- The three public pages need their interactive parts lifted into separate files, which is a small refactor of working markup.
- Moving the admin role check out of the layout leaves `proxy.ts` as the only thing standing between a student session and the admin surface. That is already true today, but it becomes the only defence rather than one of two.
- `proxy.ts` runs as a separate invocation from the app (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:19` warns that shared modules and globals are not relied on), so the gate gets its own Prisma client and its own Postgres connection pool alongside the app's. Measurement then corrected the shape of that: an instance opens three pools, not two, because `lib/prisma.ts` builds the adapter at module scope while only the client is memoised, so every bundle instance that imports the module opens its own. AC-15 bounds each one at 5 for a free tier rather than leaving them at the library default, and that bound has landed, so the ceiling is 15 per instance rather than the 30 the default allowed.
- Twenty four authed pages are now edge cached, which is a standing footgun. AC-14 is the rule that closes it; without that rule the caching win would be a data leak waiting for the next server read.
- `pnpm db:generate` is still required before a build, since the generated client is gitignored and the proxy imports Prisma from `@/lib/generated/prisma/client`.

**Neutral**:
- No schema change and no migration.
- No new dependency, no new environment variable, and `cacheComponents` stays off.
- Row 35 still owns loading boundaries and per card streaming; row 14 still owns the landing hero; row 36 still owns `robots.ts` and the sitemap.

## Follow-up

- [ ] Record the rendering rule in root `AGENTS.md`, which is what this spec's enforcement depends on. It must carry AC-14, since a prohibition only enforced by review is a prohibition that decays.
- [ ] Row 36 owns the `robots.ts` disallow list, and now also owns the `/notes` and `/attempts` prefixes, which are absent from it. Until then every signed in route is both blocked and marked noindex, which is harmless but redundant, and `/sign-in` and `/verify-email` are in the sitemap while being noindex, which is contradictory.
- [ ] Row 14 owns the landing hero. `components/marketing/landing-hero.tsx` is still a 446 line client component owning the entire first screen, which is the largest remaining instance of what AC-10 is about.
- [ ] Row 35 owns loading boundaries. There is still not one `loading.tsx` in `app/`, so a slow page segment now streams behind a shell with nothing to show while it resolves.
- [ ] If a public catalogue comes back, the rendering decision for it belongs in that feature's own spec, together with the university, faculty and year taxonomy that `docs/scope/pivot.md` row 5 says is the real partition. It does not belong here.
- [ ] The `context7` skill is installed and is the right tool for looking up framework behaviour, but root `AGENTS.md` has no `## Agent skills` section listing it, so it is only found by luck.
- [x] Check the Postgres connection budget now that the proxy holds a second pool. Done by measurement on 2026-10-17: 11 idle connections where one pool caps at 10, confirming a second pool. Resolved by AC-15, which sets an explicit `max`, `idleTimeoutMillis` and `connectionTimeoutMillis` sized for the free Neon tier, and those values landed later the same day. Corrected the same day: the instance holds three pools, not two, so the ceiling is 15 and the adapter is built per bundle instance rather than once. Raise the numbers when the plan changes.
- [ ] Decide what to do about a page that paints nothing without JavaScript. Measured on 2026-10-17: every route in the app, not only the public ones, renders a blank document with JavaScript off, because the bare `<Suspense>` with no fallback at `app/layout.tsx:93` makes Next wrap the document in `<div hidden id="S:0">` and leave it to React to unhide during hydration. No acceptance criterion here is breached, since AC-8 asks for server components with named islands and says nothing about working without JavaScript, but it undercuts the plain text promise behind AC-8's user story. The cause predates this spec (commit 3ef27e8) and row 35, loading states and perceived speed, already owns boundaries and streaming, so the fix belongs to row 35 or to its own spec rather than here. What it needs is a decision, not a patch: either remove the boundary if nothing actually suspends, or give it a real fallback.
- [ ] Add `/notes` and `/attempts` to `proxy.ts`'s `protectedRoutes`. Their pages render their shell for an anonymous visitor today, their APIs correctly return 401, and neither this decision nor AC-14 changes it. A separate small change.
- [ ] Fix the pool comment in `lib/prisma.ts` (lines 11 to 20). It was written during the build and states that the proxy holds "a second client and a second pool" and that `max: 5` caps the instance at 10 connections. Measurement says three pools and a ceiling of 15, so the comment misdescribes the code it sits on. This is a comment, not behaviour: AC-15's values are correct and measured. → `/fault-fix`.
- [ ] Correct the two pools wording still standing in `verify.md` (lines 27 and 33), which assert two pools of 10 and 20 connections per instance in the present tense. `verify.md` is `/verify-release`'s file, so the fix belongs there, not here.
- [ ] Re-open the option of reading the level from the session cache instead of querying it per request. The Rationale rejects it on the grounds that `app/api/onboarding/level/route.ts` writes the level with a direct `prisma.user.update` that does not refresh `auth.api.getSession`'s cookie cache, leaving a five minute stale window. That is a one route fix rather than a reason to reject the option, and taking it would remove the gate's query from the critical path entirely, which in turn removes AC-5's 500 ms race, the `statement_timeout` coupling and most of AC-15's pool anxiety. Weighed as it stands, the option was declined for a premise that did not need to hold.
- [ ] Make AC-7's "cannot forget to" real. The root layout at `app/layout.tsx:70` still declares `robots: { index: true, follow: true }`, so the inherited default is indexable and only a route group that remembers the helper is safe, which is the same miss a verification pass already caught once (`/primitive-gallery` shipped `index, follow` until it was looked for). Either invert the root default to noindex and let the marketing pages opt in, or drop it and rely on the group, but as written the guarantee is rhetorical.
- [ ] AC-3 and the built code disagree about whether exempt paths pay for a query. AC-3 says the gate runs for any non exempt path "so `/` and `/pricing` are covered too", while `/pricing` is in `publicPaths`, which the exemption set includes, and `proxy.ts` short circuits before the read. The built behaviour is the cheaper and better one, and it is what AC-15's pool arithmetic assumes, so the criterion's wording is what needs to change.
- [ ] AC-5's 500 ms is a ceiling on the gate's wait, not on the request. A losing race does not cancel the query, so under a slow but answering database every request leaves a gate query holding a pool slot until `statement_timeout`, and with `max: 5` a burst can queue at connection acquisition for up to `connectionTimeoutMillis` before the race even starts. The fail open guarantee survives that; the latency guarantee does not. Worth stating plainly in the criterion rather than leaving a reader to infer it.
- [ ] Name the sources AC-14 and AC-9 depend on but never pin: AC-9 mandates a `/faq` description promising answers about cost, data use and offline access, and those answers come from `FAQ_ITEMS` in `constants/index.ts` rather than from the static JSX the Value sourcing table names, with two of them authored during this build to make the mandated description true. A Value sourcing row would make the description checkable instead of aspirational.

## Rationale
Reasoning and options: see rationale.md
