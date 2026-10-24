# 0014. Landing page rebuild: rationale

The decision record for spec 0014. `/feature-build` does not read this file; it builds from `index.md`.

## Context

> ⚠️ Premise note: the topic arrived as a page rebuild, but the scope row that owns it carries an app wide audit and a demand to redesign the affiliate system, and the engineer's answers cut four product surfaces while we talked. One page cannot be honest while the app still ships four extra ones, so this spec keeps the landing page as the build and folds in only the cuts the page depends on. Two decisions are deliberately left out and named in Follow up: the affiliate invite only model, and pricing. The second one carries a real risk: a page that says nothing about money may convert worse for a student paying by the gigabyte, and that cost is knowingly accepted until feature 15 decides the price.

TiCLearn is a Next.js 16 App Router application on React 19 and Tailwind 4, used mostly on low end Android phones over congested networks where data is priced by the gigabyte. The product pivoted from a GCE secondary school exam platform to an AI study assistant for Cameroonian university and HND students. The pivot rewrote most of the copy, and the landing page was rebuilt once as part of it.

The page that exists today is a reasonable first pass and a poor shop window. It leads with a search style input but then spends its first screen on a feature strip, a "Buea and Bamenda universities" block, an app download claim of 150 MB that is false for a web app, and a phone number that looks invented. The mobile money logos and any price sit below the fold. It also promises community and leaderboard, which the audit shows are empty or duplicated.

The app behind the page is the real problem. The audit found four surfaces that do not serve the three jobs: community with no posts and a comment button with no handler, a leaderboard that repeats stats, a feedback page duplicating contact, and an affiliate programme any signed in user can join by loading a page. It found a readiness score that can never be computed because the only writer of its input is a dead route, fourteen API routes with no caller, seven components and seven hooks imported by nothing, a public primitive gallery and a public email preview route, and four broken links. It also found a real gap: `/notes` and `/attempts` are missing from the `proxy.ts` protected list, so those two pages only redirect on the client.

The supplied mockup (`public/TiCLearn Landing Page.png`) points at the right composition: left aligned hero, badge, headline with one italic serif phrase, filled action plus quiet secondary link, product panel on the right, and a numbered loop with circular icons. What it gets wrong is content: Review next, Topic practice 68% and Progress are the stat surfaces being removed, and its right hand panel is a designed interface rather than the real app.

## Options considered

### Option 1: Fix the page in place

Keep the current structure, move the money block above the fold, remove the false download claim, swap the phone number for WhatsApp, and trim the copy.

**Pros**: smallest change, no schema work, ships in a day.

**Cons**: leaves a page that promises community and leaderboard the app does not really offer. Leaves the readiness card, the dead code and the proxy gap untouched. Keeps a feature first fold, which is the weakest of the three shapes the research found.

### Option 2: Two Screens, with a local trust block

The first screen is a real question to Tip and a real screenshot of the running app beside it. Proof is the product output. Payment rails are named in words lower down. The app is cut back to the three jobs so the page stays true.

**Pros**: proves the product in one action, which is what the strongest AI products do; needs no invented numbers; a real screenshot cannot lie; the cut makes the whole app cheaper to run and explain.

**Cons**: no social proof at all, so the page asks the student to trust the product on sight; a real screenshot must be recaptured whenever the interface changes; the cut is destructive and irreversible.

### Option 3: Lecture Hall, editorial

Cream paper, ink, one oxide accent, Fraunces display with Inter body, numbered sections with hairline rules, one full bleed notebook scan captioned with the course and university.

**Pros**: reads like a printed course handbook, which is distinctive and calm; almost no motion and no images to maintain; ages well.

**Cons**: needs a real photographed notebook with consent, which we do not have; skews Western editorial and may feel abstract to the audience; hides the product behind typography when the product is the argument.

### Option 4: Market Day, warm local trust

Cream, clay and deep green, Bricolage Grotesque with Public Sans, price first, MTN yellow and Orange orange used as thin rules and small wordmarks, WhatsApp in the header, three named students.

**Pros**: speaks the local visual language without becoming a telecom advert if the operator colours stay as ink; price first is what local competitors do well; warm and human.

**Cons**: price first is impossible while pricing is being redesigned; three named testimonials need real students we do not yet have; the palette risks reading as a payments product rather than a study product.

## Rationale

Two Screens wins because the product is the only proof available. There is no user count that can be defended, no testimonials with consent, and no price to lead with, so the page has to show the loop: a real note, the questions it produced, and Tip answering with a page reference. That is also the pattern the research found at ChatGPT, xAI and Wise, where the hero either is the product or shows its output, and where every number is precise and sourced or absent.

The shape of the supplied mockup is kept because it solves a different problem well: a left aligned hero with a product panel is the composition that survives a 375 px screen and still fills a 1280 px one, and the italic serif phrase gives one authored accent without a second colour or a gradient. Its invented dashboard pieces are dropped because they would recreate the stat surfaces this change removes, and a fabricated panel is the fastest way to lose a student who signs in and sees something else.

Lecture Hall was the strongest runner up. It is the most distinctive of the three and the cheapest to run, but it needs a real notebook photograph and it argues in typography where this audience needs to see the tool. Market Day is the right direction for a later season, once real students, real testimonials and a decided price exist.

The cut is not decoration. A page that says notes, quizzes and Tip while the sidebar offers community, leaderboard, feedback and affiliate is a page that lies by omission, and the audit shows all four are empty or duplicated anyway. Cutting them first, in the tracer bullet order the project uses, means the page is designed against the app that will exist, not the one that does.

## Evidence

### Surface audit, 2026-10-23

- Cut: `app/(dashboard)/community`, `app/(dashboard)/leaderboard`, `app/(dashboard)/feedback`, `app/(dashboard)/affiliate`, `app/(dashboard)/progress`, `app/primitive-gallery`, `app/dev/email/[template]`.
- Kept against the audit's advice: `app/(dashboard)/attempts/[id]`. The cross check showed that cutting it leaves a past attempt with no address and the dashboard's last quiz card with nowhere to go, and one review page is not a stat surface.
- Simplify or remove: dashboard readiness card and sidebar badge, subscription GCE copy and dead invoice button, settings push toggle, about and FAQ pivot residue and false claims.
- Dead: fourteen API routes with no caller, seven components and seven hooks imported by nothing, links to `/practice`, `/quiz/[id]`, `/forgot-password` and `/cookies`.
- Data: `Post`, `Comment`, `PostLike`, `Feedback`, `Notification`, `RevisionGuide`, `KnowledgeChunk`, `TopicPerformance` have no live writer or no reason to exist. `TopicPerformance` was only ever written by a dead route, which is why readiness could never score.
- Security: `proxy.ts` `protectedRoutes` omits `/notes` and `/attempts`.

### Cross check, 2026-10-23

An independent read of the draft found three defects that were verified against the code before they were fixed.

- `proxy.ts` already redirects a signed in student from `/` to `/chat` in three places, so the spec had to re-point them, not just state a destination.
- `app/chat/page.tsx` reads only `note`, so the `?q=` the current landing page already sends was never read. The hero action we designed would have been broken on the shipped page.
- `lib/inngest/engagement-functions.ts` includes `topicPerformances` in the weekly digest query, so dropping that table would have broken a production job. The digest fix moved into this change.

It also found the attempt review route was needed as the one permalink into a past attempt, which is why it stays.
- Affiliate: `GET /api/affiliate` creates a payable `ACTIVE` affiliate row on first page load, 500 credits are paid at signup before email verification, the apply route updates outside its transaction so a double submit pays twice, and admin payout decrements `totalEarnings`. Full model reserved for its own spec.

### Design research, fetched 2026-10-23

- Brilliant: seven word headline, credential in the sub line, three proof cells straight under the fold, flat vector plus real screenshots, no 3D.
- Vercel: two word headline, one filled and one ghost action, one accent, one gradient asset used as a product visual. Measured screenshots at 27 KB mobile and 40 KB desktop.
- Linear: authored line breaks, 15 to 16 px body, logo wall then a labelled triptych, numbers inside prose.
- ChatGPT and Claude: one proves itself with an input in the hero, the other with no imagery and auth buttons only. Neither uses invented adjectives.
- xAI: two demo cards side by side, numbers with the operator before the number.
- eSoucoulou (Benin): sentence case headline, the constraint turned into the promise, a search field as the action, numbered journey, Mobile Money wordmarks in one plain line, WhatsApp support.
- uLesson: price in the hero, real phone number and `wa.me` in the header.
- Wise: the hero action is a working calculator, precision everywhere, footnoted claims.
- Duolingo: one headline, one button, one text link above the fold, one vector per section.
- Anti patterns observed in the wild: kkiapay serves a file named `Gemini_Generated_Image_*.png` as its hero; CinetPay serves placeholder avatar faces beside a ministry quote. Both are the failure mode this page avoids.

### Type and spacing decisions

Body 16 px at 375 px because Android zooms inputs under 16 px. Display `2.25rem` at 375 px gives about eighteen characters per line, so the mobile headline must stay under eight words. One serif italic accent only, one accent colour, section padding 3, 6 and 8 rem, spacing on the 4 to 128 scale only.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, the design system rule, the loading state rule, the data flow convention and the proxy guard rule.
- `docs/design-system.md`, the tokens and the mobile first breakpoints.
- `docs/specs/0012-rendering-strategy-and-streaming-boundaries/index.md`, the static public page and client island rule, and the note that row 14 owns the landing hero.
- `docs/specs/0013-loading-states-and-perceived-speed/`, the perceived speed measurement that already moved the landing page largest contentful paint from 1076 ms to 668 ms.
- `docs/scope/market.md` row 14, the intent, the done when list and the audit note.
- `public/TiCLearn Landing Page.png`, the supplied composition reference.
- `prisma/schema.prisma`, `lib/plan-limits.ts`, `proxy.ts`, `lib/dashboard-data.ts`, `app/not-found.tsx`.

**Practices & standards**:
- One accent colour, no decorative gradient, no generated hero image, no stock photography.
- Proof must be either the product itself or a precise sourced number, never a bare count.
- Static server rendering with one client island for public pages, per spec 0012.
- Destructive migration taken with a backup and a short window, per the database migration sequence rule in the enhancement mode.
- WCAG AA contrast, 44 px minimum tap target, visible focus, reduced motion respected.

**Links** (web verified during the design research on 2026-10-23):
- Vercel: https://vercel.com
- Linear: https://linear.app
- Brilliant: https://brilliant.org
- ChatGPT: https://chatgpt.com
- Claude: https://claude.ai
- xAI: https://x.ai
- Wise: https://wise.com
- Duolingo: https://duolingo.com
- eSoucoulou: https://esoucoulou.com
- uLesson: https://ulesson.com
- kkiapay: https://kkiapay.me
- CinetPay: https://cinetpay.com
