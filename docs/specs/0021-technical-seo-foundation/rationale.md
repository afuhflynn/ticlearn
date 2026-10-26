# 0021 · Technical SEO foundation, decision record

_The context, the options weighed, and why static metadata with a shared helper won. The build spec is in `index.md`._

## Context

TiCLearn is a study platform for Cameroonian university students. Its public pages are the shop window: a student arrives from a search result or a WhatsApp link and decides whether to sign up. Search engines and messaging apps read the served HTML, so metadata, canonicals, hreflang, and structured data must be in the document, not added by JavaScript after hydration.

Today the app already has Next.js metadata exports on every marketing page, an app/robots.ts file, an app/sitemap.ts file, and an OrganizationSchema component. But the pieces do not add up: six of seven public pages carry an old secondary school description, the three auth pages (sign in, sign up, verify email) are client components that cannot export metadata, robots blocks authed prefixes while some pages say index true, no alternate language links exist, no OG images ship, and OrganizationSchema renders only in the root layout where it cannot be page specific.

The market research behind this decision (feature 36 in docs/scope/market.md) found that competitors ship zero structured data, making it uncontested ground, and that a WhatsApp share image is the highest return fix because sharing happens over WhatsApp here. The work must not promise what the app does not ship: no invented counts, no currency amounts, no phone numbers, no bare percentages.

## Options considered

### Option 1: Static metadata in code with a shared helper

Each public page keeps its metadata object in its page file, but SITE_URL, AUTHED_PREFIXES, canonical, hreflang, OG defaults, and structured data builders move into a shared lib/seo.ts. No database table, no migration, no new service.

**Pros**:
- No schema change, no migration risk, no new infrastructure
- Metadata stays in the served HTML because Next.js renders page metadata server side
- One shared helper prevents page level drift between pages
- Three client component auth pages get metadata through a server wrapper

**Cons**:
- Copy changes require a deploy; no admin UI for editing titles or descriptions
- Not as flexible as a database driven approach

### Option 2: Database driven metadata with an admin UI

Each page's title, description, canonical, and OG image live in a database table, editable by an admin without a deploy.

**Pros**:
- Non technical operators can update copy without code
- No deploy needed for metadata changes

**Cons**:
- New schema table, migration, admin UI, and API routes
- Slower to build, more surface to test and maintain
- Overkill for ten public pages that change rarely

## Rationale

The stack already has Next.js metadata exports on every marketing page. The gap is not the mechanism but the consistency: each page sets its own title and description without a shared source for canonicals, hreflang, OG defaults, or structured data. Option 1 closes that gap with the least new code. Option 2 was rejected because a database driven metadata system is heavy for a ten page public set and would need its own spec. The app already pays for a deploy pipeline, so a deploy for copy is not a new cost.
