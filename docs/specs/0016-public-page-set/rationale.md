# 0016 · Public page set — rationale (decision record)

**Status**: mirror of the spec status line in `index.md`

## Context

Scope feature 15 (`docs/scope/market.md`) names the bar: every public page carries working contact details and correct university metadata, the FAQ answers what students ask about cost, data use and offline access, and the contact form is escaped and rate limited. The escaping and the rate limit already landed in the security feature, and the earlier rendering feature rebuilt the page shells. What remains is the truth of the words on the page, and that is now the last gap in the set.

**What is false today.** The contact page and two legal pages publish `hello@ticlearn.com`, an inbox nobody monitors. The FAQ promises a "Forgot Password" flow that does not exist anywhere in the auth code, and opens "Monday through Friday during business hours" on a support team with no published hours or staff. Terms promises monthly billing, a 7 day refund and an open affiliate program, all three of which the roadmap overturned (the scope moved to semester passes, and affiliates became admin managed invites in feature 43). The About page claims "we serve thousands of students", names a community product that was cut, and dreams of Central Africa. Privacy claims encryption at rest and a promise to notify by email that the product cannot honour. Every one of these is the exact failure mode the market research named: the ones with dead links and unowned claims lose trust immediately, and the audience is students deciding whether to pay.

**The honesty bar already exists.** Spec 0014 gave the landing page a rule set and a build gate, `scripts/check-landing-honesty.mjs`, that fails on banned words, currency amounts, bare percentages and phone numbers. The five public pages sit outside that gate, so stale or invented claims can creep back in without a build ever noticing.

**The contact channel reality.** Per the engineer, the single staffed channel is the WhatsApp group link already held in `constants/contact.ts` (added by spec 0014 AC-9). No monitored email inbox exists. A `wa.me` deep link that opens with a pre-filled message needs a phone number, which the product does not have yet; a group invite link cannot carry pre-filled text. So the pre-fill intent lands as copy guidance today, and the constant stays the one place to swap in a `wa.me` link later.

**Boundaries set during the conversation.**

- Page titles and descriptions are in this feature. Canonicals, share images, the sitemap and structured data stay with feature 36 (technical SEO) and feature 39 (GEO and answer readiness).
- A real sign in password reset flow is a separate decision; the FAQ stops pointing at a flow that does not exist.
- English only; French localisation stays deferred at scope level.

## Options considered

### Option 1: Fix in place, content in code (chosen)

Keep the current page components and the constants pattern. Rewrite copy inside the existing server pages and `constants/index.ts`, delete the contact form path, restyle the shared accordion for both surfaces, and extend the honesty gate.

**Pros**:

- Smallest change against a system that already works; the shells, rendering strategy and rate limiting from earlier specs stay intact.
- No new runtime, no new tables, no CMS to operate; copy changes are reviewed in git like code.
- Matches spec 0014's proven pattern (content in code, gate enforced in CI).

**Cons**:

- Every copy change needs a deploy; non technical editors cannot touch the FAQ.

### Option 2: Move public copy to markdown files

Follow the prompt registry pattern of spec 0002: markdown with front matter under a content folder, read at runtime or build time.

**Pros**:

- Legal and FAQ prose reads and diffs like a document; slightly friendlier to review.

**Cons**:

- Introduces a second content home for one feature while the constants pattern already works; two competing patterns for the same job is the drift this repo watches for.
- Still needs a deploy on change, so it buys little over Option 1.

### Option 3: Admin editable FAQ and legal pages in the database

New models, admin routes and a plain text editor, so the team can edit copy from the console.

**Pros**:

- No deploy to fix a typo; the FAQ answers could carry AI generated revisions the admin accepts.

**Cons**:

- The heaviest option by far: schema, auth, admin UI, escaping, caching and indexability concerns for work the engineer does not need today.
- Legal text should change rarely and deliberately; a database input invites quick unreviewed edits to a policy page.

## Rationale

The engineer's direct choices settled most of the shape: five pages only, WhatsApp group as the only staffed channel, the About page under the landing honesty bar, terms deliberately minimal, privacy disclosing the AI processing, the FAQ set kept at 18 with truth fixes rather than pruned, the sign-up agreement line added, and the contact form removed outright. The form removal also deletes the one unauthenticated endpoint that turned public text into email, which resolves the contact security concern for good rather than patching it.

Where I made the call: on the pre-filled WhatsApp link, a group invite link cannot carry a message, so the deliverable today is the explained contact copy plus a single constant ready for a `wa.me` link (runner up: leave the raw group link with no intent copy, rejected because the contact page then answers nothing). On the accordion, the permanently open answers came from `forceMount` interacting with Radix's closed state, so the fix keeps `forceMount` (which is what holds the answers in the served HTML) and controls the collapsed item's visibility with state based styling instead of swapping to a second accordion pattern (runner up: native HTML `details` elements, rejected because it would create a second accordion alongside `components/ui/accordion`, the duplication this repo forbids). On the FAQ set size, the design research favours 5 to 8 items on a landing, but the engineer chose to keep all 18 on `/faq`; the landing therefore carries the curated 6 and the page keeps the full set, which satisfies both.

## References

**Project sources** (verifiable, in this repo):

- Root `AGENTS.md`, the loading state and route guard conventions, and `app/api/AGENTS.md` for the route removal shape
- `docs/scope/market.md` feature 15, the done when this spec implements
- Spec 0014 and 0015, the honesty rules and the landing page structure this FAQ redesign joins
- Spec 0012, the public page server shells, indexability bar and the open value sourcing follow-up this table closes
- Spec 0002, the pattern Option 2 would have followed
- `docs/research/audience-and-market.md` and `docs/research/seo-and-rendering.md`, the dead link and stale metadata findings that motivated the truth sweep
- `docs/design-system.md`, the tokens and section conventions the accordion restyle follows

**Practices & standards**:

- WhatsApp first support channel for Cameroon (the HEQA pattern in the email research: WhatsApp is the front door, contact form is post launch)
- Honesty driven marketing: every published claim must be defensible, enforced in CI
- Progressive disclosure restraint on commercial pages (single column accordion near the buying decision)
- Legal copy discipline: policy pages state only what the system actually does
