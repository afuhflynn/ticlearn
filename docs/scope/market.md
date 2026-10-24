# Market

Slice 1, the first ten minutes, plus the search surface that brings people to it. Nine features: what a stranger lands on, understands, signs up for, and knows what to do with, without uploading anything, and the public pages that let a student find us and an assistant quote us.

(basis: research/design-reference.md §3 and §5 · research/audience-and-market.md §6 · research/seo-and-rendering.md)

## Slice 1: First ten minutes

### 14. Landing page rebuild · GA
The current page sells GCE A Level to secondary school students. Research on the Cameroonian market is blunt about what works: name the universities, show the mobile money logos above the fold, show a peer count you can defend, show the download size and the data cost, and put a live WhatsApp link on every page. A semester countdown to the next exam block is the cheapest conversion asset we own.
**Done when (spec 0015 supersedes the page section of spec 0014):** the page follows the approved mockup section for section, keeps the TiCLearn logo and the **Tip** name, fills its frames with real screenshots, says what is free with the real limits, names MTN Mobile Money and Orange Money without printing a price, there is no phone number and no invented number, and every surface the page does not promise stays cut.

(basis: specs [0014](../specs/0014-landing-page-rebuild/index.md) and [0015](../specs/0015-landing-page-mockup/index.md) · the market research above assumed a download and a peer count; the product is a web app with no defensible count, so the page sells the three jobs instead)

NOTE: Very important. In addition to all of these, the first thing I want us to do first, is first go through this app, from the student to admins layers to dashboards, and look at every feature, and every page and then I will make a decision after we have the usefulness of each and then we will make decisions on which pages, features to keep based on the pivot and our new audience, to focus on the bear bones of what we are offering and focusing on features that truly provide value to the users and we can completely get rid of what is not important and focus. Like for example, look at our new target audience, who are university students, what will will they be doing with leaderboard, community, feedback, progress and other stuffs in the product so early that doesn't really provide any value. And I also want us to completely redesign the affiliate system and the way it functions, users should not be able to generate affiliate links no even see the page, but admins can create new affiliate links for specific users and only then can they then see the affiliate page with their stats (We are moving the affiliate system completely to proprietory or invite only and we will only select people to be added into it so that we don't end having to waste resources on users who don't want to pay for our product)
So for the cleanups, we need to ensure that we clean at all ends, from pages, to components, to features, to routes to db and make sure we don't waste resources

NOTE: This is just a suggestion and not an absolute design to recopy but just for inspiration. You can reference this image to steal tips from in: "../../template_images/ticlearn.png"
The audit this note asks for ran on 2026-10-23 and its result is recorded in spec [0014](../specs/0014-landing-page-rebuild/index.md). Community, leaderboard, feedback, progress and every stat surface are cut there; the affiliate redesign became feature 43.
- [x] Design it (spec): `/solution-architect landing page rebuild` · spec [0014](../specs/0014-landing-page-rebuild/index.md)
- [x] Build it: `/feature-build landing page rebuild`
  - [x] Cut the product back to notes, quizzes and Tip, drop the eight dead tables and the code nothing calls (covers AC-1, AC-2, AC-4, AC-18)
  - [x] Rebuild the dashboard as a continue surface, the not found page, the contact constants and the request guard (covers AC-3, AC-9, AC-10, AC-17)
  - [x] Stand up the page shell with the Tip question, the chat `q` handling and the real screenshots (covers AC-5, AC-11, AC-13, AC-14, AC-16, AC-19)
  - [x] Apply the design, the copy, the money stance and the metadata, then pass the honesty scan (covers AC-6, AC-7, AC-8, AC-12, AC-15, AC-20)
  - [x] Rebuild the page from the approved mockup (spec 0015): eight server sections, real screenshots, free + Mobile Money in the CTA band, and the dead referral overlay removed
- [x] Verify it: `/verify-release landing page rebuild`
- [x] Test it: `/test-engineer landing page rebuild`
  - Trail: 622 unit tests across 71 files pass and the public pages browser suite passes 16 of 16 three runs in a row. The unit suite pins 0014 AC-1 (no cut links in nav, footer or sidebar paths), AC-3 (the dashboard continue route, read, hook and cards), AC-9 (one WhatsApp constant on landing, footer, contact and the not found page), AC-10 (the not found page), AC-16 (the chat `q` handover) and AC-17 (the `/notes` and `/attempts` guard and the signed in redirect), plus 0015 AC-2 to AC-5 (no question box, real screenshots with alt text, free limits from `FREE_LIMITS`, anchors resolve). The browser suite pins the rest against a built server, including the axe loop. It caught two real faults that `/fault-fix` fixed at the root: an invented `note.subject` render in `app/(dashboard)/dashboard/dashboard-client.tsx` (the field exists in no table and no payload; the card now shows `note.fileName`), and the dark `--primary` token failing WCAG AA on the muted surfaces at 4.31 to 1 (`app/globals.css`, now oklch(0.67) at 4.75 worst surface). Deferred to `/verify-release`: 0014 AC-14 (throttled 3G budget), AC-15 (keyboard and reduced motion), and AC-2's script gate which runs via `pnpm honesty:check` (it passed live today).
- [x] Review it (fresh model): `/peer-review landing page rebuild`
  - Repaired after review, all by hand and all green again (`pnpm tsc`, `pnpm lint` at the 61 warning baseline, 623 of 623 tests, `pnpm build`, headers verified live, `honesty:check` passed): the free sentence now says "to try" for notes and quizzes with "a day" on Tip alone, the dashboard cards format their dates in Africa/Douala through `formatDay` in `lib/utils.ts`, the clickjacking headers go back to `DENY` and `'none'` with a real `frame-src 'self' https://*.ufs.sh https://*.utfs.io` for the note PDF pane, the seed creates the demo account only outside production or with `SEED_DEMO=1`, the useless fragment on the admin metrics page is gone, `lib/cache/reads.ts` checks the user shape before the kind match so the guard no longer needs the `string` widening, and the mock era copy and schema comments are rewritten (`app/(admin)/admin/platform-settings/page.tsx`, `prisma/schema.prisma`). The dashboard read is now invalidated by every write that touches its three cards (`hooks/useQuizzes.ts`, `hooks/useNotes.ts`, `hooks/useChat.ts`).
- [x] Document it: `/tech-writer landing page rebuild`
  - PR title and body delivered in chat. The work is still uncommitted, so no PR carries it yet; open the PR with the text once it lands on a branch.

### 15. Public page set
About, FAQ, contact, terms and privacy. Today the FAQ data lives in a constants file, the contact form injects raw user text into an admin email with no rate limit, and every page carries GCE metadata. Research found that every credible competitor publishes a real phone number and a working WhatsApp link, and that the ones with dead links lose trust immediately.
**Done when (spec 0016 amends the contact stance):** every public page carries working contact details and correct university metadata, the FAQ answers the questions research says students actually ask about cost, data use and offline access, and no unauthenticated contact endpoint remains (spec 0016 chose deleting the form over hardening it, the WhatsApp group being the one staffed channel).
- [x] Design it (spec): `/solution-architect public page set` · spec [0016](../specs/0016-public-page-set/index.md)
- [x] Build it: `/feature-build public page set` · code in `app/(marketing)/` and `components/marketing/`, with `scripts/check-landing-honesty.mjs` extended and the sign-up line in `app/(auth)/sign-up/page.tsx`
  - [x] Accordion pattern and FAQ truth: the single column treatment, the permanently open bug fixed, all 18 answers corrected (covers AC-3, AC-5, AC-12)
  - [x] Landing FAQ as a single column of six curated questions beside the CTA band (covers AC-4)
  - [x] Contact truth: the form path deleted end to end, the WhatsApp card, the footer email row gone (covers AC-2, AC-6)
  - [x] Terms, Privacy and About rewrites with per page metadata and the authored strings (covers AC-1, AC-7, AC-8, AC-9)
  - [x] The sign-up agreement line and the honesty gate extended over all five pages (covers AC-10, AC-11)
- [x] Verify it: `/verify-release public page set`
- [x] Test it: `/test-engineer public page set`

### 16. Onboarding · needs a decision · GA
Today the wizard asks school level and subject, which is meaningless now. A first pass shipped: one question, year of study, then straight to uploading a note. Institution, faculty and course are deliberately not collected, because the schema holds one academic fact and a four question form loses signups before it starts. Research says ask institution, then faculty, then year, then courses, so treat that as the shape only if a later slice earns it.
**Done when:** the level only flow is the shipped default and takes under a minute, the level reaches the tutor and the readiness engine, it is skippable and correctable from settings, and any return to institution, faculty or course is a separate decision with its own spec.
- [ ] Design it (spec): `/solution-architect onboarding`

(basis: research/design-reference.md §1 · both local competitors identify students by WhatsApp number and not by email, and forty eight percent of signups were lost at one role question)

### 17. Pricing page · needs a decision · GA
Research is clear that a month to month subscription is the wrong shape here and that a semester pass around 2,500 XAF sits in the proven band. One local competitor's own pricing page shows identical bullets across three tiers, which the research calls the single biggest trust destroyer in this market. Ours will not ship that way.
**Done when:** the page shows genuinely different contents per tier, the semester is the default unit with the monthly equivalent shown as a secondary line, there is no auto renewal language anywhere, the payment gateway and both mobile money providers are named, and the free tier is described honestly rather than hidden.
- [ ] Design it (spec): `/solution-architect pricing page`

(basis: research/audience-and-market.md §8 · a proven consumer band of 1,600 to 5,000 XAF a month and a hard floor of 500 XAF and a ceiling of 18,500 XAF observed in the market)

### 36. Technical SEO foundation · needs a decision · GA
Today no page emits a social image, so every share into a WhatsApp group, which is how sharing actually happens here, renders with no picture. Six of seven public pages ship a secondary school description, three of them cannot even carry metadata because they are marked as client components, and there are no canonicals, no alternate language links, and one structured data component that is dead code. Authed pages are simultaneously blocked in robots and marked indexable, which is contradictory.
**Done when:** every public page emits a title, a description written for this audience, a canonical, a share image at the size WhatsApp wants and a Twitter card, the sitemap lists every public URL and nothing authed, one central rule keeps signed in pages out of the index without hiding pages we want, alternate language links treat English and French as separate markets rather than translations, and the structured data on each page is a type that genuinely applies.
- [ ] Design it (spec): `/solution-architect technical SEO foundation`

(basis: research/seo-and-rendering.md §1 and §3 · eight competitors ship zero structured data, so it is uncontested ground, and the WhatsApp share image is the single highest return fix in the set)

### 37. Public course and faculty catalogue · needs a decision · GA
This is the thing that wins the market. There is no university, faculty, department or course model in the schema today, everything hangs off a school level, and without it there is nothing for a student or a search engine to land on. The competitor ranked first for the main query has one page, no sitemap, no canonicals and no internal links. The market is winnable on structure alone.
**Done when:** a public indexable page exists for each university, each faculty, each department and each course, each names its parent in the chain and links sideways to its siblings, each is reachable from the sitemap and from internal links, each prerenders or caches rather than rendering per request, and the chain matches the taxonomy in feature 5.
- [ ] Design it (spec): `/solution-architect public course and faculty catalogue`

(basis: research/seo-and-rendering.md §2 and §8 · no search volume data is available at Cameroon level for any tool, so the strategy is deliberately built on structure and internal linking rather than on guessed keyword volume)

### 38. Public guides and study content · needs a decision
A full long form guide model already exists in the schema with markdown, and it has no public page and an API route that refuses anonymous requests, so a built asset is entirely invisible. Guides are how a student finds us, how they share us, and how an AI assistant quotes us. We do not need a public past paper archive, because there is none, so this is the content surface that carries first hand material instead.
**Done when:** a guide is published by an admin, appears on a public indexable page under the right course, is reachable from the sitemap and from the course page, is shareable with a correct preview, can be revised without a rebuild, and every passage is structured so an answer engine can quote it cleanly.
- [ ] Design it (spec): `/solution-architect public guides and study content`

(basis: research/seo-and-rendering.md §4 and §6 · first hand material nobody else has is the main lever for being cited by an answer engine, and keyword stuffing was measured as no help while citing sources and adding statistics gives a real lift)

### 39. GEO and AI answer readiness · needs a decision
Students increasingly ask an assistant instead of a search engine. The rules are specific and mostly opposite to the folklore: citing sources, adding statistics and quoting sources measurably help, keyword stuffing and an authoritative tone measurably do not. Allow the search bots for every provider and block the training bots, and note that each provider sends three distinct bots, not one.
**Done when:** the robots rules allow every AI search crawler and block every training crawler, the edge guard actually reaches those rules rather than short circuiting before them, the organisation and course entities are described consistently everywhere they appear, and we can see which of our pages get cited by an answer engine.
- [ ] Design it (spec): `/solution-architect GEO and AI answer readiness`

(basis: research/seo-and-rendering.md §4 · blocking the search bots has a named traffic cost while blocking the training bots has none, so the default is not to block)

### 40. Metadata and sharing cards · needs a decision · GA
Sharing happens over WhatsApp here, and WhatsApp reads the social image, not the Twitter one. The one page built specifically to be shared, the result card, has no metadata generation at all and an image with no declared size, so it shifts layout as it loads. Decide what a title and description say for this audience, whether social images are generated per course or per result, and at what size.
**Done when:** every shareable surface has an authored or templated title and description that name the university and the course rather than speaking in generalities, share images are the size WhatsApp renders without cropping, images declare their dimensions so nothing shifts as they load, and a share card is generated per course rather than per individual result.
- [ ] Design it (spec): `/solution-architect metadata and sharing cards`

(basis: research/seo-and-rendering.md §5 · the research recommends per course over per result, because per result is unbounded and a student's result is not what makes another student sign up)
