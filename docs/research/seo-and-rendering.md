# SEO, GEO, Rendering and Perceived Speed — Research and Recommendations

**Status:** Research only. No application code was changed.
**Date:** 2026-10-12
**Scope:** Pivot of TiCLearn from Cameroonian GCE A-Level students to Cameroonian university students, first market Buea and Bamenda.
**Method:** Direct file reads of the repo, live HTTP inspection of `https://ticlearn.ticsummit.org` and eight competitor domains, Firecrawl web search, and primary documentation from Google Search Central, web.dev, Nielsen Norman Group, nextjs.org and arXiv.

---

## How to read this document

Every claim about the current codebase is cited as `path:line`. Every claim about external systems is cited with a URL. Anything I could not verify is marked **[UNVERIFIED]**. Anything that is community convention rather than vendor documentation is marked **[CONVENTION]**.

Section 9 is the one to read if you read nothing else.

### One correction to the brief, up front

The brief states English and French are two separate markets and that this should shape every recommendation. That is correct as a principle and I have applied it throughout. But the brief's own fact that **Buea and Bamenda are the only two Anglophone state universities** means the French market is *not* your Buea/Bamenda market. Verified SERP evidence in §2.4 shows the French-language SERP for "questions d'examen université Cameroun" is effectively empty — zero local competitors, results returned are French universities, the Cameroonian bar exam, and Tunisian institutions.

So the honest split is:

- **English / Buea / Bamenda / UB and UBamenda faculties and departments** — the launch market, where the competition is weak and the query volume is modest.
- **French / Yaoundé / Douala / private universities / HND schools** — a genuinely empty SERP, a *separate product decision* about whether to be a different site, a different subdomain, or a different language tree. This is a year-two question, not a month-one question. Building French infrastructure in month one without French content would be building doors to empty rooms.

French should still shape the *architecture* now (URL scheme, hreflang capability, a data model that can carry a language) but should not consume the first ninety days of content.

---

## 1. Audit of our current SEO

### 1.1 What exists

| Surface | File | State |
|---|---|---|
| Root metadata | `app/layout.tsx:15-75` | Present, GCE A-Level wording |
| Marketing metadata | `app/(marketing)/layout.tsx:5-30` | Present, GCE A-Level wording |
| About page metadata | `app/(marketing)/about/page.tsx:12-27` | Present, GCE wording |
| Sitemap | `app/sitemap.ts:1-72` | Present, 10 URLs, hardcoded |
| robots.txt | `app/robots.ts:1-27` | Present, single `*` rule |
| Manifest | `app/manifest.ts:1-51` | Present, GCE wording |
| JSON-LD | `components/seo/*.tsx` | Three components, **one used** |
| OG/Twitter images | `app/opengraph-image.png`, `app/twitter-image.png` | Files exist, **not wired to og:image** |
| Canonical / hreflang | — | **Absent entirely** |
| Blog / guides / course catalogue | — | **Does not exist** |

### 1.2 Titles and descriptions: templated or hardcoded?

**Hardcoded, and inconsistently so.** There is no `title.template` anywhere in the repo (verified: `grep` for `template` in `app/**/layout.tsx` returns nothing). The result:

- `app/layout.tsx:17` sets `title: "TiCLearn - AI-Powered Study Platform for GCE A-Level"`.
- `app/(marketing)/layout.tsx:6` **replaces** it with `"TiCLearn - AI-Powered Study Platform for GCE A-Level Cameroon"`.
- Because a child layout's `title` string replaces the parent's outright (it is not appended), the root title at `app/layout.tsx:17` is **dead on every marketing page**. Verified against the live production HTML: the homepage `<title>` is the `(marketing)` variant.

Page-by-page coverage — this is the concrete damage:

| Route | `export const metadata` | Resulting title | Resulting description |
|---|---|---|---|
| `/` | no | inherited from `(marketing)/layout.tsx:6` | inherited from `:7-8` |
| `/pricing` | **no — `"use client"` at `pricing/page.tsx:1`** | inherited, says "GCE A-Level" | inherited, says "GCE A-Level" |
| `/faq` | **no — `"use client"` at `faq/page.tsx:1`** | inherited, says "GCE A-Level" | inherited |
| `/contact` | **no — `"use client"` at `contact/page.tsx:1`** | inherited, says "GCE A-Level" | inherited |
| `/privacy` | no | inherited, says "GCE A-Level" | inherited |
| `/terms` | no | inherited, says "GCE A-Level" | inherited |
| `/about` | yes, `about/page.tsx:12-27` | own | own |

**Six of seven public pages ship a description that describes a product you are abandoning.** A privacy policy page whose meta description says "prepare for GCE A-Level exams" is a wasted impression and a signal of templating to a crawler.

The root cause is architectural, not clerical: `pricing`, `faq` and `contact` are client components, and **you cannot export `metadata` from a `"use client"` file.** Fixing this requires splitting each page into a server shell that owns `metadata` plus a client island, not just adding a title.

### 1.3 Open Graph and Twitter: the missing image

This is the single most consequential defect found.

Verified against both the built HTML (`.next/server/app/index.html`) and the live production response:

```
<meta property="og:title" content="TiCLearn - Study Smarter, Score Higher"/>
<meta property="og:description" content="AI-powered study platform for Cameroonian GCE A-Level students"/>
<meta name="twitter:image" content=".../twitter-image.png"/>
<meta name="twitter:image:type" content="image/png"/>
<meta name="twitter:image:width" content="1920"/>
<meta name="twitter:image:height" content="1080"/>
```

**There is no `og:image`, no `og:url`, and no `og:image:width` / `og:image:height` on any page.**

`app/opengraph-image.png` (1920×1080, verified via `file`) is being shipped by Next — `/opengraph-image.png` appears as a prerendered route in `.next/prerender-manifest.json` — but the `<meta property="og:image">` tag is never emitted.

**Root cause, precisely:** the file-based image convention in Next.js is overridden when you declare an `openGraph` object in metadata without an `images` key. We do exactly that in two places:
- `app/layout.tsx:57-64` — `openGraph: { title, description, type, locale, siteName }`, no `images`.
- `app/(marketing)/layout.tsx:22-29` — same, no `images`.

**Why this matters more here than in most markets:** the brief states sharing happens over WhatsApp. WhatsApp, Facebook, LinkedIn, Telegram and X's own link-preview for external posts all read `og:image`. `twitter:image` is a Twitter-specific tag with no fallback behaviour in those clients. **Today, every TiCLearn link shared into a WhatsApp group renders with no preview image at all** — just a bare title and a line of text. This is a conversion problem before it is an SEO problem.

Also verified absent: `og:url`. WhatsApp and Facebook use `og:url` to key the cache for a shared link. Without it, the preview cache is keyed on the URL alone and stale previews are harder to force-refresh when you fix this.

### 1.4 Canonical and hreflang: completely absent

Verified: `grep -rn "canonical\|hreflang\|alternates"` across `app/` returns **zero** metadata results. The only hits for `twitter` in `app/` are the two share links in `app/(dashboard)/practice/exam/result/[attemptId]/page.tsx:259,266`, which are outbound intents, not metadata.

Consequences:

1. **No canonicals anywhere.** For the nine currently-prerendered routes this is survivable because there is one URL form. It stops being survivable the moment you add a public catalogue, because you will have `/course/x`, `/courses/x`, `/programs/y/courses/x`, query-string variants, and the trailing-slash question. See §3.4.
2. **No hreflang at all.** For a Cameroon market this is the correct *starting* state — you have one language. But it means the French tree, when it arrives, has no inheritance to build on, and it means `en_CM` in `app/layout.tsx:62` is a decorative Open Graph locale with no corresponding `<link rel="alternate">`.

### 1.5 Sitemap: coverage and honesty

`app/sitemap.ts` contains **10 hardcoded URLs**. Findings:

**a) Wrong URLs are in it.** `app/sitemap.ts:53-70` submits `/sign-in`, `/sign-up` and `/verify-email`. These are authentication screens. They are not `noindex` (verified: `app/layout.tsx:71-74` sets a global `robots: { index: true, follow: true }` and nothing overrides it), so Google can and will index them, and the sitemap is actively instructing it to. Sign-up is arguably worth indexing; sign-in and verify-email are not. Right now a crawler is being told your sign-in page is a priority-0.3 landing page.

**b) The pages that deserve ranking are not in it.** There is no `/result/[shareId]` entry — the only organically shareable public surface in the product — and no catalogue, because no catalogue exists.

**c) `lastModified: new Date()` on every entry.** `app/sitemap.ts:10,17,24,31,37,43,49,56,62,68`. Google states: *"Google ignores `<priority>` and `<changefreq>` values"* and *"Google uses the `<lastmod>` value if it's consistently and verifiably (for example by comparing to the last modification of the page) accurate"* — [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). A `<lastmod>` that equals the build time is *never* verifiably accurate for a static marketing page. You are claiming daily churn on ten pages that change twice a year.

**A wrinkle worth knowing.** Because the sitemap is prerendered (confirmed in `.next/prerender-manifest.json`: `/sitemap.xml` with `initialRevalidateSeconds: false`), `new Date()` is evaluated **at build time and then frozen**. The live sitemap currently reads `2026-07-08T15:28:27.368Z` on all ten URLs — identical to the millisecond, three months stale, and will remain so until someone rebuilds. So the accidental behaviour today is *stable but wrong*; the intended behaviour is *wrong every rebuild*. Fix it properly: derive `lastModified` from real `updatedAt` columns, and only emit the field when you have one.

**d) Priorities are theatre.** Every `priority` and `changeFrequency` value in the file is ignored by Google per the citation above. They are not harmful, but they are 20 lines of maintenance expressing nothing. Spend that effort on `lastModified` instead.

**e) No sitemap index.** Google caps one sitemap at 50,000 URLs / 50 MB (same doc). A university catalogue — UB has roughly 10 faculties and UBamenda similar, times departments times courses times papers — will pass 50,000 URLs inside a year at any reasonable depth. Plan for `sitemap.ts` as an index from day one.

### 1.6 robots.txt

`app/robots.ts:5-24`. Findings:

**a) The blocklist is stale and partly fictional.** It disallows `/dashboard/`, `/settings/`, `/quizzes/`, `/upload/`, `/progress/`, `/community/`, `/leaderboard/`, `/gce-exams/`, `/feedback/`, `/affiliate/`, `/subscription/` (lines 11-22). Cross-referencing `proxy.ts:35-51`, the actual protected route list is different: `/practice` and `/onboarding` are protected in `proxy.ts:49-50` but **absent from robots.txt**. So `/practice/*` and `/onboarding` are crawlable and indexable.

This is not fatal because `proxy.ts:74-84` redirects unauthenticated requests on protected routes to `/sign-in?callbackUrl=...`. A crawler hitting `/practice` gets a 307 to `/sign-in`, which it may then index as the canonical version of the practice page. That is a soft-fail, not a hard-fail, and it wastes crawl budget on redirect chains.

**b) The one page that *should* be blocked isn't blocked, and the one that shouldn't be allowed is.** `/result/[shareId]` is genuinely public (`app/result/[shareId]/page.tsx:76-182` reads from Prisma with no session check, and `proxy.ts:18-31` does not list it) — so allowing it is correct. But there is nothing in robots.txt *distinguishing* "public by design" from "authed by accident", which is a fragile way to manage a growing public surface.

**c) `allow: "/"` at line 7 is a no-op** and signals that the file was written without understanding. The idiomatic form omits it.

**d) The robots meta tag is globally permissive.** `app/layout.tsx:71-74` emits `robots: { index: true, follow: true }` on **every route including every authed dashboard page**. For the dashboard, robots.txt is doing the work that the robots meta tag should be doing. Per Google's own documentation, `X-Robots-Tag: noindex` is the stronger and more reliable signal — and critically, a page blocked by robots.txt that also carries `noindex` will have the `noindex` **ignored**, because the crawler cannot fetch the page to see it ([Robots meta tag, data-nosnippet, and X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)). **Never do both.** Choose one, and for authed surfaces choose `noindex` in the meta tag and remove them from robots.txt, so the crawler can actually read the instruction.

**e) No AI crawler rules at all.** See §4.3.

### 1.7 Structured data: one of three components is dead code

Verified by `grep` across `app/` and `components/` for `FAQSchema|BreadcrumbSchema|OrganizationSchema`:

- `OrganizationSchema` — used once, at `app/layout.tsx:85`.
- `FAQSchema` — **never imported anywhere.** `components/seo/FAQSchema.tsx` is dead code.
- `BreadcrumbSchema` — **never imported anywhere.** `components/seo/BreadcrumbSchema.tsx` is dead code.

This is insulting because both unused components solve problems you actually have:

- `app/(marketing)/faq/page.tsx:26-35` renders `FAQ_ITEMS` from `@/constants` — 20 question/answer pairs are already authored and rendered. `FAQSchema` exists to mark exactly that up and is not wired in. (See §3.6 for whether that markup is still worth having — the rich result is gone, but the markup is not worthless for AI engines.)
- You have no breadcrumb trail on any page, because you have no nested URLs. Once the catalogue exists, this component is already written.

**Defects inside the one component that is used**, `components/seo/OrganizationSchema.tsx`:

- `:4` `@type: "EducationWebSite"` — this is a real schema.org type, but declaring `EducationWebSite` without also declaring the `WebSite` entity it implies, and without a `SearchAction` `potentialAction`, is half a pattern. You are already missing the one thing that makes an education site an entity in Google's knowledge graph.
- `:7` `logo: "https://ticlearn.ticsummit.org/icons/icon-512.png"` — **this file does not exist.** Verified: `public/icons/` contains only `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, `favicon-16x16.png`, `favicon-32x32.png`. The logo URL 404s. A broken logo reference degrades the Organization entity rather than strengthening it.
- `:19` `availableLanguage: ["English", "French"]` — asserts a French service that does not exist, on an organization whose target market is two Anglophone universities.
- `:10` `sameAs` has one URL, LinkedIn. Entity corroboration is the cheapest GEO and local-SEO lever available; one link is not corroboration.
- `:26-30` `potentialAction` is `UseAction` (sign up) rather than `SearchAction`. On an education site the defensible action is search your catalogue, once one exists.

### 1.8 Manifest

`app/manifest.ts` is a technically competent file (maskable icons, shortcuts, categories, standalone display) with two problems:

- `:5` and `:7-8` carry GCE A-Level wording that must be rewritten.
- `:30-48` the three shortcuts point to `/upload`, `/leaderboard` and `/chat` — all three are in `proxy.ts:35-51`'s protected list. An installed PWA on a student's home screen will deep-link straight into a login redirect. Shortcuts should point somewhere a logged-out user can actually land.

Notably absent from the manifest: `screenshots`. It is not a ranking factor, but it materially affects the "add to home screen" prompt on Android, which is the install path that matters on a 90%-no-laptop audience.

### 1.9 next.config.ts

`next.config.ts:3-8` in full is four keys: `reactCompiler`, `allowedDevOrigins`, `serverExternalPackages`. Absent, and each absence is a finding:

- **No `cacheComponents: true`.** You are on the previous caching model, not the Next 16 one. This is currently *fine* — see §6.5 for the migration reasoning — but it is a decision you are making by accident.
- **No `images` config.** Every `next/image` usage gets the defaults. More importantly, no remote `remotePatterns` is configured, which constrains how you can build per-page share-card generation later. See §5.4.
- **No `redirects()`.** Combined with the absence of canonicals (§1.4), there is no normalisation layer. Next.js's default `trailingSlash: false` does 308-redirect `/pricing/` → `/pricing`, which is correct behaviour, but nothing handles the GCE-era URL paths you will want to keep equity from. When you rewrite the metadata for the university pivot, you will be invalidating URLs that may already have been crawled and bookmarked and shared into WhatsApp groups. There is currently **no redirect map** to catch them.
- **No `poweredByHeader: false`.** Free win, trivial.

### 1.10 The one page that is designed for sharing is not built for it

`app/result/[shareId]/page.tsx` is the strongest organic asset in the product — it is public, it is already reachable via a link that students will paste into WhatsApp groups, and it is exactly the "I got a B in this, look" social object that spreads.

It has three defects:

1. **No `generateMetadata`.** The page exports only a default component (`:76`). It inherits the GCE A-Level title and description from `app/layout.tsx` / `(marketing)/layout.tsx`. Every share link says "AI-Powered Study Platform for GCE A-Level" regardless of what was shared. The per-result metadata is the entire point.
2. **No share image.** No `opengraph-image` route segment for this page, no `og:image`. Per §1.3, the WhatsApp preview is already broken; on this page it is the worst broken, because this is the page people *choose* to share.
3. **`:103-108` a raw `<img>` for the user avatar** with no `width`/`height` attributes. This is a guaranteed CLS contributor on exactly the connection type you care about, and `:103` is inside the LCP region of the card.

### 1.11 Proxy behaviour that shapes the SEO story

`proxy.ts:59-64`:

```ts
if (pathname === "/") {
  if (sessionCookie && session) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }
  return NextResponse.next();
}
```

Every logged-in user is redirected from `/` to `/chat`. A crawler has no session and always sees `/`, so this is not an SEO defect today. But it tells you something important about the product's shape: **there is no public landing surface a returning student lands on.** Today the entire funnel is sign-up → chat. For an SEO-led university strategy that has to change, because the routes Google will send people to are the routes your own users never re-visit.

Also: `proxy.ts:13` allows Arcjet bots only for `CATEGORY:SEARCH_ENGINE`, `CATEGORY:MONITOR`, `CATEGORY:VERCEL`. **AI answer-engine crawlers are not in that allowlist.** Combined with the absence of any AI rules in robots.txt (§1.6e), this is a live risk: your first AI crawler to arrive may be challenged by Arcjet's bot detection rather than served a clean 200. See §4.3.

### 1.12 A content system that exists and cannot be seen

This is the most important structural finding in the audit, and it is not an SEO defect — it is a product defect that blocks SEO.

`prisma/schema.prisma:1098-1114` defines a full long-form content model:

```prisma
model RevisionGuide {
  id          String             @id @default(cuid())
  title       String
  markdown    String             @db.Text   // ← long-form content, already modelled
  focus       RevisionGuideFocus @default(MIXED)
  published   Boolean            @default(false)
  pdfUrl      String?
  ...
}
```

You have a `markdown` long-text column, a `published` flag, and a `focus` taxonomy for guides. You have **no page that renders them.**

- `app/api/revision-guides/route.ts:10-11` requires a session and returns 401 without one. Every revision guide is behind auth.
- Worse, `:17-27` — the Prisma `select` clause **does not include `markdown`.** Even an authenticated client is served only `id, title, focus, pdfUrl, pdfFileName, createdAt, updatedAt`. The markdown body is written to the database and never read out.

So: the machine for producing indexable long-form content exists, is populated in a schema sense, and is entirely invisible to both users and crawlers. **This is the cheapest possible entry into the content strategy in §9.3.**

### 1.13 The data model has no university taxonomy

Verified by grep for `FACULTY`, `SEMESTER`, `University`, `Faculty` across `prisma/schema.prisma` — **zero matches.**

`prisma/schema.prisma:138-151`:

```prisma
model Program {
  examLevelId String @map("exam_level_id")
  name        String
  code        String @unique
  components  Component[]
  examProfilePrograms ExamProfileProgram[]
  examLevel   ExamLevel @relation(...)
}
```

Everything hangs off `ExamLevel`. There is no University, no Faculty, no Department, no Course, no Semester. The seed (per `AGENTS.md`) is 15 O-Level subjects and 8 HND specialties — flat lists.

**You cannot build the catalogue that wins this market without this taxonomy.** Every competitor in §8 that ranks owns the same three-level structure: University → Faculty → Department → Course. `papers.ndetek.com` has `/en/university/university-of-bamenda` → `/en/department/chemistry-chm-62u8`. You have none of it.

### 1.14 Rendering state, measured

From `.next/prerender-manifest.json`, these routes are prerendered with `initialRevalidateSeconds: false` (fully static, never revalidated):

`/`, `/about`, `/contact`, `/faq`, `/pricing`, `/privacy`, `/terms`, `/sign-in`, `/sign-up`, `/verify-email`, plus `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, and the two image routes.

Two API routes are ISR-cached at 120s: `/api/public/gce-blueprints` and `/api/public/p1p2-mock-modules` (both also set `Cache-Control: public, s-maxage=120, stale-while-revalidate=300` — verified at `app/api/public/gce-blueprints/route.ts:5,58` and `app/api/public/p1p2-mock-modules/route.ts:5,57`).

**Everything else is dynamic.** Verified: no `loading.tsx` file exists anywhere in `app/` — `find app -name "loading.tsx"` returns nothing. The only route-level error handling is `app/error.tsx` and `app/not-found.tsx`.

Client component count: **149 files** declare `"use client"`. In `app/(dashboard)/` and `app/chat/`, **21 of 22 page files** are client components.

There is exactly **one** `<Suspense>` in the whole application outside of the three auth pages, and it is `app/layout.tsx:94`, wrapping the entire tree with **no fallback prop**:

```tsx
<Suspense>
  <QueryProvider>
```

A `Suspense` boundary with no fallback renders nothing while pending — it is functionally identical to no boundary, except it opts the tree into a client-side boundary. It provides zero loading UX. This is worth knowing precisely because it is currently the *only* Suspense on the site, and it does nothing.

### 1.15 Live production measurements

Against `https://ticlearn.ticsummit.org/` (measured from this workstation, **not from a Cameroonian network** — treat latency as directional only, byte counts as exact):

| Metric | Value |
|---|---|
| HTML, uncompressed | 112,418 bytes |
| HTML, gzip | 14,931 bytes |
| HTML, brotli | 12,819 bytes |
| JS + CSS chunks referenced | 19 |
| JS + CSS total (compressed) | ~339,878 bytes |
| TTFB | 2.81 s (not Cameroon) |
| `server` | Vercel |
| `x-nextjs-prerender` | `1` |
| `cache-control` | `public, max-age=0, must-revalidate` |
| `x-nextjs-stale-time` | `300` |

**Roughly 340 KB of compressed JavaScript and CSS to render a marketing landing page.** At $1.63/GB the direct cost is about $0.0005 per visit, which is genuinely negligible — the problem is not money, it is time. On a congested 4G link with a realistic effective throughput in the low megabits per second, 340 KB of assets is multiple seconds of wall-clock before the page is interactive, and it is being shipped to a device that a large majority of this audience does not own a laptop to supplement.

The `cache-control: public, max-age=0, must-revalidate` header on a prerendered page also means every marketing page view is revalidated at the edge rather than served as a truly static asset — a small, fixable waste.

---

## 2. What people actually search

### 2.1 An honest statement about search volume

**[UNVERIFIED]** I could not obtain reliable monthly search volumes for any of these queries. No free tool exposes Google Search Console or Keyword Planner data for Cameroon, and the commercial tools that do (Ahrefs, Semrush, Semrush's local database, Google Keyword Planner) do not publish figures I could independently confirm in this session. Any number I printed would be invented.

What follows is therefore **SERP composition analysis** — who ranks, what kind of domains they are, how fresh they are, and what shape of result sits above us. That is a weaker signal than volume but a *sufficient* one for the decision that actually matters here: **where can a small site plausibly rank at all.** Google is not ranking on volume in these SERPs; it is ranking on topical association with a thin competitive field, which is a much more favourable situation.

I have used `firecrawl search --sources web` (web only, no Alexandria tools) to sample SERPs, with Cameroon geo-targeting where possible. Raw outputs are in `.firecrawl/s01.json` through `.firecrawl/s18.json`.

### 2.2 Query landscape, English

**`university past questions Cameroon`** (`.firecrawl/s01.json`)

| Position | Result | Type |
|---|---|---|
| 1 | `cameroonpastquestions.com` | Purpose-built competitor app |
| 2 | Facebook group ("All Concours Past Questions and Job Opportunities \| Bamenda") | Social |
| 3 | Scribd document | User-uploaded scan |
| 4 | Studydrive (`/uni/university-of-buea/16130`) | User-upload, aggregator |
| 5 | `kamerpower.com` | WordPress authority site |
| 6 | Instagram post | Social |
| 7 | Course Hero school page | Aggregator |
| 8 | Studocu institution page | Aggregator |
| 9 | EDUopinions | Directory |
| 10 | `estudyuniverse.com/nahpi-bamenda/` | Competitor app |

**Read:** three of the top ten are social or user-upload platforms. One is a purpose-built competitor with, per §8.1, **no robots.txt, no sitemap, no internal linking and no content pages**. This is the weakest top-ten I have seen in any vertical.

**`Buea university past questions PDF download`** (`.firecrawl/s02.json`)

Course Hero school page → Studydrive institution page → `cameroonpastquestions.com` → `estudyuniverse.com/faculty-of-engineering-and-technology-buea/` → MeetLearn category → Scribd scan → Studocu institution page → `ubuea.cm` (the university itself) → an unrelated PDF → `estudyuniverse.com/colledge-of-technology-buea-cot/`.

**Read:** the aggregators (Course Hero, Studydrive, Studocu, Scribd) own the "download a specific scanned paper" intent because they have the scans. You will not out-rank them for that intent and should not try — they are also paywalled and hostile to mobile data. **The playable queries are the ones aggregators cannot satisfy: "which courses are in this department", "what actually came up", "how do I revise this without the paper".**

**`Bamenda university past questions semester exam`** (`.firecrawl/s03.json`)

Scribd → `cameroonpastquestions.com` → Facebook → Studocu institution page → **`papers.ndetek.com/en/faculty/faculty-of-science-fs-tchr`** → `estudyuniverse.com/nahpi-bamenda/` → `kamerpower.com/enset-bambili-past-questions/` → Facebook group → Scribd → MeetLearn COLTECH category.

**Read:** NdeTek is already winning on a real Bamenda faculty query. They are a Next.js app with a proper three-level taxonomy, a bilingual `/en` + `/fr` structure, and real hreflang. **They are the single most dangerous competitor in this list and they are also the best blueprint.** See §8.5.

**`HND past questions Cameroon`** (`.firecrawl/s04.json`)

YouTube playlist → Scribd → **`cameroonhnd.com`** → GitHub repo (`Tundroid/hnd_past_questions_practical`) → `cameroongcerevision.com` PDF → Scribd → Facebook group → Studocu → YouTube → Course Hero.

**Read:** a GitHub repository and a YouTube playlist outrank every dedicated site. This is the clearest possible signal of how thin this market is. It also shows that HND is *not* the university market — it is a separate national-level market with its own competitors. Do not merge it with the university pivot.

**`Temo Vision Cameroon past questions`** (`.firecrawl/s11.json`) — Temo Vision itself resolves at `temovision.com`. Verified by direct scrape (§8.4): it is a dental and eye clinic with an online pharmacy and a blog. Its own meta description reads *"We run a high-quality, professional and friendly dental and eye care clinic. Also, check our online pharmacy in Cameroon, store, and blog."* It ranks for a query about exam papers because it wrote blog posts about them. **That is the whole story of this SERP.**

### 2.3 Course and faculty-level queries

From `.firecrawl/s06.json` (`"University of Buea" "past questions" OR "sample questions" course handout`):

Studocu institution → Facebook (COT entrance) → `estudyuniverse.com/fet-buea-concours-preparation-guide/` → `acadexcognitive.com/courses/concours-fet-buea/` → Scribd → Kamerpower → ResearchGate → LinkedIn profile → Instagram.

Two observations:

- **Faculty/department pages are largely unclaimed.** `estudyuniverse.com` has `/faculty-of-engineering-and-technology-buea/` and `/colledge-of-technology-buea-cot/`, but that is a competitor covering two schools, and the naming is inconsistent (`colledge` — their typo, which is a real ranking asset for exact-match queries that nobody corrects).
- **`acadexcognitive.com` has a course page** (`/courses/concours-fet-buea/`) — a paid course product with its own landing page. Nobody in this market has built *programme* pages beyond concours.

### 2.4 Query landscape, French — the empty SERP

**`"questions d'examen" OR "sujets d'examen" université Cameroun téléchargement`** (`.firecrawl/s17.json`)

Results: Cameroonian bar exam on Scribd → a Telegram channel → **Université de Yaoundé I on a GIS blog** → a Belgian university on Studocu → an Ivorian legal publisher → a Japanese scholarship site → a French university library page → a maths site → **epreuve-express.com** → a French CAP preparation site.

**`"Buea" OR "Bamenda" étudiants révision semestre questions exposés`** (`.firecrawl/s18.json`)

Results: a Yaoundé I PDF → a master's thesis about French pedagogy at UB on Scribd → two theses about French in Anglophone Cameroon universities → an IDRC report → two Tunisian/French university pages → a Cameroonian pedagogical journal → an Ivorian thesis → a French master's programme guide.

**Read, carefully and honestly:**

1. **The French SERP for this intent is genuinely empty.** Not "thin" — empty. Zero Cameroonian university competitors. Zero French-language past-paper sites. Not one.
2. **But the results that do appear are academic and French-only** — the ones that rank are theses and institutional PDFs, not commercial study sites. This means Google has no French-language precedent to match and is falling back on general French academic content.
3. **Two of those results are the correct geography.** The Buea searches return papers *about French pedagogy at the University of Buea* — an accidental signal that there is French-language demand inside the Anglophone universities (French is a taught language there and a large share of Anglophone Cameroonian students are Francophone or bilingual). But that is a literature-search intent, not a study-tool intent.
4. **Conclusion:** the French market is a real, uncontested, and *separately situated* opportunity — but it is a Douala/Yaoundé/private-university/HND opportunity. It is not the Buea/Bamenda launch market, and treating it as one would mean building for the wrong universities.

### 2.5 Who owns what

| Query cluster | Owned by | Our realistic position |
|---|---|---|
| "university past questions Cameroon" | cameroonpastquestions.com (no sitemap, no links) | **Contestable.** Their technical SEO is close to zero (§8.1). |
| "Buea past questions download" | Course Hero, Studydrive, Studocu, Scribd | Do not compete. Compete on adjacent intent. |
| "Bamenda faculty X past questions" | papers.ndetek.com | Contestable only with better content and a real taxonomy. |
| "Buea faculty/department X" | Nobody, persistently | **Open.** |
| "HND past questions Cameroon" | YouTube, GitHub, cameroonhnd.com | Different market. Defer. |
| "GCE past questions Cameroon" | cameroongcerevision.com, eStudyUniverse, kamerpower, temovision.com blog | **Leave it.** This is the crowded, saturated, university-irrelevant end. |
| French-language anything | Nobody | Open, but wrong geography. Defer to year two. |

### 2.6 Where a small site can actually rank

The structural insight from all of the above: **in this SERP, Google is matching topical association, not domain authority.** A dental clinic ranks for "Cameroon past questions". A GitHub repo ranks for HND papers. That happens when a query has low absolute volume and a low-authority competitive field — exactly our situation. It means:

- Long-tail, hyper-local, structurally-specific queries are winnable by a small site with a small domain.
- Head terms ("Cameroon past questions") are contested by whoever has the most indexed pages, and the leader has almost no SEO infrastructure — so it is winnable on *page count and topical density*, not on authority.
- **The winning move is depth per entity, not breadth.** Twenty well-built department pages will outperform two thousand thin ones. This inverts the usual instinct to build a sitemap as fast as possible.

---

## 3. SEO fundamentals for a real Next.js App Router app

Documentation used: Google Search Central (all URLs verified as live and scraped this session), web.dev, nextjs.org, ogp.me.

### 3.1 Technical SEO for Next.js App Router

Next.js emits correct `<title>`, `<meta>` and `<link rel="canonical">` from the Metadata API, and this is the right API to use. Three App Router specifics that catch people out:

1. **Metadata must be exported from a Server Component.** A `"use client"` page cannot export `metadata`. Verified impact: `pricing/page.tsx:1`, `faq/page.tsx:1`, `contact/page.tsx:1` are all client components and therefore metadata-incapable. For any page that needs interactive behaviour *and* metadata, the correct shape is a server page that exports `metadata` and renders a client child.
2. **`generateMetadata` receives `params` as a Promise** in Next 15/16. `app/result/[shareId]/page.tsx:77` correctly does `const { shareId } = await params`. Any `generateMetadata` you add for catalogue pages must use the same signature.
3. **Serializability.** Metadata values passed down the tree must be serializable. Fetching a course from Prisma inside `generateMetadata` and a second time in the page body means two queries per request unless you wrap the loader in React `cache()`. Budget for this.

On JavaScript rendering specifically, Google states that it renders pages in two passes and will index JavaScript, but that server-side or pre-rendered content is "significantly more optimal for the first wave of indexing" — [Understand the basics of JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). Given the current 340 KB asset payload, this is not a theoretical concern for you. See §6.

### 3.2 Sitemap strategy for a large public catalogue

The concrete design:

- **Sitemap index, always.** One sitemap caps at 50,000 URLs / 50 MB. Split by entity type: `/sitemap-pages.xml`, `/sitemap-universities.xml`, `/sitemap-courses.xml`, `/sitemap-papers.xml`, `/sitemap-guides.xml`. In Next.js this is `app/sitemap.ts` returning an index pointing at sibling route handlers, or a single `generateSitemaps` export — check the current API in `node_modules/next/dist/docs/` before implementing, per `AGENTS.md`.
- **`lastmod` must be real.** Derive from the row's `updatedAt`. Omit the field entirely when you have no genuine modification date. Google's rule is that `<lastmod>` is only *used* when consistently accurate — so an honest omission is strictly better than a fabricated timestamp. Ignore `priority` and `changefreq` entirely; they are documented as ignored.
- **Only indexable, canonical, public URLs.** Not sign-in. Not authed. Not paginated lists. Not query-string variants.
- **Include your share pages.** `/result/[shareId]` is crawlable and public today but unsitemapped. Deciding whether to sitemap dynamic share pages is a judgement call — they are user-generated and low-value per-URL, but they are also the natural internal-link targets for your own marketing. Recommend: **noindex the share pages individually via `generateMetadata`, and link to them from shareable result context, not from the sitemap.** A noindexed page that accrues internal links still passes its signals to its targets.

### 3.3 Robots rules that keep authed surfaces out without blocking what you want

The rule: **pick one mechanism per surface, never both.**

- **Authed surfaces → `X-Robots-Tag: noindex` or a robots meta `noindex`, and leave them crawlable.** They must stay *crawlable* for the crawler to *read* the noindex. This is the exact failure mode in §1.6d: the current robots.txt disallows those paths, which means even if you added a meta noindex, Google would never see it.
- **Public surfaces → nothing.** No robots.txt entry, no noindex, meta `index, follow` by default. Google's own docs describe `noindex` as the tool for "pages that should not be in the index", and `robots.txt` `Disallow` as a *crawling* control — they are not substitutes ([Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [How search engines use robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)).
- **Remove the phantom entries.** `/gce-exams/` (`app/robots.ts:19`) is GCE-era and will not survive the pivot. Every stale disallow is a place where a new public route can accidentally inherit a block.

Concretely for the current file: delete `/api/` (a crawler has no business there and blocking it saves nothing), delete the stale GCE paths, add the authed paths that are currently missing, and add **explicit** AI-crawler rules (§4.3).

### 3.4 Canonical and trailing slash

- Next.js defaults to `trailingSlash: false`, so `/pricing/` 308s to `/pricing`. That is the right default — leave it.
- **Set `trailingSlash: false` and `skipTrailingSlashRedirect: false` explicitly in `next.config.ts`** rather than relying on it, so a future config edit cannot flip it and silently create a duplicate-content problem.
- **Emit `alternates.canonical` from a single source of truth**, not per-page by hand. The pattern that scales: derive the canonical from the route's own URL in the shared metadata helper, so it is correct by construction. Right now there is no such helper — every page hand-rolls its metadata, which is precisely why six pages have the wrong description.
- **Plan the redirect map now.** The pivot invalidates the current `/gce-exams/*` vocabulary and any `/practice/*` deep links that may have been shared into WhatsApp groups. Those links have real value — they are the only links this product has ever put into circulation. Put them in `next.config.ts` `redirects()` with permanent 308s before launch, not after.

### 3.5 hreflang: English and French as separate markets

Google's guidance, verified at [Manage localized versions of your site](https://developers.google.com/search/docs/specialty/international/localized-versions):

- Each language version declares `<link rel="alternate" hreflang="...">` for **every** version including itself, and an `x-default` fallback: `<link rel="alternate" hrefLang="en" href="..."/>`, `<link rel="alternate" hrefLang="fr" href="..."/>`, `<link rel="alternate" hrefLang="x-default" href="..."/>`.
- **Every alternate must be fully reciprocal.** Google explicitly does not honour one-way annotations.
- `x-default` exists for "any language not explicitly listed", which is the correct target for an auto-redirecting or language-selector home page.
- `hreflang` is a hint, not a directive: Google says you still need distinct URLs per language and distinct canonicals. **Hreflang does not replace the canonical.**

**Recommendation, and it is not the recommendation most teams make:** do **not** build French hreflang in the first ninety days. Build the *capability* — a URL scheme and metadata helper that can emit alternates — and defer the French tree. `papers.ndetek.com` ships `/en` and `/fr` prefixes with hreflang today and is a very small operation; they are demonstrating that it is possible, not that it is prioritised. Their hreflang deserves a note: I fetched a faculty page and the three alternate tags it emits point at `/en` and `/fr` **homepages**, not at the faculty page's French equivalent. **That is a bug on their side, not a pattern to copy.** Verify your own reciprocity carefully or the annotation is worthless and mildly harmful.

In Next.js, hreflang is expressed as `alternates.languages` in metadata — but if your language lives in a URL path segment (`/fr/courses/x`), it is cleaner to emit the `<link>` tags directly in the `<head>` of the French route group so you control reciprocity explicitly. Check the current recommended API in `node_modules/next/dist/docs/` per `AGENTS.md`.

### 3.6 Structured data: what genuinely applies

Google's baseline, verified at [Structured data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies):

> "Structured data is not a ranking factor for your pages" — it affects rich result *appearance*, not web search ranking.

And: *"Google does not guarantee that your structured data will show up in search results"* even when the Rich Results Test passes. It is also ignored if it is not representative of the main page content, if it is stale, or if it marks up hidden content.

**Honest assessment, type by type:**

| Type | Applies? | Reality |
|---|---|---|
| `Organization` | **Yes** | You have it, merged into `EducationWebSite`. Fix the broken logo, drop the false French claim, expand `sameAs`. This is also the main GEO entity lever (§4.5). |
| `WebSite` + `SearchAction` | **Yes, once you have a catalogue** | The single highest-value addition. A search box that ranks is the difference between an app and a destination. |
| `BreadcrumbList` | **Yes, once you have nested URLs** | Component already exists at `components/seo/BreadcrumbSchema.tsx`, unused. Also currently desktop-only in Google ([verified in the breadcrumb docs changelog](https://developers.google.com/search/updates): breadcrumb rich results "only appear on desktop search") — so it is a minor SERP play and a real entity-structure play. |
| `Course` | **Yes, with caveats** | [Course structured data](https://developers.google.com/search/docs/appearance/structured-data/course) is real, supported, and produces a rich result with a course list. Requires `provider` as an `Organization` and specific properties. **The genuine problem:** `Course` markup is intended for something you can take. A revision guide or a past paper is not a course. Do not force it. |
| `LearningResource` | **Yes, conceptually** | schema.org type, **not** in Google's rich result gallery. [UNVERIFIED] no Google documentation exists for it. It is not useless — it is machine-readable semantics that AI engines can parse — but do not expect a SERP feature and do not build a strategy on it. |
| `FAQPage` | **Effectively no, in Google** | **Verified: `https://developers.google.com/search/docs/appearance/structured-data/faqpage` now 302-redirects to `https://developers.google.com/search/updates#removing-faq-rich-result`.** Google removed FAQ rich results. They were restricted in Aug 2023 to authoritative government and health sites, then removed. Your `FAQSchema.tsx` would produce nothing. **Keep the component wired anyway for one reason only: AI engines read it.** It is cheap, it is correct, and it costs nothing to leave in. But delete the ambition from the plan. |
| `SoftwareApplication` | **Marginal** | Relevant to app-store listings, not really to organic web. Low priority. |
| `Article` / `BlogPosting` | **Yes, for guides only** | Not for catalogue pages. Every guide page needs one. |

**The genuinely important point:** structured data does not rank. The reason to care here is not rich results — it is that every competitor in §8 ships **zero** JSON-LD (verified across temovision.com, eStudyUniverse, cameroongcerevision.com, kamerpower.com, papers.ndetek.com, smartwaygceapp.com, school-forall.com, cameroonpastquestions.com — all eight returned a JSON-LD count of 0). It is uncontested whitespace, it is cheap, and it helps AI engines (§4.6). But it is not the lever. The lever is content.

### 3.7 Handling the fact that most content is behind auth

This is the defining structural constraint of this business, and it needs a blunt answer.

**You cannot rank what you will not let a crawler read.** Auth-gated content is, for search purposes, non-existent. No amount of quality fixes a `401`.

So the strategy cannot be "put the good content behind login." It must be:

> **Publish a genuinely useful public surface that is worth a click, and put the paywalled depth one authenticated interaction behind it.**

Concretely, for a university paper this means the public page shows:
- the exam's identity (institution, faculty, department, course code, level, year, session),
- the **shape** of the paper — how many questions, how many marks, which sections, how long — which you *already model* in `lib/public-gce-catalog.ts` as `questionCount`, `totalMarks`, `durationMin`, `paperStyle`, `sections[]`,
- and a sample of worked content.

Everything behind login: the full paper, the marking scheme, the attempts, the AI grading.

This is not a compromise, and there is a direct precedent in your own codebase: `lib/public-gce-catalog.ts:12-31` already defines a `PublicBlueprintCard` with exactly the right fields. It was built for a landing-page preview. **That type is the shape of a public catalogue page. It is already designed.**

**There is a risk worth naming explicitly.** Given 93% of students cheat (per your brief), and given that past papers circulate as photocopies precisely because they are scarce and valuable, an indexable, well-organised paper archive is (a) genuinely valuable, and (b) exactly the thing that makes TiCLearn look like an answer machine. See §9.2 for the framing that resolves this. It is a content-architecture problem, not a technical one, and the resolution is to publish *shape, method and provenance* and withhold *answers*.

### 3.8 Internal linking

- Google: *"Link to every page you care about from at least one other page"* is the effective guidance on discoverability — [Links and Google Search](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Every new public page needs an inbound link from an existing indexed page on day one.
- The catalogue gives you a natural, dense link structure: University → Faculty → Department → Course → Paper. Every course page links to its department; every department to its faculty; every faculty to its university. This is the mechanism by which a new course page inherits ranking from its department on day one. **Ship the links in the server component, not the client.**
- Add a "recently added papers" module to the homepage. It does two things: gives every new page a prompt crawl path, and it is the single most useful thing for a student arriving mid-semester.
- Internal links to `?page=2` style pagination should carry canonicals pointing at page 1. Cheapest to simply not paginate in v1.

---

## 4. GEO and AEO

### 4.1 Definitions, stated precisely

- **AEO (Answer Engine Optimization)** — being *the answer*, or the source of the answer, rather than being one link among ten. Optimising for extraction into a single generated response.
- **GEO (Generative Engine Optimization)** — being *cited* by generative engines: ChatGPT Search, Perplexity, Gemini, Google AI Overviews, Claude.

They overlap heavily and the industry vocabulary around them is largely marketing. The measurable part is citation.

### 4.2 AI crawlers are not search crawlers, and they are three, not one

The single most useful thing I found in this research is that the major providers each run **three distinct bots with three distinct purposes**, and the difference decides whether you are indexed for search or excluded from training.

**OpenAI** ([platform.openai.com/docs/bots](https://platform.openai.com/docs/bots), verified verbatim):

| Bot | Purpose | Effect of blocking |
|---|---|---|
| `OAI-SearchBot` | Surfaces sites in ChatGPT search results | **Will not appear in ChatGPT search answers** (may still appear as a navigational link) |
| `GPTBot` | Training data | Content excluded from foundation model training |
| `ChatGPT-User` | User-initiated fetches in chat | Not automatic crawling; *"Because these actions are initiated by a user, robots.txt rules may not apply"* |

OpenAI also states the two settings are independent — you can allow `OAI-SearchBot` and disallow `GPTBot` — and that there is a **~24 hour propagation delay** after a robots.txt change.

**Anthropic** ([support.claude.com, article 8896518](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), verified verbatim):

| Bot | Purpose |
|---|---|
| `ClaudeBot` | Training |
| `Claude-User` | User-directed retrieval — *"Disabling Claude-User… prevents our system from retrieving your content in response to a user query, which may reduce your site's visibility for user-directed web search"* |
| `Claude-SearchBot` | Search index — *"prevents our system from indexing your content for search optimization"* |

Anthropic confirms robots.txt is honoured and publishes verified source IPs at `https://claude.com/crawling/bots.json`.

**The strategic implication is precise and non-obvious:** for a business whose growth depends on students finding it, **block the training bots, allow the search bots.** There is no benefit to you from being in a training corpus — the training bot brings you zero traffic and costs you bandwidth. `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Google-Extended` and `Bingbot` are your audience. `GPTBot` and `ClaudeBot` are not. This is a decision most sites get backwards by blanket-allowing or blanket-blocking.

### 4.3 The current state of pay versus block

**[CONVENTION / partially verified]** The loudest blog consensus in 2026 is "block the AI crawlers." That consensus is not well-founded for a traffic-dependent business. What the primary sources actually say:

- Blocking a search bot has a **directly stated, named cost**: you do not appear in ChatGPT search answers (OpenAI) or Claude search (Anthropic). They say this in plain words.
- Blocking a training bot has **no stated traffic cost** at all, by either provider's own documentation.
- The "pay to crawl" model (licensing content to AI vendors) exists and is real, but **[UNVERIFIED]** I found no primary documentation from either OpenAI or Anthropic in this session describing a self-serve licensing or payment mechanism for a site this small. Treat "we will pay for content" as folklore for anyone below enterprise scale.

**Recommendation for TiCLearn, and the reasons:**

```
# AI answer engines — allow, these are your audience
User-agent: OAI-SearchBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

# Training — block, this is bandwidth you donate for nothing
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
```

Plus, and this is the part that will be missed otherwise: **`proxy.ts:11-14` must allowlist the AI bots.** Arcjet's `detectBot` currently permits only `CATEGORY:SEARCH_ENGINE`, `CATEGORY:MONITOR`, `CATEGORY:VERCEL`. **[UNVERIFIED]** whether Arcjet classifies `OAI-SearchBot` and `Claude-SearchBot` as `CATEGORY:SEARCH_ENGINE` — I did not check the Arcjet category definitions in `node_modules/@arcjet/next` this session. If it does not, those crawlers get bot-challenged instead of served, and your robots.txt rules never even come into play. **Verify this before assuming any of the above works.**

### 4.4 Citation likelihood: what actually gets cited

**Primary source: Aggarwal et al., "GEO: Generative Engine Optimization"**, [arXiv:2311.09735](https://arxiv.org/abs/2311.09735). This is the peer-track preprint that the entire GEO industry cites. Verified figures, read from the full PDF:

- GEO can boost source visibility **by up to 40%** in generative engine responses.
- Demonstrated on **Perplexity.ai** as a real-world engine, with visibility improvements **up to 37%**.
- Top-performing methods — **Cite Sources, Quotation Addition, Statistics Addition** — achieved **30–40% relative improvement** on the Position-Adjusted Word Count metric and **15–30%** on Subjective Impression.

**The two debunkings in the same paper are the most important content in this document:**

1. **Keyword stuffing: "little to no improvement."** The paper is explicit: *"simple methods like Keyword Stuffing traditionally used in SEO do not perform well."* This is the single clearest piece of evidence that classic SEO folklore and GEO are different disciplines.
2. **"Authoritative" tone: no significant improvement.** The paper tested making content more persuasive and authoritative, and found *"no significant improvement, demonstrating that Generative Engines are already somewhat robust to such changes."*

**And the domain-specific finding, which is the actionable one:** the methods that work differ by domain. Cite Sources performs best on Statement, Facts, and Law & Gov queries. Quotation Addition performs best on People & Society, Explanation, and History. Statistics Addition performs best on Law & Gov, Debate, and Opinion.

**What this means for a university study site, concretely:**

- *"What courses are in UB Computer Science?"* — a **Facts** query. This is where **Cite Sources** wins. Publish it, sourced. Name the handbook, the department, the year. Cite the UB faculty page, the handbook PDF, the department's own page. **This is exactly where a small site beats an aggregator: you can go and read the UB CS department page and cite it accurately, and you can do it in a week.**
- *"How does the marking work for this paper?"* — an **Explanation** query. This is where **Quotation Addition** wins. Quote the examiner's instructions verbatim, quote the rubric, quote the lecturer from the course handout. **Nobody else can do this, because nobody else has the document.**
- *"What tends to come up in this course?"* — a **Debate/Opinion** query. **Statistics Addition** territory. "Across 40 archived UB CS papers, 31% of marks fall in [topic]." **This is our first-hand asset and it is the strongest GEO play available to us.**

Also note from the paper: the best *combination* was Fluency Optimization + Statistics Addition, outperforming any single strategy by more than 5.5%.

**[UNVERIFIED]** The survey article *"A Critical Survey of Generative Engine Optimization (2023–2026)"* at `arxiv.org/html/2607.14035v1` appeared in search results but I did not read it. It may contain newer effect sizes. I am not citing its numbers.

**[UNVERIFIED]** Numerous vendor content-marketing statistics pages appeared in search (Semrush/Similarweb/Peec/Yotpo/Profound/OmniBound claim "60–70+ data points"). I did not read or rely on them. Vendor GEO statistics are self-interested and largely unattributed. The Princeton preprint is the only citation in this section that I have verified by reading the primary text.

### 4.5 Making passages quotable

The mechanics of extraction, which follow from how retrieval-augmented generation actually works:

- **Answers are assembled from chunks.** Systems retrieve passages, then generate. A paragraph that answers a question completely and independently is retrievable. A paragraph that requires the four paragraphs before it to make sense is not.
- **Therefore: one question, one paragraph, one page.** Do not make students hunt. A page whose URL is `/guides/ub-computer-science-marking-scheme` should have a self-contained answer to *"how is UB Computer Science marked?"* in its first 150 words, before any preamble.
- **Prefer definitions to narratives.** "Marks are allocated as follows:" beats "Throughout our experience of the department, it has become clear that…". The Princeton paper's own examples are definitional and numeric.
- **Tables and lists extract cleanly; prose does not.** A table of "question type → mark allocation → how it is marked" is retrievable in a way a paragraph is not.
- **Answer the question the way a student would phrase it**, including the local vocabulary. Cameroonian students say "Buea" not "University of Buea" in the query even though the university's name is "University of Buea." Both must appear.

### 4.6 Entity and brand building

This is under-appreciated and cheap.

- **You do not have a known entity.** `"TiCLearn"` will not resolve to anything. When a student asks ChatGPT "what app should I use to revise for UB past questions," there is currently nothing about TiCLearn in any model's world to retrieve. **This is the single largest GEO deficit and it is not fixable by content alone.**
- **Structured data is an AI aid here, not a SERP play.** `Organization` with a valid logo, correct `sameAs` set, `areaServed`, and consistent NAP details across every surface gives an extraction system a clean entity record to resolve against. This is a better use of `OrganizationSchema` than any rich result would have been.
- **`sameAs` is the mechanism.** Every claim you can anchor to an external profile — LinkedIn, X, Facebook, the TIC Foundation page, App Store and Play listings, a YouTube channel, the university department's own page if they will link you — is an entity corroboration signal. `components/seo/OrganizationSchema.tsx:10` has **one**. Target eight or ten.
- **Own the phrase.** "TiC" is used in `app/layout.tsx:19` ("chat with TiC our ai tutor"). A two-syllable coined name with an apostrophe is very hard to disambiguate in an answer engine, and `ticsummit.org` also exists as your domain, competing with "TiC Foundation" as your org. **Pick one primary entity name and use it identically everywhere** before you invest in GEO.

### 4.7 The role of original data and first-hand experience

Your competitors publish recycled PDFs. Verified across all eight in §8: not one has original analysis, first-hand commentary, or structured metadata. eStudyUniverse republishes past papers. cameroongcerevision.com has one post per paper per year per subject. Kamerpower publishes announcements and event dates.

**The only lever that works, and it is a large one, is having material nobody else has.** Per the Princeton paper's *Statistics Addition* finding, added statistics are among the top three methods. And unlike keyword stuffing or authoritative tone, you cannot fake this. Concretely, your defensible original assets are:

1. **Frequency analysis.** Across N archived papers for a course, which topics carry what share of marks, and how that has shifted year over year. Nobody has this. It requires only papers you already have.
2. **Command-word distributions.** "Define" is not "Calculate" is not "Explain". The distribution tells a student how to spend their revision hour, which is the actual thing they are searching for.
3. **Marking-scheme and rubric documentation.** What does "explain" get credit for in this department? Quoted from real rubrics, referenced to a specific paper and year.
4. **The thing nobody can do: an answer to "what actually came up, in this exact course, in this exact department, in the semester you are in."** That is a Facts query with a Cite Sources solution, and it is precisely the query NdeTek and Studocu structurally cannot serve because their data is unlabelled by department and semester.

**This is the answer to "no public university past paper archive exists."** You do not need one. You need 200 papers for 20 courses, well-labelled, and you need to publish the *analysis*. The analysis is indexable, citable, and ungameable. The photocopies are not.

### 4.8 What works versus folklore

**Works (evidence-backed):**
- Publishing statistics, numbers, and frequencies. (Princeton, 30–40% relative.)
- Citing sources explicitly and attributing claims.
- Quoting primary documents verbatim.
- Clear, self-contained, definition-led passages.
- Original data nobody else has.
- Clean entity definitions and structured data.
- Being crawlable by the search-class AI bots.

**Does not work (measured and found wanting):**
- Keyword stuffing — *"little to no improvement"* (Princeton).
- A more authoritative, persuasive tone — *"no significant improvement"* (Princeton).
- Schema.org markup for ranking — Google: *"structured data is not a ranking factor."*
- FAQ rich results — removed from Google entirely (verified redirect).
- Trust signals, author bios, E-E-A-T ceremony as a *direct* citation lever — **[UNVERIFIED]**, I found no primary evidence for this. It is plausible, it is widely asserted, and I am not endorsing it without a source.
- Paying to be crawled, for an operation this size — **[UNVERIFIED]**, no primary documentation found.

**The uncomfortable one:** most of this is not "SEO". It is *being a good publisher with original data*. The Princeton paper's own framing is that the effective methods require "minimal changes but significantly improve visibility." The hard part was always the data, and it still is.

---

## 5. The meta problem: metadata quality and sharing

### 5.1 Title and description patterns for this audience

**[CONVENTION]** No tool measures CTR against a Cameroonian audience. The following is reasoned from the SERP evidence in §2, not from measured data — but it is grounded in what is actually ranking and what the titles on those pages look like.

What the winners do:

| Page | Title | Pattern |
|---|---|---|
| cameroonpastquestions.com | "Cameroon Past Questions - Access Past GCE & University Papers" | Institution-free, topic-first, covers both GCE and University |
| eStudyUniverse | "eStudyUniverse \| GCE Past Questions, Concours, Student App" | Brand + the three product categories |
| Kamerpower | "Exam Revision Courses, Career, Concours, Scholarships — Kamerpower" | Category list, brand last |
| papers.ndetek.com | "Faculty of Science - FS - University of Bamenda \| Departments & Past Papers" | **Entity chain, then intent** |

The NdeTek pattern is the one to copy, and it is the only one that is doing real SEO work: it puts the **full institutional entity chain in the title**. For your market that is: *University → Faculty → Department → Course*. "Computer Science - University of Buea" beats "CS Practice" every time, because the second one matches nothing a student types.

**Rules for this audience:**

1. **Lead with the entity chain, not the brand.** Students search institutions and courses, not products. The brand suffix is optional and should go last.
2. **Use the local name the way students write it.** "Buea" and "Bamenda" in the title. "University of Buea" in the H1 and body for entity recognition. Both.
3. **Title budget: roughly 50–60 characters before truncation on a low-DPI Android in a narrow viewport.** Measure at the rendered pixel width, not the character count. Current `app/(marketing)/layout.tsx:6` is 63 characters and already truncates.
4. **Put the year in the title when it is a time-bound paper.** "June 2025" in a title is a freshness signal and a filter students use.
5. **Description: 140–160 characters, lead with the specific thing, end with the action.** Not a brand statement.
6. **Never ship a description that is wrong.** Six of seven public pages currently ship a GCE A-Level description to a university audience (§1.2). That is a worse outcome than shipping no description at all.

### 5.2 Per-page templating versus per-page authoring

**Both, at different layers, and the current code has neither.**

- **Template the invariant, author the variable.** A `buildMetadata({ title, description, canonical, ogImage, breadcrumbs })` helper called from every page is the right pattern. It guarantees canonicals are never forgotten and makes the catalogue scale. You have no such helper — that is the root cause of §1.2.
- **Author titles by hand for anything with search volume.** A template cannot know that "FET Buea" beats "Faculty of Engineering and Technology". A `generateMetadata` per route that composes from DB fields (department name, course code, year) gets you most of the way, and a human overrides the top 50 pages.
- **Never let a `title` string in a nested layout silently replace the parent's.** Use `title: { absolute: "..." }` for the rare page that needs to opt out of the template, or `title: { default: "...", template: "%s | TiCLearn" }` at the root. The bug in §1.2 is a direct consequence of not having a template.

### 5.3 Open Graph and Twitter images sized for WhatsApp

**[CONVENTION]** I attempted to scrape Facebook's Sharing Debugger documentation at `developers.facebook.com/docs/sharing/webmasters/implement` and it returned no usable content this session. The following is the widely-repeated community standard and should be treated as convention, not vendor citation.

- **1200 × 630 px (1.91:1)** is the de facto OG image size. It is the aspect ratio WhatsApp, Facebook, LinkedIn and Telegram render without letterboxing or cropping.
- Your current images are **1920 × 1080 (16:9)** — verified via `file`. 16:9 and 1.91:1 differ. WhatsApp will crop or letterbox. **Regenerate at 1200 × 630.**
- Under roughly 300 KB, and **PNG or JPEG, not WebP** — some older WhatsApp Android builds do not render WebP previews. **[CONVENTION]**, unverified.
- **Keep all text inside a central safe area.** WhatsApp crops to a square-ish thumbnail in some surfaces. Rule of thumb: nothing critical in the outer 15%.
- **Serve OG images from an absolute URL.** `metadataBase` at `app/layout.tsx:16` handles this correctly.
- **Always emit `og:url`.** Verified absent today (§1.3). WhatsApp and Facebook key their link cache on it.

**Twitter card:** `summary_large_image` at `app/layout.tsx:66` is correct and should stay. It requires an image over roughly 300 × 157. Yours qualifies. **But `twitter:image` alone does nothing for WhatsApp** — see §1.3.

### 5.4 Social image generation strategy

Next.js has a first-class convention for this: `opengraph-image.tsx` (or `.png`/`.jpg`) *in a route segment*, which generates a per-route OG image at build or request time. You have the *root-level* file convention (`app/opengraph-image.png`) which produces one image for the whole site — and per §1.3, it is not even being emitted, because the explicit `openGraph` objects override it.

The strategy:

| Surface | Card |
|---|---|
| Marketing / pricing / about | Static, hand-designed, brand-level. 1200×630. |
| **Course / paper page** | **Generated per course.** Course code + title + faculty + year + a mark-allocation summary. This is the highest-volume card and the one that travels. |
| **Result share page** | **Generated per result.** Score, grade, paper name. This is the card people *choose* to send. |
| Guide / article | Per article, with the title and faculty. |

**Generation, not hand-design.** `@vercel/og` / `next/og` renders JSX to PNG via Satori. Cost per image is a few hundred ms of edge CPU and a few KB. Doing it by hand at 500 cards is impossible; doing it programmatically at 50,000 is a solved problem.

**The constraint in your current config:** `next.config.ts` has no `images` block at all. Remote `next/image` domains are unconfigured. If generated OG images reference anything remote (a user avatar on the result card), you need `images.remotePatterns` with a tight allowlist — **and note the security angle: an open remote-pattern allowlist on a route that renders user-supplied avatars is an SSRF-adjacent risk.** Keep the result card's avatar out of the generated image, or proxy it through your own UploadThing domain.

`html2canvas` is already a dependency (used for the existing result-card sharing at `app/(dashboard)/practice/exam/result/[attemptId]/page.tsx`) — that is a *client-side rasterisation of your own page*, which is fine for producing a file the user downloads, and completely wrong for the OG image, which must be a server-rendered URL a crawler can fetch without executing JavaScript.

### 5.5 How much content should be visible before the click

This is the honest answer: **on WhatsApp, almost none — and on Google, a great deal.** They are different surfaces with different constraints.

- **WhatsApp preview:** title + description + image. Roughly 60 characters of title and 1–2 lines of description before truncation, plus the card. You cannot control the "expand" behaviour. So the card image must carry the information that does not fit in text. **That is the argument for a per-course generated card rather than a generic brand card:** the image is the only place to say "UB Computer Science · CS 302 · June 2025 · 40 marks · 4 sections" when the text says "Computer Science - University of Buea".
- **Google SERP:** title, URL, and description are the entire preview. Google's snippets are generated from the page content and will pull the passage that best matches the query — not necessarily your meta description. **Write the first paragraph of every page as if it were the snippet**, because it probably will be. This is also the §4.5 quotability rule, and the two requirements are the same requirement.

### 5.6 Per result or per course?

**Both, for different reasons — but they are different cards with different jobs.**

- **Per course** is the SEO card. It lives on an indexable page, it represents a durable entity, and it should be cached aggressively (build-time or long-ISR). This is 90% of your traffic if the strategy works.
- **Per result** is the viral card. It is user-generated, high-frequency, ephemeral, and it is what actually circulates in WhatsApp groups. It should be generated on demand, cached by `shareId`, and **never** served into the sitemap.

Generating a card per attempt is affordable: attempts are bounded by your user base, and the cache key is stable. **Recommendation: per-course for the catalogue, per-result for the share page, and do not try to unify them.** They have different lifetimes, different cache policies, and different audiences.

---

## 6. Rendering strategy

### 6.1 The measured baseline

From §1.15: the marketing landing page ships **~340 KB of compressed JS/CSS** and **12.8 KB of brotli HTML**, with 19 chunks. `app/(marketing)/page.tsx` is a Server Component, but `components/marketing/landing-hero.tsx:1` is `"use client"` and is 446 lines — it owns essentially the entire above-the-fold experience, and it fetches its catalogue data client-side at `landing-hero.tsx:169,173` from `/api/public/p1p2-mock-modules` and `/api/public/gce-blueprints`.

**That means the landing page's primary content is: blank HTML → 340 KB of JS → API round trip → content appears.** That is three sequential dependencies before a student sees what the product does. On the connection profile you described, this is the worst possible shape.

### 6.2 Next.js 16 caching: what is actually enabled

You are **not** using the Next 16 cache model. `next.config.ts:3-8` does not set `cacheComponents: true`. Per [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components) (verified): Cache Components is opt-in, and when enabled Next.js prerenders as much of a route as it can into HTML *and* an RSC payload — a static shell — with dynamic regions filled at request time behind Suspense.

Without it, you are on the [previous model](https://nextjs.org/docs/app/getting-started/cache-components) — the App Router's implicit static/dynamic determination based on `fetch`, `headers()`, `cookies()`, and `revalidate` exports.

**What you use today:** only two route handlers with `export const revalidate = 120` (`app/api/public/gce-blueprints/route.ts:5`, `app/api/public/p1p2-mock-modules/route.ts:5`). Everything else is either fully prerendered (ten routes, per `prerender-manifest.json`) or fully dynamic. Verified: **zero occurrences of `use cache`, `cacheLife`, `cacheTag`, or `revalidatePath`/`revalidateTag` in `app/`, `lib/`, or `components/`.**

### 6.3 Recommendation per route

| Route | Strategy | Why |
|---|---|---|
| `/` landing | **Static shell + server-rendered catalogue + Suspense for session** | Currently `landing-hero.tsx` client-fetches. Move the blueprint fetch to a Server Component with `'use cache'` + `cacheLife('hours')`. Prerender. A student on 4G must see the headline and the course list in the first HTML, not after 340 KB of JS. |
| `/pricing` | **Fully static** | No data dependency beyond the session check, which is progressive enhancement. Split the client subscribe handler into a child island; the plans table becomes static HTML. Currently `"use client"` at `pricing/page.tsx:1`, which is why it cannot even have metadata (§1.2). |
| `/about`, `/contact`, `/privacy`, `/terms` | **Fully static** | Already prerendered. Only need correct metadata. `/contact` is `"use client"` only because of the form — make the form an island. |
| `/faq` | **Fully static**, accordion as a small island | 20 answers in `FAQ_ITEMS`. Static HTML is both faster and indexable; a client-only accordion hides the answer text from the initial payload. |
| **Course / faculty catalogue** | **`'use cache'` + `cacheLife` + `cacheTag`, plus `generateStaticParams` for the top N** | See §6.4. This is the main event. |
| **Blog / guides** | **Static (`generateStaticParams`) + on-demand `revalidateTag`** | Guides change rarely. Build-time is correct. Tag them so a publish can invalidate without a redeploy. |
| `/result/[shareId]` | **Dynamic, with a tight cache** | Public, user-generated, bounded set. Dynamic render is correct; add a short `cacheLife` so a viral share does not hammer Postgres. **Add `generateMetadata` — §1.10.** |
| Authed dashboard | **Dynamic, streamed, never blocking** | Every DB query is per-user. There is no static option and there should not be. **Add `loading.tsx`.** |
| Chat | **Client-rendered shell, streamed tokens** | The messages are inherently dynamic and the transport is already streaming. See §6.6 and §7.5. |
| Exam runner | **Client-rendered, single route, prefetch everything** | Exam integrity is the priority; latency of navigation mid-exam is unacceptable. See §6.7. |
| Result review | **Dynamic, streamed** | The AI grading takes time (`ProcessingStatus` polling every 5s per `AGENTS.md`). Stream the deterministic parts, poll only the AI part. |

### 6.4 Getting the catalogue prerendered without rebuilding on every content change

This is the core technical question and it has three viable answers.

**Option A — `generateStaticParams` with `dynamicParams = true` (recommended default).**

Prerender the top N (say 500: the two universities, their faculties, departments, and the highest-traffic courses) at build. Everything else renders on first request and is cached by `use cache` + `cacheLife('days')`. `dynamicParams = true` means new content never requires a rebuild; it just gets a cold first render. **Downside:** a cold first render on a slow server is a slow first impression, and it happens exactly once per URL — which is fine, because after that it is cached.

**Option B — `'use cache'` + `cacheLife` + `cacheTag` (recommended for the long tail).**

Per the docs: `use cache` caches the return value of async functions *and* components; `cacheLife` sets the freshness profile; `cacheTag` gives you an invalidation key. Combined with `cacheComponents: true`, this produces a prerendered shell with cached shared content — Vercel's own framing: *"a prerendered shell, cached shared content, and request-time content"* ([Vercel Academy: Cache Components](https://vercel.com/academy/nextjs-foundations/cache-components)).

**On-demand revalidation is the answer to "without rebuilding."** When an admin publishes a guide or a course is added, call `revalidateTag('courses', 'max')` from the admin route handler. No deploy, no rebuild, seconds not minutes. Verify the exact signature and the `updateTag` vs `revalidateTag` distinction against `node_modules/next/dist/docs/` per `AGENTS.md` before implementing.

**Option C — prerender everything.** Do not. A university catalogue will exceed what a single build should try to render, and every content change becomes a deploy.

**Recommendation: A + B together.** `generateStaticParams` for the top of the catalogue, `use cache` + `cacheTag` for everything below the fold of importance, `revalidateTag` on publish. Note that `cacheComponents: true` is a global switch with broad effects — read the guide before enabling it on an app this size, and be aware that `connection()` opts an entire route into dynamic rendering ([verified](https://vercel.com/academy/nextjs-foundations/cache-components)).

### 6.5 Byte and server-load cost by strategy

Approximate, and worth stating plainly:

| Strategy | Bytes to first paint | Server cost per request | Use when |
|---|---|---|---|
| **SSG** | lowest — HTML from CDN edge | ~zero | Content never changes: legal, about, pricing |
| **ISR** | lowest after first hit | ~zero while fresh; one origin render on miss | Catalogue, guides — the bulk of your public pages |
| **SSR** | medium — HTML + all its data inline | full origin render, every request | Per-user content, share pages |
| **Client render** | **highest** — HTML shell, then JS, then an API round trip | highest — you pay for the render *and* the API *and* the hydration | Only genuinely interactive surfaces |
| **Streaming SSR** | lowest perceived — first bytes early, rest progressive | same as SSR, slightly more overhead | Authed dashboards |

The current landing page is doing the worst row. `landing-hero.tsx` is client-render, which means you pay the full origin render for a shell, then 340 KB of JS, then the API — three costs for one page.

### 6.6 Which routes must never block the first paint

**All of them must stream. But the priority order is:**

1. **`/` landing.** A student arriving from a Google result on a 4G phone with a 2.5-second LCP budget has one job: see what this is. Nothing about the hero, the value proposition, or the course list may wait on JavaScript. **This is the route that determines whether your rankings convert.**
2. **Catalogue pages.** Same reason. The entity chain, the paper metadata, the mark breakdown — all static, all in the initial HTML.
3. **Authed dashboard.** The layout at `app/(dashboard)/layout.tsx:15-27` does a session lookup *and* a Prisma query with a nested relation before rendering anything. That is two sequential database round trips blocking the first paint on every single dashboard page. Wrap the data-dependent part in Suspense and render the chrome immediately. The sidebar and header do not depend on the second query.
4. **Chat.** Same problem in `app/chat/layout.tsx:16-24`, identical shape.
5. **Exam runner.** Different reasoning — see §6.7.
6. **Result review.** The paper identity, the score, the grade are all deterministic and fast. Only the AI-generated feedback is slow. **Stream the deterministic parts and poll only the AI part.** Today it polls the whole page every 5s per `AGENTS.md`.

### 6.7 The exam runner is a different problem

`app/(dashboard)/practice/exam/[mockId]/page.tsx` is a client component. Do not "optimise" it with streaming. During an exam:

- **Every navigation must be instant or it reads as a lost answer.** Full prefetch of the next question and next section.
- **No loading state that implies the exam is still running.** A skeleton over a question is dangerous — a student who taps next and sees a skeleton may tap again.
- **Persist answers locally on every keystroke**, not on submit. This is a correctness requirement, not a performance one, and it is the cheapest insurance you can buy against a dropped connection in Buea.
- **Fullscreen enforcement** (per `AGENTS.md`, `requestFullscreen()` from the user gesture) is unaffected by rendering strategy, but any render strategy that delays the exam start screen past the user's gesture will break it. Keep the start click and the fullscreen request in the same handler.

### 6.8 A note on the authed surfaces and SEO

Authed surfaces should be `noindex` via meta tag and **crawlable** — see §3.3. Today they are blocked in robots.txt (`app/robots.ts:8-23`) *and* globally marked `index, follow` (`app/layout.tsx:71-74`). Pick one. Given that you are about to add public catalogue routes under new path prefixes, having an explicit, centralised `noindex` policy driven by route group is safer than a path-prefix blocklist — because a blocklist can only ever be wrong about routes you have not thought of yet.

---

## 7. Loading states and perceived speed

### 7.1 The current state

Verified facts:
- **No `loading.tsx` anywhere in `app/`.** `find app -name "loading.tsx"` returns nothing.
- One `Suspense` on the entire site, at `app/layout.tsx:94`, wrapping everything with **no fallback**.
- 68 occurrences of `Skeleton` across `app/` and `components/` — used inside client components, but not at any route boundary.
- Three more `Suspense` boundaries on auth pages only (`app/(auth)/sign-up/page.tsx:306`, `app/(auth)/verify-email/page.tsx:331`, `app/(admin)/admin/accept-invite/page.tsx:177`).

**The practical consequence:** there are no route-level streaming boundaries. Any layout that awaits — and both `app/(dashboard)/layout.tsx:15-27` and `app/chat/layout.tsx:16-24` do — **blocks the entire page, including navigation chrome, until the database answers.** The student sees a white screen. Not a spinner, not a skeleton. Nothing. On the connection profile you described, for one to three seconds, on every navigation.

### 7.2 Core Web Vitals thresholds

From [web.dev/articles/vitals](https://web.dev/articles/vitals) (verified verbatim):

- **LCP ≤ 2.5 seconds** — loading performance.
- **INP ≤ 200 milliseconds** — interactivity.
- **CLS ≤ 0.1** — visual stability.
- Measure at the **75th percentile**, segmented mobile and desktop.

Now apply the constraints honestly. Data at $1.63/GB on a congested 4G link, low-end Android, and a measured 2.5-second-plus asset payload on a *desktop-class* connection:

- **LCP is the binding constraint and it is not close.** The landing page currently has to deliver 340 KB of JS before content appears. On a good connection that is survivable. On the connection you described it is not. **Cutting the marketing bundle by half is the single highest-value performance change available, and it is also the highest-value SEO change**, because the same asset weight is what makes Google see a slow site and what makes a 4G student bail.
- **INP at 200 ms is brutal on this hardware.** This is where the `reactCompiler: true` at `next.config.ts:5` earns its keep, and where reducing hydrated component count matters more than any framework trick. **149 client components** is a lot of hydration for a low-end Android.
- **CLS.** The raw `<img>` at `app/result/[shareId]/page.tsx:103-108` with no dimensions is a live CLS source. Skeletons that have different dimensions from the content that replaces them are the other common source — which is the argument for skeletons that mirror real layout.

### 7.3 Nielsen Norman's rules, verified

From [Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/) and [Response Times 3](https://www.nngroup.com/articles/response-times-3-important-limits/) (verified verbatim):

**Response-time thresholds:**
- **0.1 s** — the limit for feeling instantaneous; no feedback needed.
- **1.0 s** — the limit for uninterrupted flow of thought; the user notices but does not need feedback.
- **10 s** — the limit for keeping attention; beyond it, users switch tasks.

**Skeleton-specific guidance:**
- **Skeleton screens are for full-page loads only**, not for a single module. For a single module (a card, a video), use a spinner.
- **Skeletons for waits under 10 seconds; progress bars for anything over 10 seconds** — and over 10 seconds you must give an explicit duration estimate.
- **If a page loads in under 1 second, show no skeleton and no spinner at all** — *"the quick flashing page can cause users to feel like they can't keep up."*
- **Never use a skeleton for a process indicator.** NN/g is explicit: *"Whenever some other process (e.g., download, upload, convert a file) is involved, it does not make sense (and could even be confusing) to show a skeleton screen. Instead, show a progress bar or a wizard."*
- **Never use a frame-only skeleton** — header/footer with empty content area — because *"if users are forced to wait for too long, they will assume the page isn't working."*

### 7.4 Skeletons versus spinners, applied to this app

| Surface | Correct indicator | Why |
|---|---|---|
| Route navigation (dashboard, catalogue) | **Skeleton** matching real layout | Full-page load, expected under 10 s |
| Dashboard sidebar / header data | **None** — render shell, fill content | The chrome does not depend on the query |
| Chat message send | **None** — optimistic render | Sub-100 ms to first token; the user should see their own message instantly |
| AI generating a long answer | **Neither skeleton nor spinner** | See §7.5 |
| Note upload | **Progress bar with a percentage** | Process indicator. NN/g forbids skeletons here. You have a real upload to track. |
| PDF/text extraction (`ProcessingStatus`) | **Progress bar with an estimate** | Process, variable duration, likely over 10 s |
| Exam question navigation | **None** | See §6.7 |
| Pricing plan data | **None** — render both plans, disable the button | The plans are static; the subscription check is progressive enhancement |
| Public catalogue pages | **None at all** | They should be prerendered. A skeleton on a prerendered page is a bug. |

### 7.5 The AI response rule

The brief is right that this needs calling out, and NN/g backs the reasoning without being specific about AI.

**A skeleton is a promise that content shaped a certain way is coming.** When a skeleton is replaced by something of a different shape, the user re-reads. When a skeleton is replaced by a *streaming paragraph*, the user watches a skeleton disappear and then has to start reading at the top of a text block that is still growing. The skeleton did not represent the content. It was a lie about the shape of what was coming, and the lie costs more than the spinner would have.

**The correct pattern for an AI answer:**
1. **Render the user's message instantly, optimistically.** Under NN/g's 0.1 s threshold this needs no indicator at all.
2. **Show a single "thinking" affordance within the message bubble** — three dots, or a one-line shimmer *in the position where the first token will land*. This is honest: it occupies the correct slot and it is replaced by the correct thing.
3. **Stream the answer in and grow the bubble.** Do not reserve full height. Do not skeleton.
4. **If the model is slow enough to cross 10 seconds, switch to a progress line with an estimate.** Not a spinner, not a skeleton — a sentence that says what is happening and roughly how long.

You already have the streaming transport (`components/ai-elements/message.tsx` uses `Streamdown`, `app/chat/page.tsx` renders `ChatLanding`). The work is in the *empty state*, not the streaming.

### 7.6 Out-of-order streaming

Because there is currently not a single route-level Suspense boundary, out-of-order streaming is not being used at all — and on the dashboard, the layout blocks everything, so the ordering is strictly bad.

The right structure for `app/(dashboard)/layout.tsx`:

```
render: <Sidebar/> <Header/>          ← no DB, ships in the shell
  <Suspense fallback={<ContentSkeleton/>}>
    <OnboardingBanner/>               ← needs session
    {children}                        ← needs session
  </Suspense>
```

The sidebar and header paint immediately from the static shell; the session-dependent region streams. This is precisely what Cache Components calls the *static shell* plus *request-time regions*, and it is what makes INP survivable, because the clickable chrome is interactive before the data arrives.

**Do not put the session check in the layout at all if you can avoid it.** `app/(dashboard)/layout.tsx:15-27` fetches the user to decide whether to redirect to `/onboarding`. That is a routing concern, and routing concerns belong at the edge — in `proxy.ts`, which already reads the session at `proxy.ts:56`. Moving the onboarding redirect into `proxy.ts` removes two sequential database round trips from every dashboard page's critical path.

### 7.7 Progressive disclosure above the fold

- **The landing page shows the hero and the course list, nothing else.** The FAQ, the pricing table, and the footer of explanation are below the fold and should not be in the initial bundle.
- **`app/(marketing)/page.tsx:38-54`** currently renders the WhatsApp section directly under the hero. On a small phone viewport that may be above the fold. Move it.
- **The course catalogue is the content.** `landing-hero.tsx:169,173` fetches it client-side and renders `Skeleton` (`landing-hero.tsx:11`) while waiting. **Move that fetch to the server, prerender it, and delete the skeleton.** It is not a loading state, it is a server round trip that should not be on the critical path.

### 7.8 Prefetching

Verified: `app/(marketing)/page.tsx` uses `next/link` throughout (`:26, :32, :44`), which means Next's default prefetch-on-viewport is active. That is the right default and costs nothing for links below the fold.

Two refinements worth making:
- **On the exam runner, prefetch aggressively and explicitly.** Navigation latency mid-exam is unacceptable (§6.7). `prefetch={true}` on exam-internal links, not the default viewport heuristic.
- **Do not prefetch the catalogue fetch.** `landing-hero.tsx:165-198` fetches on mount, not on link. Correct as is.

### 7.9 Concrete rules

Not principles. Rules.

1. **Every route that awaits a database call gets a `loading.tsx` or a Suspense boundary with a real fallback.** Today: zero routes do this. This is rule zero.
2. **A skeleton must mirror the real layout's dimensions.** If it does not, it is creating CLS and it is lying.
3. **No skeleton and no spinner for any wait under 1 second.** Render nothing.
4. **No spinner for a full-page load. No skeleton for a single module.** NN/g's rule, in both directions.
5. **No skeleton for any process.** Upload, extraction, AI generation get a progress bar with an estimate.
6. **A skeleton that crosses 10 seconds becomes a progress bar with a duration estimate.**
7. **The user's own action renders instantly and optimistically.** Message sent, answer selected, answer submitted. Never wait for a round trip to show the user what they just did.
8. **AI output streams into a bubble that grows. Never into a skeleton.**
9. **Navigation chrome never waits on page data.** Session checks go in `proxy.ts`; Suspense wraps the data region, not the shell.
10. **Prerendered pages get no loading state.** If a public page shows a spinner, the caching strategy is wrong — fix that instead.
11. **Target LCP ≤ 2.5 s at p75 mobile.** Cut the marketing JS bundle. Measure it. The number is currently roughly 340 KB and it should be a fraction of that.
12. **Every `<img>` gets explicit `width` and `height`.** `app/result/[shareId]/page.tsx:103-108` is a live CLS bug.
13. **Optimise INP, not just LCP.** 200 ms on a low-end Android is won by shipping less JavaScript and hydrating less, not by micro-optimising event handlers.

---

## 8. Competitor SEO teardown

All eight scraped and inspected this session. Raw outputs in `.firecrawl/`.

### 8.1 cameroonpastquestions.com — the number-one competitor, and it is nearly undefended

**This is the most important teardown in the document, because it proves the market is winnable.**

- **Title:** "Cameroon Past Questions - Access Past GCE & University Papers"
- **Meta description:** "Access a vast library of past questions from GCE, University of Buea, University of Bamenda, and more. Cameroon Past Questions is your key to academic success."
- **Platform:** Next.js App Router — the same stack as ours.
- **robots.txt: HTTP 404.** Verified by direct fetch. They do not have one.
- **sitemap.xml: HTTP 404.** Verified. The 404 page returns `<meta name="robots" content="noindex"/>`, which is correct behaviour for a 404 but means the URL is not a sitemap.
- **Canonical: none.** No `<link rel="canonical">` in the document.
- **JSON-LD: zero.**
- **Internal linking: essentially none.** Every link on the homepage is either an in-page anchor (`/#exams`, `/#faq`, `/#pricing`) or a utility page (`/login`, `/register`, `/privacy`, `/terms`). No course pages. No paper pages. No blog. The entire site is one URL.
- **Content depth:** one page. H2s: "Unlock Your Academic Success in Cameroon", "Comprehensive Exam Coverage", "Frequently Asked Questions", "Get In Touch".

**What they are doing right:** one thing, brilliantly. Their title and description name both universities and both exam levels, so the single page matches a wide range of head queries. For a market this thin, that is sufficient. Their content is behind auth (`/login`, `/register`), and Google is indexing the marketing page.

**What they are doing wrong:** everything else. No sitemap. No internal links. No canonical. No structured data. No content pages. Their URL structure is invisible to crawlers beyond one page.

**The implication:** a competitor ranked number one for "Cameroon past questions" has a single indexable URL. **Building a real catalogue beats them on structure, internal linking, entity coverage, and topical density without needing a single additional backlink.** This is the strongest evidence in the whole research that the plan in §9 is realistic.

### 8.2 temovision.com — why the SERP looks like this

- **Title:** "Home - Temo Vision"
- **Meta description:** "We run a high-quality, professional and friendly dental and eye care clinic. Also, check our online pharmacy in Cameroon, store, and blog."
- **JSON-LD: zero.**
- **Business:** a dental and eye clinic with an online pharmacy, a store, and a blog.

It ranks for "Cameroon past questions" not because of anything on its homepage but because it published blog posts touching the topic, and the domain has accumulated enough topical association with "Cameroon".

**What to take from this:** in a thin SERP, topical association is achievable by a site with no relevance whatsoever. It also means the head term is not defensible by anyone — including us. **Do not enter on "Cameroon past questions." Enter on "University of Buea Computer Science past questions" and win a hundred of those.**

### 8.3 kamerpower.com — the WordPress authority play

- **Title:** "Exam Revision Courses, Career, Concours, Scholarships — Kamerpower"
- **Yoast SEO installed** (confirmed by the `wordpress-seo` stylesheet on the sitemap).
- **Sitemap index with 19 sub-sitemaps:** `post-sitemap.xml` ×4, `page-sitemap.xml`, `job_listing-sitemap.xml`, `course-sitemap.xml`, `lesson-sitemap.xml`, `llms_membership-sitemap.xml`, `product-sitemap.xml`, `event-sitemap.xml`, `web-story-sitemap.xml`, `category-sitemap.xml`, `post_tag-sitemap.xml`, `course_cat-sitemap.xml`, `product_cat-sitemap.xml`, `event_cat-sitemap.xml`, `author-sitemap.xml`.
- **Rich category taxonomy:** `/category/cameroonian-universities/`, `/category/past-questions/`, `/category/exams/`, `/category/careers/`, `/category/jobs/`, `/category/scholarships/`, `/category/professional-schools/`, `/category/official-results/`, `/category/tips-for-students/`, `/category/job-interview-questions/`.
- **JSON-LD: zero.**
- **Content:** announcements and dates — ASTI Buea entrance applications, NAHPI Bamenda competitive entrance, HND examination dates, GCE exam schedules, ENS Buea exam dates. Plus a product catalogue.

**What they are doing right:** they own the *announcement and deadline* intent completely, with a deep taxonomy and an enormous page count. That is a real business and a real SEO asset — **and it is entirely disjoint from what you should build.** They are not competing for study material; they are competing for news.

**The lesson:** taxonomy breadth compounds. Build the University → Faculty → Department taxonomy *once, properly*, and every entity you add inherits and links into the structure. Kamerpower's nineteen sitemaps are what five years of publishing looks like. Our equivalent at year one is one sitemap with three entity types and correct internal linking.

### 8.4 estudio-universe.com — the closest product competitor

- **Title:** "eStudyUniverse | GCE Past Questions, Concours, Student App"
- **Meta description:** "Cameroon's student platform for GCE & concours past questions, AI tutoring, offline practice and video lessons. Free PDFs + app for Android & iOS."
- **Rank Math SEO** installed.
- **robots meta:** `follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large` — the most complete robots directive set of any competitor.
- **robots.txt:** only `Disallow: /wp-admin/` plus an `Allow` for admin-ajax. Effectively open.
- **JSON-LD: zero.**
- **Indexable content URLs visible from the homepage:** `/cameroon-concours/`, `/cameroon-gce-competitive-entrance-exams-courses/`, `/cameroon-gce-past-papers-and-competitive-entrance-exams/`, `/cameroon-gce-past-questions-and-concour-revision-past-questions/`, `/free-gce-past-questions-pdf/`, `/gce-a-level/`, `/gce-o-level/`, `/editorial-standards/`, `/mafa-mathematics-competition/`.
- **Institutional landing pages that rank:** `/faculty-of-engineering-and-technology-buea/` (ranks for "FET Buea Past Questions PDF Free"), `/colledge-of-technology-buea-cot/`, `/nahpi-bamenda/`, `/fet-buea-concours-preparation-guide/`, `/best-gce-study-app-cameroon/`.

**What they are doing right:** they own *faculty and school landing pages* — the exact pattern identified in §2.3 as under-claimed. And `/best-gce-study-app-cameroon/` is a comparison page targeting a competitor-selection query, which is a smart cheap tactic.

**What they are doing wrong:** their institutional pages are professional schools and concours programmes (FET, COT, NAHPI), **not university faculties in the regular sense.** The actual UB and UBamenda faculty tree — CS, EE, Law, Medicine, Economics — is entirely unclaimed by them. Their titles are long and keyword-stuffed (`/cameroon-gce-past-questions-and-concour-revision-past-questions/`). Zero JSON-LD despite shipping an iOS and Android app.

**The gap we can take:** real university faculties and departments. They are not there and, on the evidence, they are not trying.

### 8.5 papers.ndetek.com — the blueprint, and the closest technical analogue

- **Platform:** Next.js App Router. Same stack as ours.
- **Bilingual by path:** `/en/...` and `/fr/...` throughout.
- **Real hreflang** — verified verbatim from a faculty page:
  ```html
  <link rel="alternate" hrefLang="en" href="https://papers.ndetek.com/en"/>
  <link rel="alternate" hrefLang="fr" href="https://papers.ndetek.com/fr"/>
  <link rel="alternate" hrefLang="x-default" href="https://papers.ndetek.com/en"/>
  ```
  **Their bug:** on a faculty page, the alternates point at the site *homepages* rather than the French equivalent of that faculty page. Non-reciprocal, and pointing at the wrong page. Do not copy this.
- **Taxonomy — exactly what we lack:**
  - `/en/university/university-of-bamenda`
  - `/en/faculty/faculty-of-science-fs-tchr`
  - `/en/department/chemistry-chm-62u8`, `/en/department/mathematics-and-computer-science-mcs`, `/en/department/biological-science-bs`, `/en/department/geology-mining-and-environmental-science-gmes`, `/en/department/thermal-and-energy-engineering-tee`, and eight more
  - `/en/paper/exists`, `/en/paper/guides-and-rewards`
- **Title format (the one to copy):** "Faculty of Science - FS - University of Bamenda | Departments & Past Papers"
- **Meta description:** "Browse departments and courses under the Faculty of Science - FS at University of Bamenda. Download past exam questions and solutions."
- **`/en/paper/guides-and-rewards`** — a student-contribution surface. **This is the crowdsourcing play, and it solves our original-content problem.** NdeTek asks students to upload guides and offers rewards.
- **Sitemap flaw:** identical `lastmod` on every URL, plus `changefreq` and `priority` — **exactly the same three mistakes as `app/sitemap.ts`.** This is a Next.js sitemap template everyone copied. Their sitemap is not `noindex`-ing anything and their robots.txt also 404s.
- **JSON-LD: zero.**
- **Social:** `linkedin.com/company/ndetek-papers/`, `x.com/ndetek_papers`.

**Assessment: they are ahead on IA and behind on technical SEO.** A proper taxonomy with a bilingual structure, real `sameAs` social profiles, a student-contribution surface — and zero structured data, a broken hreflang, no sitemap hygiene, and no robots.txt. **Their content strategy (`guides-and-rewards`) is the most directly transferable idea in this entire document.**

### 8.6 cameroongcerevision.com — the per-paper-per-year page factory

- **Yoast SEO.** Six `post-sitemap.xml` files plus page, category and product sitemaps.
- **Content pattern:** one page per subject per paper per year. Verified live URLs:
  `/cameroon-gce-a-level-food-science-and-nutrition-paper-2-june-2019-questions/` through `.../june-2026-questions/`. Seven consecutive years for one subject.
- **Category taxonomy:** `/category/a-level/`, `/category/food-sc/`, `/category/questions/`.
- **Product catalogue:** per-subject "pamphlet" products sold directly.
- **JSON-LD: zero.**
- **Weaknesses:** `/category/food-sc/` is a single tag for one subject — they are modelling subjects as post categories rather than as entities. Titles are long. Descriptions are keyword lists.

**What they are doing right, and it is the core of the tactic:** they have turned a resource that circulates as photocopies into a deep, date-indexed, link-rich page per artefact. That is exactly the move available to you, and the seven-years-of-one-subject pattern shows how it compounds. **Do the same for Buea Computer Science 2018–2025 rather than for GCE Food Science.**

### 8.7 smartwaygceapp.com — per-subject catalogue with syllabus codes

- **Title:** "Advanced Level | Smart Way GCE Prep App"
- **Meta description:** "Explore all 18+ GCE A Level subjects across Science and Arts streams, their official syllabus codes, and exam paper structures for Cameroon's Upper Sixth students."
- **JSON-LD: zero.**

They publish a page per subject that includes the **official syllabus code and the exam paper structure** — structural metadata, not just a download link. That is the "publish the shape, not the answers" model from §3.7, and it is working. Note they are explicit about who they serve ("Upper Sixth students") in the description, which is audience clarity we should copy.

### 8.8 school-forall.com

- **Title:** "School For All - Master Your Cameroon GCE with Confidence"
- **Meta description:** "Access 500+ official past papers, step-by-step video solutions, timed Paper 1 quizzes, and structured course notes for GCE Ordinary & Advanced Level."
- **JSON-LD: zero.**

The number-plus-capability formula — "500+", "step-by-step", "timed", "structured" — is a decent pattern for a product description. GCE-focused, so not a competitor for the university pivot.

### 8.9 The cross-cutting finding

**All eight competitors ship zero JSON-LD.** temovision, eStudyUniverse, cameroongcerevision, Kamerpower, NdeTek, Smart Way, School For All, cameroonpastquestions. Not one.

**Two competitors have no robots.txt and no sitemap** (cameroonpastquestions, NdeTek). The other WordPress sites have sitemaps generated by Yoast or Rank Math, all with the same ignored-`priority`/inaccurate-`lastmod` flaws.

**The summary read:** this market is held together with tape. The competitive advantage available to a small site is not budget and not brand — it is simply *building the thing properly*, because nobody has.

---

## 9. The recommended plan

### 9.1 What to fix first — the technical debt, ordered

Ordered by (impact ÷ effort), all verified against current code.

| # | Fix | Cost | Evidence |
|---|---|---|---|
| **1** | **Emit `og:image` and `og:url`.** Add `images` to both `openGraph` objects at `app/layout.tsx:57-64` and `app/(marketing)/layout.tsx:22-29`, or delete those objects so the file convention works. Regenerate both images at **1200 × 630**. | ~1 hour | §1.3. Every WhatsApp share is currently imageless. |
| **2** | **Rewrite every metadata string off GCE A-Level.** Root, marketing layout, about, manifest, and `app/(marketing)/page.tsx:19`'s visible copy. Build the `buildMetadata()` helper so page 3 cannot regress. | 1 day | §1.2. Six of seven public pages are wrong. |
| **3** | **Fix the sitemap.** Remove `/sign-in` and `/verify-email`. Replace every `new Date()` (`app/sitemap.ts:10,17,24,31,37,43,49,56,62,68`) with a real `updatedAt` or omit the field. Delete the ignored `priority`/`changeFrequency`. Build it as an index. | 2 hours | §1.5. Google's own doc says `priority` and `changefreq` are ignored and `lastmod` is only used if accurate. |
| **4** | **Fix robots.txt.** Choose one mechanism. Add explicit AI-crawler rules (§9.4). Remove stale GCE paths. Stop blocking what should be crawlable. | 2 hours | §1.6. |
| **5** | **Verify Arcjet's bot categories allow the AI search bots**, or add explicit allowlisting at `proxy.ts:11-14`. | 1 hour | §1.11. Without this, none of #4 works. **[UNVERIFIED]** — check `node_modules/@arcjet/next` category definitions. |
| **6** | **Add `generateMetadata` to `app/result/[shareId]/page.tsx`** with a per-result title and a generated OG image. Fix the undimensioned `<img>` at `:103-108`. | 1 day | §1.10. This is the page people share. |
| **7** | **Wire `FAQSchema` and `BreadcrumbSchema`.** `components/seo/FAQSchema.tsx` and `components/seo/BreadcrumbSchema.tsx` are dead code. The former can go live in ten minutes — `FAQ_ITEMS` is already rendered at `app/(marketing)/faq/page.tsx:26-35`. | 1 hour | §1.7. Not for rich results — those are gone. For AI engines. |
| **8** | **Fix `OrganizationSchema`.** Broken logo URL at `:7`, false French at `:19`, expand `sameAs` at `:10`, switch `potentialAction` to `SearchAction`. | 2 hours | §1.7. This is the GEO entity anchor. |
| **9** | **`next.config.ts`: add `poweredByHeader: false`, set `trailingSlash` explicitly, and build the GCE→university redirect map.** | 3 hours | §1.9. |
| **10** | **Add `loading.tsx` and real Suspense boundaries to every dynamic route.** Move the onboarding redirect from `app/(dashboard)/layout.tsx:29-41` into `proxy.ts`. | 2 days | §7.1, §7.6. Currently zero route boundaries exist. |
| **11** | **Cut the marketing JS bundle.** Target: move `landing-hero.tsx:165-198`'s catalogue fetch to a server component with `'use cache'`, prerender it, delete the skeleton at `landing-hero.tsx:11`, and split `pricing/page.tsx` into a server shell plus a client island. | 3–5 days | §1.15, §6.1. 340 KB → target under 150 KB. |
| **12** | **Redirects and canonicals from the new metadata helper**, including `alternates.canonical` on every page. | 1 day | §3.4. |

Items 1–5 are a day of work and fix the most visible breakage. Do them before anything else.

### 9.2 The honesty problem, and the framing that resolves it

Your brief flags a real reputational risk: 93% of students cheat at university, and being an answer machine is both ethically fraught and commercially dangerous — a student who cheats with your tool cannot recommend it to their friend, and a department that notices your tool in a cheating case will not let you back in.

**The resolution is not to be coy about it. It is to change what you publish.**

| Publish publicly | Keep behind auth |
|---|---|
| Which courses exist in which department | The full question text |
| Which years and sessions the papers are from | Marking schemes and rubrics |
| Paper *shape*: sections, marks, durations, question counts | Model answers |
| **Original frequency analysis** — which topics carry what share of marks, which command words appear and how often | Any per-paper answer key |
| How marking works, quoted from public handbooks and rubrics | Attempt history, grades, rankings |
| Where to find the original photocopy (deferral, not facilitation) | |

Two framing principles that make this work:

1. **Publish method, not answers.** The Princeton paper's *Statistics Addition* and *Cite Sources* methods — the two highest-performing GEO techniques — are both about publishing analysis and attribution. Not one of them involves publishing answers. **The GEO-optimal content strategy and the ethically defensible content strategy are the same strategy.** That is a rare alignment and worth saying out loud to whoever is worried about the pivot.
2. **Reframe the product publicly from "exam answers" to "revision method."** The landing page today says "Transform your notes into quizzes, prepare for GCE exams" — an answer-machine framing. The university equivalent that is both true and defensible is *revision method and marking insight*: this is what NdeTek does with `/paper/guides-and-rewards`, and it is what `smartwaygceapp.com` does with "syllabus codes and exam paper structures".

### 9.3 Content and keyword strategy for a site with no public archive

The constraint: no public university paper archive exists to index, and past papers circulate as photocopies. You cannot out-index Studocu for a scanned PDF, and you should not try — they are paywalled and hostile to mobile data anyway.

**The strategy is to build the entity graph and then publish the analysis.**

**Phase 1 — the taxonomy (blocking, week 1–2).**
Add `University`, `Faculty`, `Department`, `Course` models with `examLevelId` detached or supplemented. Verified: none exist (`prisma/schema.prisma:138-151` is the entire taxonomy). Seed from the public UB and UBamenda faculty lists — **that information is public and not currently indexed by anyone as an entity structure.** This step alone makes you structurally superior to cameroonpastquestions (one page) and puts you level with NdeTek (who have only Bamenda, and with a broken hreflang).

**Phase 2 — the long tail (weeks 2–6).**
Pick **two universities, six faculties, and twenty courses.** Twenty courses, not two hundred. For each course, publish one page containing the paper *shape* and the frequency analysis. That is 20 pages of genuinely original, citable, indexable content. Twenty well-built pages will outrank two thousand thin ones in a SERP this thin (§2.6).

**Phase 3 — the guides (weeks 6–12).**
Use `RevisionGuide` — the model already exists at `prisma/schema.prisma:1098-1114` with a `markdown` column, a `published` flag, and a `focus` taxonomy. **Make it public.** Today `app/api/revision-guides/route.ts:10-11` 401s without a session, and `:17-27` does not even select `markdown`. Strip the auth, select the markdown, render it. This is an existing asset going from zero to fully indexable in about a day.

**Phase 4 — the contribution flywheel (quarter two).**
Adopt NdeTek's `/paper/guides-and-rewards` model. Students upload a paper or a marking note, get credit toward their subscription, and the content is published under their name. **This is how you build an archive that nobody else has, from a user base you already have, and it is the mechanism that makes the GEO play durable rather than a one-off content push.**

**Keyword targeting — where to aim:**

- **Aim at:** `[course] past questions [university]`, `[department] past questions [university]`, `UB [faculty] revision`, `[course code] exam structure`, `how is [course] marked [university]`, `[year] [course] questions`.
- **Aim at (Facts queries, Cite Sources method):** `courses in UB computer science`, `faculties at University of Bamenda`, `Buea CS department courses`. **This is the least contested space in the entire market and nobody has built it.**
- **Avoid:** "Cameroon past questions" (Temo Vision has it), "GCE past questions" (crowded and irrelevant), "HND past questions" (different market, different competitors), French queries (different geography — see §French correction above).

**Honest expectation on volume:** I could not verify search volumes (§2.1). **Do not build a plan on volume projections.** Build on the structural observation, which *is* verified: the head-term competitor has one page and no sitemap.

### 9.4 The GEO play

The concrete sequence, given the first-hand-material advantage:

1. **Fix the technical floor first.** §9.1 items 1–8. AI crawlers cannot cite a page that returns a bot challenge, has no `og:image`, and no entity record.
2. **Publish the statistics.** For each of the 20 courses, publish the frequency analysis with actual numbers: topic share of marks, command-word distribution, year-on-year drift. Named sources, explicit dates. This is *Statistics Addition*, a top-three method in the peer-reviewed GEO literature, and it is the one thing eight competitors have not done.
3. **Quote the primary documents.** Extract marking-scheme language and examiner instructions verbatim from the papers you hold, attribute them, cite the year and paper. *Quotation Addition*, also top-three. NdeTek's user cannot do this and neither can Studocu.
4. **Source every factual claim.** Every statement about a curriculum, a department, a paper structure gets a citation to a real document. *Cite Sources*, also top-three. And it directly serves the Facts queries in §9.3.
5. **Build the entity.** Eight-plus `sameAs` anchors. Consistent naming. Fix the Organization schema. Own the brand phrase.
6. **Add `llms.txt`.** **[CONVENTION]** `llms.txt` is an emerging, unofficial convention for directing AI crawlers to a curated set of pages. Kamerpower serves `llms_membership-sitemap.xml`, which suggests some early awareness in this space. I did not find a primary specification, so treat the format's durability as unverified — but it costs an afternoon to add and the downside is nil. **Do this late, not early.**
7. **Do not chase keyword stuffing or authoritative tone.** Both were measured and found wanting (§4.8). If anyone proposes them, point at the paper.

### 9.5 Rendering decisions, one line each

| Route | Decision |
|---|---|
| `/` | Static shell + server-fetched catalogue via `'use cache'` + `cacheLife('hours')`; session in a Suspense island. **Must never block first paint.** |
| `/pricing` | Fully static; client subscribe handler becomes an island. |
| `/about` `/contact` `/privacy` `/terms` `/faq` | Fully static. Accordion and form become islands. |
| Catalogue pages | `generateStaticParams` for the top 500 + `'use cache'`/`cacheTag` for the long tail + `revalidateTag` on publish. |
| Guides | `generateStaticParams` + `revalidateTag`. |
| `/result/[shareId]` | Dynamic with a short `cacheLife`; `generateMetadata` with a generated OG image. |
| Dashboard | Dynamic, streamed. Session check moves to `proxy.ts`. Real `loading.tsx`. |
| Chat | Client shell, streamed tokens, optimistic user message, no skeleton on the answer. |
| Exam runner | Client-rendered, explicit prefetch, local answer persistence, no loading states. |
| Result review | Stream everything deterministic; poll only the AI grading. |

### 9.6 Metadata rules

1. One `buildMetadata()` helper. Every page calls it. A page cannot ship a wrong description because there is one place it comes from.
2. `title.template` at the root. Explicit `absolute` only when genuinely needed.
3. Never `"use client"` on a page that needs metadata. Split server shell / client island.
4. Title leads with the **entity chain** (University → Faculty → Department → Course), brand last, year when time-bound, ~50–60 rendered pixels.
5. Description is 140–160 characters, specific, no brand manifesto.
6. `alternates.canonical` on every page, emitted by the helper.
7. `og:image` + `og:url` on every page, always. 1200×630. Verified in CI that `og:image` is present.
8. Per-course generated card; per-result generated card; never in the sitemap.
9. `lastmod` from a real `updatedAt`, or omitted.
10. `priority` and `changefreq` do not exist in this codebase.

### 9.7 Ninety days versus a year — the honest version

**Achievable in ninety days, by a small team:**

- Every item in §9.1. This is the technical floor and it is a week of work, not a quarter.
- The `University`/`Faculty`/`Department`/`Course` taxonomy, seeded for UB and UBamenda.
- A public guide/notes section from the existing `RevisionGuide` model — including publishing the markdown that is already in the database and never read.
- 20–40 course pages with paper shape and frequency analysis.
- `/result/[shareId]` given proper metadata and a generated share card.
- Route-level `loading.tsx` and Suspense boundaries on the dashboard.
- A meaningful reduction in the marketing bundle.
- Robots rules for AI crawlers, with search bots allowed and training bots blocked.

**What ninety days will NOT produce:**

- **Ranking for "university past questions Cameroon" or "Cameroon past questions."** Even cameroonpastquestions has been at this for a while with a marketing page. Head terms in a Cameroon market need sustained authority.
- **A meaningful citation rate in AI answer engines.** The Princeton paper's effect sizes are measured against content that already exists and is already indexed. New pages start at zero. **GEO has a lag measured in months, not weeks.**
- **A paper archive.** Twenty courses is a demonstration, not a catalogue. Coverage will be visibly incomplete and students will notice.
- **Traffic from French.** Building French infrastructure without French content produces nothing.
- **Any movement on the HND or GCE queries**, which are mature and separately contested.

**Achievable in a year:**

- Full UB and UBamenda faculty and department coverage.
- The student-contribution flywheel producing a genuine paper archive.
- The original-dataset position that makes the frequency analysis defensible as a long-term moat.
- A working entity in AI answer engines for "what should I use to revise at Buea."
- A genuine content moat that eight competitors with zero structured data and no university faculty trees cannot copy quickly.

### 9.8 What will not work — stated plainly

- **Entering on "Cameroon past questions" or "Cameroon past questions university."** A dental clinic ranks there. Winning it requires out-indexing everyone on head terms you have no authority for, and you would lose the entire effort to a site with one page and no sitemap — or win it and gain nothing durable.
- **Chasing French in year one.** Wrong geography. Buea and Bamenda are Anglophone. The French opportunity is Douala and Yaoundé, and it is a separate product decision.
- **Going after Studocu, Course Hero, Studydrive and Scribd for "download [paper]" queries.** They have the scans and enormous domain authority. You will not win, and the queries are low-value per visit anyway — a student who downloads a PDF leaves and does not come back.
- **Keyword stuffing, and the general genre of GEO folklore.** Measured and found wanting (§4.8).
- **Building the French hreflang tree before there is French content.** Non-reciprocal hreflang on a single-language site is worse than none.
- **Rebuilding on every content change.** `generateStaticParams` alone does this and it does not scale. `cacheTag` + `revalidateTag` is the answer, and it requires zero UI work.
- **Treating structured data as a ranking strategy.** Google says in its own documentation that it is not a ranking factor. It is worth doing because everyone else is not doing it, and because it helps AI engines. That is the entire case, and it is a good one.
- **Optimising the landing page while leaving `proxy.ts:61` redirecting every logged-in user to `/chat`.** You cannot build an SEO-led funnel if your own returning users never see the funnel.

---

## Appendix A — sources used

**Google Search Central** (all fetched and read this session)
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies — structured data does not affect ranking; Google does not guarantee rich results
- https://developers.google.com/search/docs/appearance/structured-data/faqpage — **verified 302 to https://developers.google.com/search/updates#removing-faq-rich-result**
- https://developers.google.com/search/docs/appearance/structured-data/course
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag — noindex, `X-Robots-Tag`, and the interaction between them
- https://developers.google.com/search/docs/crawling-indexing/robots/intro — robots.txt as a crawling, not indexing, control
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls — canonical
- https://developers.google.com/search/docs/specialty/international/localized-versions — hreflang, `x-default`, reciprocity
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap — 50,000 URL / 50 MB limits; priority and changefreq ignored; lastmod accuracy rule
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/updates — FAQ rich result removal; breadcrumb desktop-only

**Next.js / Vercel**
- https://nextjs.org/docs/app/getting-started/cache-components — opt-in, static shell, `use cache`, `use cache: private`, `use cache: remote`
- https://nextjs.org/docs/app/api-reference/directives/use-cache
- https://nextjs.org/docs/app/api-reference/functions/cacheLife
- https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- https://vercel.com/academy/nextjs-foundations/cache-components — static shell + cached content + request-time content; `connection()` opts a whole route dynamic
- https://vercel.com/academy/nextjs-foundations/suspense-and-streaming

**Performance and UX**
- https://web.dev/articles/vitals — LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, p75
- https://www.nngroup.com/articles/skeleton-screens/ — skeleton types, the under-1s and 10s rules, process indicators
- https://www.nngroup.com/articles/response-times-3-important-limits/ — 0.1 s / 1 s / 10 s thresholds

**Research**
- https://arxiv.org/abs/2311.09735 — Aggarwal et al., *GEO: Generative Engine Optimization*. Read in full PDF. All §4.4 numbers come from here.

**AI crawler primary sources**
- https://platform.openai.com/docs/bots — `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`; independence of settings; ~24 h propagation
- https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler — `ClaudeBot`, `Claude-User`, `Claude-SearchBot`
- https://claude.com/crawling/bots.json — Anthropic verified IPs

**Open Graph**
- https://ogp.me/ — the four required properties

**Competitors** (scraped and inspected this session)
`cameroonpastquestions.com`, `temovision.com`, `kamerpower.com`, `estudyuniverse.com`, `cameroongcerevision.com`, `papers.ndetek.com`, `smartwaygceapp.com`, `school-forall.com`, `ndetek.com`, `ubuea.cm`

Raw firecrawl output: `.firecrawl/` (`s01`–`s18` search, `comp-*` / `c-*` / `tc-home` competitors, `g-*` / `w-*` / `nn-*` / `nx-*` / `d-*` / `e-*` / `f-*` documentation).

## Appendix B — everything marked unverified

Collected so it can be chased down rather than rediscovered.

1. **All search volumes.** No tool available in this session exposes Cameroon-level Google data. Everything in §2 is SERP composition, not volume. **This is the biggest gap in the document.**
2. **Whether Arcjet (`proxy.ts:11-14`) classifies `OAI-SearchBot` and `Claude-SearchBot` as `CATEGORY:SEARCH_ENGINE`.** If not, the robots rules in §4.3 never take effect. Check `node_modules/@arcjet/next`.
3. **OG image dimensions.** Facebook's Sharing Debugger documentation returned no content. 1200×630 and the PNG-over-WebP guidance are community convention, not vendor citation.
4. **`llms.txt` durability.** No primary specification found. Kamerpower's `llms_membership-sitemap.xml` suggests market awareness, nothing more.
5. **Self-serve AI content licensing.** No primary documentation found from OpenAI or Anthropic for an operation this size.
6. **The arXiv survey at `2607.14035`** ("A Critical Survey of GEO 2023–2026") appeared in search results and was not read. It may contain newer effect sizes.
7. **All vendor GEO statistics pages** (Semrush, Similarweb, Peec, Yotpo, Profound, OmniBound and others). Not read, not relied on, not cited.
8. **E-E-A-T and author credentials as a direct citation lever.** Widely asserted in industry content, no primary evidence found.
9. **TTFB of 2.81 s** measured from this workstation, not from a Cameroonian network. Directional only.
10. **The "NdeTek hreflang bug."** Observed on one faculty page. Verify on two or three before treating it as their pattern.