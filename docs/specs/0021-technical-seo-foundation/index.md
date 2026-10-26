# 0021. Technical SEO foundation

**Date**: 2026-10-25
**Status**: Accepted 2026-10-26 (built and verified 2026-10-26, `/test-engineer` 888 passing). `/peer-review` and `/tech-writer` are still open. Item 3 landed as Organization schema in each public layout rather than one shared layout, because `(marketing)` and `(auth)` are siblings and have no common layout short of a root level one.

## Summary

Every public page must emit its own title, description, canonical URL, and share image so a student arriving from a search result or a WhatsApp share sees a real page, not a blank shell. Today no page carries a social image, some pages cannot set metadata because they are client components, authed pages are blocked in robots yet marked indexable, and one structured data component is dead code. This spec decides what each public page publishes, how the sitemap and robots rules stay honest, and where shared SEO helpers live.

## Requirements

**User stories**:
- As a prospective student arriving from a search result, I want every public page to show a real title and description in the served HTML so I know what TiCLearn is before I sign up.
- As a student sharing a page on WhatsApp, I want a social image and a correct description so the link preview looks real and names the course or tool.
- As a search engine crawler, I want a sitemap that lists only public URLs and a robots file that keeps signed in pages out of the index.
- As an English speaking student, I want an en-CM alternate link so I see the right language version of a page.

**Acceptance criteria**:
- **AC-1**: Every public page exports metadata with a title and a description written for Cameroonian university and HND students, rendered into the served HTML. The three client component auth pages get metadata through a server wrapper.
- **AC-2**: Every public page has a self-referencing canonical URL and an en-CM alternate language link. French alternates are not emitted until French pages exist.
- **AC-3**: The home, about, and FAQ pages each carry an OG social image at 1200 by 630 pixels with declared dimensions matching the actual file, plus a Twitter summary_large_image card reusing the OG image. All other public pages use the default OG image.
- **AC-4**: The sitemap lists every static public URL and nothing authed (no /dashboard, /chat, /settings, /notes, /quizzes, /attempts, /upload, /subscription, /admin, /api). Dynamic routes like /result/[shareId] are excluded from the static sitemap.
- **AC-5**: robots.ts disallows the authed prefix list and references the sitemap; no authed page is marked indexable. The authed prefix list lives in one place and is shared by robots.ts, sitemap.ts, and the noindex helper.
- **AC-6**: Organization structured data renders on every public page, and WebSite structured data renders on the home page only. No duplicate Organization blocks on any page.
- **AC-7**: A shared lib/seo.ts helper holds SITE_URL, AUTHED_PREFIXES, canonical and hreflang builders, OG defaults, and structured data builders so pages cannot drift.
- **AC-8**: The landing honesty rules still hold on all public pages: no invented counts, no currency amounts, no phone numbers, no bare percentages.

## Decision

**Chosen option**: Option 1: static metadata in code with a shared lib/seo.ts helper.

Static metadata is the right fit because the public page set is small, changes rarely, and the team already runs a deploy pipeline. A database table and admin UI would add schema, migration, API, and UI surface for ten pages that an editor touches occasionally. The shared helper keeps the build spec small and prevents the page level drift that caused today's inconsistency.

**Implementation skills**: none used; Next.js built-in metadata API and MetadataRoute are the conventions from AGENTS.md.

## Feature design

**Data model sketch**: none. No schema change, no migration. All metadata strings stay in page files or in lib/seo.ts.

**State transitions**: not applicable; no stateful entity.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /robots.txt | GET | none | robots rules text | none | none |
| /sitemap.xml | GET | none | URL list XML | none | none |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Any public page title | page title string | per page metadata object in the page file |
| Any public page description | page description string | per page metadata object in the page file |
| Canonical URL | canonical string | canonicalUrl(path) in lib/seo.ts, self referencing, derived from SITE_URL plus path, query string stripped |
| Alternate language links | en-CM href | Next.js alternates in page metadata, scoped to en-CM self reference only |
| OG social image | image URL and 1200 by 630 dimensions | static file under public/ referenced in openGraph.images; home/about/faq use their own, all others use default |
| Twitter card | card type and image | page metadata twitter object; card type summary_large_image, image reuses the OG URL |
| Sitemap URL entries | full URL, lastModified, changeFrequency, priority | static list in app/sitemap.ts; lastModified is build time new Date() |
| robots disallow rules | path prefix list | AUTHED_PREFIXES exported from lib/seo.ts |
| Organization schema | JSON-LD object | components/seo/OrganizationSchema.tsx, rendered on each public page via shared public layout |
| WebSite schema | JSON-LD object | lib/seo.ts websiteSchema builder, home page only |

**Key invariants**:
- Every public page has its own metadata object or server wrapper metadata with title and description
- No authed URL appears in the sitemap
- robots.ts never marks an authed page indexable
- No public page states an invented count, currency amount, phone number, or bare percentage
- OG images have declared dimensions matching the actual file pixels
- French alternates are not emitted until French pages exist
- Organization schema appears once per public page, no duplicates

**Security model**: Public pages are session free and indexable. Authed surfaces (dashboard, chat, settings, notes, quizzes, attempts, upload, subscription, admin, api) carry noindex through the existing lib/metadata.ts helper and are disallowed in robots.ts via the shared AUTHED_PREFIXES list. No PII is exposed in public metadata. Compliance scope is the landing honesty rules only.

**Configuration required**: none. No new env vars or credentials. SITE_URL is a hardcoded constant in lib/seo.ts.

**Critical test scenarios**:
- Happy path: build the app, fetch /, /about, /faq and confirm each has metadata, canonical, en-CM alternate, OG image, and Organization schema in the served HTML, verifies AC-1, AC-2, AC-3, AC-6
- Auth pages: fetch /sign-in, /sign-up, /verify-email served HTML and confirm title and description are present (metadata delivered through server wrapper despite client component pages), verifies AC-1
- Sitemap: fetch /sitemap.xml and confirm every static public URL is listed and no authed path prefix appears, verifies AC-4
- Robots: fetch /robots.txt and confirm authed prefixes are disallowed and the sitemap is referenced, verifies AC-5
- Honesty: run scripts/check-landing-honesty.mjs on all ten built public pages and confirm no banned word, currency, percentage, phone number, or invented count, verifies AC-8

## Build plan

Tracer Bullet (the project default from AGENTS.md): each slice works end to end before the next starts. No schema layer exists here, so the plan is configuration and page level only.

1. [x] Create lib/seo.ts with SITE_URL, AUTHED_PREFIXES, canonicalUrl, pageMetadata, organizationSchema, websiteSchema builders and OG defaults, satisfies AC-7
2. [x] Update root app/layout.tsx to remove OrganizationSchema if rendered there, add noindex handling for authed route groups via lib/metadata.ts, satisfies AC-5, AC-6
3. [x] Create a shared public layout covering both (marketing) and (auth) groups that renders OrganizationSchema on every public page and WebSite schema on home, satisfies AC-6
4. [x] Update each marketing page metadata (home, about, faq, contact, terms, privacy, pricing) with title, description, canonical, en-CM alternate, OG image where applicable, satisfies AC-1, AC-2, AC-3
5. [x] Add OG social image files under public/og/: home.png, about.png, faq.png at 1200 by 630 with declared dimensions matching actual file pixels, plus default.png fallback, satisfies AC-3
6. [x] Give the three client component auth pages (sign in, sign up, verify email) metadata through a server wrapper or generateMetadata in a server parent, satisfies AC-1
7. [x] Review app/robots.ts to use AUTHED_PREFIXES from lib/seo.ts and confirm no authed page is indexable, satisfies AC-5
8. [x] Review app/sitemap.ts to list every static public URL and nothing authed, lastModified as build time new Date(), satisfies AC-4
9. [x] Extend scripts/check-landing-honesty.mjs to scan all ten public pages and require canonical on every page, satisfies AC-8
10. [x] Run pnpm honesty:check, pnpm lint, pnpm build, and the test suite, satisfies AC-8

## Consequences

**Positive**:
- Every public page publishes honest metadata in served HTML, so search engines and WhatsApp previews see real content
- One shared helper prevents the page level drift that caused today's inconsistent titles and descriptions
- The sitemap and robots rules stay aligned: public URLs indexed, authed URLs excluded
- Client component auth pages still get metadata through a server wrapper

**Negative / tradeoffs**:
- Copy changes require a deploy; there is no admin UI to edit titles or descriptions without code
- Ten public pages each maintain their own metadata strings, so duplicate wording can creep in between deploys
- French alternates are deferred: en-CM self reference only until French pages ship under a separate spec
- No database driven metadata means this work does not scale to hundreds of pages without a later spec (feature 37 covers the course catalogue)

**Neutral**:
- No schema change, no migration, no new infrastructure, no new env vars
- Structured data (Organization, WebSite) is uncontested ground: competitors ship zero structured data, so this is differentiation without a standards risk
- The default OG fallback image means a missing file never breaks the build, but it also means a page without its own image ships a generic card
- Dynamic public routes like /result/[shareId] are excluded from the static sitemap until they exist; they will be added when feature 37 or share pages ship

## Follow-up

- [ ] Feature 37 (public course and faculty catalogue) will add database driven URLs to the sitemap; revisit the static sitemap decision then
- [ ] Feature 39 (GEO and AI answer readiness) will add AI crawler rules to robots.ts; revisit the robots scope decision then
- [ ] When French pages exist, emit fr-CM alternate links alongside en-CM
- [ ] When a monitored WhatsApp number exists, add it to constants/contact.ts so the OG card and footer share the same truth

## Structure

This spec was split on 2026-10-26: the build spec lives here, the decision record in [rationale.md](rationale.md), and the runnable checklist in [verify.md](verify.md).
