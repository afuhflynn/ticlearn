# 0016. Public page set brought to the truth bar

**Date**: 2026-10-24
**Status**: In Progress

## Summary

The five public pages, About, FAQ, contact, Terms and Privacy, already exist but tell a story the product stopped telling. This feature rewrites their copy to say only what is true today, publishes the WhatsApp group as the one working contact channel, and removes the contact form and its unauthenticated email jobs entirely. The FAQ on the landing page moves next to the signup push and becomes a modern, clean, single column accordion with 6 curated questions, and the full `/faq` page keeps all 18 with every false claim corrected. No database work happens in this feature; all copy stays in code.

## Requirements

**User stories**:

- As a prospective student, I want every public page to publish only contact details and claims that are true, so that I can trust the product before I sign up.
- As a prospective student, I want the landing page's questions answered cleanly in one column near the signup push, so that cost, data and payment doubts are settled where I decide.
- As a signed up student, I know where to get help: the WhatsApp group that is linked everywhere.
- As the operator, I want no unauthenticated endpoint that turns public input into an email to me, so that no spam or injection surface remains.

**Acceptance criteria** (the contract; each independently checkable):

- **AC-1**: Each of the five pages exports its own `metadata` with a title and a description written for Cameroonian university and HND students. No page ships a GCE, secondary school or other old product description, and no page relies only on the layout fallback.
- **AC-2**: Every contact detail published anywhere in the public set (contact, FAQ, About, Terms, Privacy, footer, not found, sign-up line) traces to `constants/contact.ts`. No email address (the footer's `ticsummit.org` address counts, it is not only `hello@ticlearn.com`), no phone number and no business hours promise appears in any public page.
- **AC-3**: The full FAQ question set survives (all 18 questions stay) and every answer is true today: the reset answer points to WhatsApp, no answer promises a refund the Terms do not make, no answer claims encryption or sharing behaviour the Privacy page contradicts, the support answer names the WhatsApp group, and the two answers that carry gate banned words ("quiz scores are private", the data security one) are reworded to say the same true thing without the keyword.
- **AC-4**: The landing FAQ is a single column accordion at the content width the design system uses for text sections, with medium weight questions, thin row separators, one chevron marker, no cards and no filled backgrounds. It shows exactly these 6 questions from `FAQ_ITEMS`: "What is TiCLearn?", "Is TiCLearn free to use?", "What payment methods do you accept?", "How much data does TiCLearn use?", "Can I use TiCLearn offline?", "Is my data secure?". The accordion sits beside the CTA band rather than mid page, keeps the existing section anchor `#faq` working, and ends with a "more questions" row that links WhatsApp.
- **AC-5**: The `/faq` page uses the same accordion treatment, renders every question and answer into the served HTML, opens exactly one answer on tap and closes it again on a second tap. `forceMount` stays in place (that is what keeps the answers in the served HTML) and the permanently visible bug is fixed by governing the collapsed item itself: hidden content is controlled with state based styling on the collapsed item, not by unmounting the content.
- **AC-6**: The contact form and its whole path are removed: the `ContactForm` component, the `/api/contact` route, its tests, the `ContactFormData` type, and the `admin-feedback-alert` template if nothing else uses it. The contact page becomes a WhatsApp first card (the group link plus plain copy explaining how to ask and what happens next), with no unauthenticated request endpoint left behind. `ADMIN_EMAIL` is no longer consumed here; its remaining uses live elsewhere.
- **AC-7**: Terms carries the minimal money stance: paid features bill in advance at the prices shown at checkout, MTN MoMo and Orange Money are named, and there is no billing period promise, no refund policy, no affiliate section and no price figure. The contact section points to the WhatsApp group. "Last updated" is a static authored date, not a rendered clock.
- **AC-8**: Privacy discloses in plain language: what is collected (account, uploaded notes, chats with Tip, usage, device), that uploaded note content and chat text are sent to AI service providers to produce study answers, the real third party list (content storage, database, payment processor, email sender, error reporting, AI providers), retention and deletion requests through WhatsApp, and no claim the product cannot back (no encryption at rest claim, no "we will notify you of changes" promise). Static authored "Last updated" date.
- **AC-9**: About obeys the landing honesty rules: no invented student numbers, no community or leaderboard surfaces, no unverifiable territory claims. It keeps a true mission and story, and its closing actions are sign up and WhatsApp.
- **AC-10**: `scripts/check-landing-honesty.mjs` extends to all five public pages, applying the same rules (cut surfaces, currency amounts, bare percentages, invented counts, phone numbers), plus a check that no email address or `mailto:` link survives anywhere (this is scheme and shape, not one exact string, because the footer publishes a second address today). Two boundaries on the extension: the gate drops its canonical page rule for the five, because canonicals are feature 36's work, and the answers on `/faq` are reworded to not need any banned keyword rather than the gate growing an allowlist. A violation fails the check command.
- **AC-11**: The sign-up page carries a one line note under the form, "By creating an account you agree to our Terms and our Privacy policy", with both links going to the public pages.
- **AC-12**: The two `last updated` dates and every WhatsApp label used in the set resolve from one place per value (authored date strings in the pages, WhatsApp strings in `constants/contact.ts`), so no two pages can drift.

## Decision

**Chosen option**: Option 1: fix in place with content in code, plus removal of the contact form path.

**Implementation skills**: none used; the design conventions come from `docs/design-system.md` and specs 0014 and 0015 inside the repo.

## Feature design

**Data model sketch**: none. No schema change, no migration. The FAQ questions stay in `FAQ_ITEMS` in `constants/index.ts`; the WhatsApp strings stay in `constants/contact.ts`; the terms and privacy prose stays in their page files; the About copy stays in its page file.

**State transitions**: not applicable; there is no stateful entity in this feature.

**API surface**: one removal, none new.

| Endpoint | Method | Change | Notes |
|---|---|---|---|
| `/api/contact` | POST | deleted | The unauthenticated mail-to-admin path disappears with the form. No replacement endpoint. |

**Value sourcing** (every value a page displays, and where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Any public page contact row | WhatsApp URL and label | `constants/contact.ts`, already the single source since spec 0014 AC-9 |
| Contact page card | How to ask and what happens next | authored copy fixed in this spec, under Contact page copy below |
| Marketing footer | Contact detail rows | `constants/contact.ts` plus the WhatsApp row; the footer's email row is deleted |
| `/faq` answers | The 18 question and answer pairs | `FAQ_ITEMS` in `constants/index.ts`, corrected in place |
| Landing FAQ questions | The curated 6 | a named subset selection of `FAQ_ITEMS` (by question string) inside `components/marketing/landing/faq-section.tsx` |
| FAQ closing rows on both surfaces | WhatsApp link | `constants/contact.ts` |
| Terms and Privacy money and data claims | Billing stance, AI disclosure, third party list | decided in this spec, authored as page copy; the third party list is written to match what `lib/prisma.ts` (Neon), UploadThing, the Fapshi webhooks, `lib/email/` and the AI chain in `lib/ai/instances.ts` actually do |
| Legal "Last updated" | Authored date string | static text in each page, AC-12's one place per value |
| Page metadata | Title and description per page | per page `metadata` exports written for the university audience |
| Sign-up agreement line | Links to `/terms` and `/privacy` | static authored line on the sign-up page |
| Honesty gate verdicts | pass or fail per page | `scripts/check-landing-honesty.mjs` fetching each of the six built pages (landing plus five) |

This table also closes the follow-up observation spec 0012 left open: the sources `AC-9` and `AC-14` there depend on, and the answers behind the `/faq` description, are now named here instead of being left aspirational.

**Page metadata strings** (AC-1 builds to these exact strings; the builder copies them rather than inventing fresh ones):

| Page | Title | Description |
|---|---|---|
| About | About TiCLearn · Tic Foundation | Who builds TiCLearn, and why university students in Buea and Bamenda study their own lecture notes with Tip. |
| FAQ | FAQ · Cost, Data Use and Offline Access | Answers Cameroonian university students ask most: what TiCLearn costs, how much data it uses, and whether it works on a weak connection. (keeps today's strings) |
| Contact | Contact TiCLearn | Questions about TiCLearn? Reach the team on WhatsApp. |
| Privacy | Privacy Policy · TiCLearn | How TiCLearn handles your account, your notes and your chats, and who processes them. |
| Terms | Terms of Service · TiCLearn | The rules for using TiCLearn: accounts, uploads, chats and paying with MTN MoMo and Orange Money. |

**Contact page copy** (the WhatsApp card's authored lines, AC-6 builds to this wording):

- Card heading: "Reach us on WhatsApp"
- Card body: "The fastest way to get help is the TiCLearn WhatsApp group. Say hello, and tell us what you are stuck on. A person reads it, not a bot."
- Under the card: "For account recovery and anything private, WhatsApp is the only channel we answer from today."

**Last updated strings** (authored once per page, AC-7 and AC-8 build to this, shared to stay in sync):

- Both legal pages carry exactly: "Last updated: 24 October 2026"

**Key invariants**:

- Every public contact detail resolves from `constants/contact.ts`. No other page hardcodes a WhatsApp link, email or phone.
- No unauthenticated route accepts free text and sends it anywhere.
- No public page states an amount, percentage, student count, phone number or reply-time promise.
- Answers to FAQ questions render into the served HTML on `/faq` and the landing (spec 0012's indexability bar holds).

**Security model**: the five pages stay fully public and session free. Removing `/api/contact` deletes the last unauthenticated free text sink in the public set (the honeypot and rate limit protections become moot with the route). No compliance scope applies that the disclosure does not already state; the AI processing line is the honest statement of an existing data flow.

**Configuration required**: none. `ADMIN_EMAIL` stays in the environment for its other consumers and is simply no longer read here; the env documentation notes the change.

**Critical test scenarios** (each maps to an AC):

- Happy path: the built `/faq` page renders all 18 questions, every answer in the HTML, one open at a time, closing row links WhatsApp, verifies **AC-3**, **AC-5**
- Truth sweep: grep or the honesty scan finds no email address, phone, amount, percentage, invented count, banned surface or business hours promise across the six built public pages, verifies **AC-2**, **AC-9**, **AC-10**
- Removal: no import of `ContactForm`, no `/api/contact` handler, no `ContactFormData`, and the contact page renders the WhatsApp card, verifies **AC-6**
- Legal stance: Terms and Privacy carry no refund promise, no billing period, no affiliate section; each has a static date and its own `metadata`, verifies **AC-1**, **AC-7**, **AC-8**, **AC-12**
- Sign-up: the agreement line renders under the form with working links, verifies **AC-11**

## Build plan

Tracer Bullet (the project default): each slice goes through content, design and tests and works before the next starts; no schema layer exists here.

1. [x] Restyle the shared accordion into the single column treatment (content width, medium weight questions, thin separators, rotating chevron, no cards) and fix the open and close behaviour so only the tapped answer shows and answers still render in the served HTML. It serves both `/faq` and the landing, satisfies **AC-5**, defines the pattern for **AC-4**
2. [x] Correct `FAQ_ITEMS` in place: reset answer points to WhatsApp, support answer names the group and drops business hours and email, refund and data security answers align with the chosen Terms and Privacy stances, no leaderboard answer drops the gate banned wording, verifies **AC-3**, **AC-12**
3. [x] Rebuild the landing FAQ as a single column of 6 curated questions beside the CTA band with a WhatsApp closing row, keeping the `#faq` anchor, satisfies **AC-4**
4. [x] Delete the contact form path and rebuild the contact page: delete `ContactForm`, `/api/contact` and their tests (`tests/app/api/contact.test.ts`, `tests/components/marketing/contact-form.test.tsx`), rewrite `tests/app/(marketing)/contact/page.test.tsx` (it asserts the email exists today), delete the `admin-feedback-alert` template registration in `lib/email/templates/index.ts`, its subject entry in `lib/email/content/subjects.ts` and its render test in `tests/lib/email/templates.test.ts`, remove the `contact.send()` wrapper in `lib/api-client.ts` and `ContactFormData` in `types/index.ts`, delete the footer's email contact row, and rebuild the contact page as the WhatsApp first card with the authored copy above, satisfies **AC-2**, **AC-6**
5. [x] Rewrite Terms under the minimal money stance with a static last updated date, satisfies **AC-7**
6. [x] Rewrite Privacy with the AI processing disclosure, the truthful third party list and the claims you can back, satisfies **AC-8**
7. [x] Rewrite About under the landing honesty rules with sign up and WhatsApp as the closing actions, satisfies **AC-9**
8. [x] Add per page `metadata` to Privacy and Terms and retune the descriptions on About, FAQ and contact for the university audience, satisfies **AC-1**
9. [x] Add the sign-up agreement line with both links to `app/(auth)/sign-up/page.tsx`, satisfying **AC-11**
10. [x] Extend `scripts/check-landing-honesty.mjs` to cover all five pages plus the no email rule, and fix whatever it catches; run `pnpm lint`, `pnpm ui:check`, the honesty gate and the full test suite, satisfies **AC-10**

## Consequences

**Positive**:

- Every public claim traces to something real; the dead inbox, the phantom reset flow and the invented promises are gone, which is the trust problem the market research put at the centre of this market.
- The public set loses its last unauthenticated free text sink, closing the injection and spam surface rather than guarding it.
- One accordion pattern serves the landing and the FAQ page, and the honesty gate now covers everything a stranger can read.
- The scope bar for feature 15 (working contact details, honest FAQ, safe and rate limited contact path) is met, and the "escaped and rate limited" part is fulfilled by removal.

**Negative / tradeoffs**:

- Copy changes now require a deploy; the operator accepts git as the CMS.
- The FAQ page keeps 18 questions, more than the restraint pattern the design research recommends; the engineer chose completeness, and the curated landing view absorbs the visual cost.
- With JavaScript disabled the FAQ answers sit in the HTML but visually collapsed (the accordion is a client island), a small step back from the pre-fix no-JS reading state; the words remain crawler readable and 0012's indexability bar is what is kept.
- The real password reset gap stays open; the FAQ honestly routes access problems to WhatsApp in the meantime.
- Without a form, strangers with an email but no WhatsApp account have no written path into the team.

**Neutral**:

- Structured data, canonicals, share images and the sitemap remain features 36 and 39; nothing here pre-empts them.
- A future `wa.me` number swaps in at `constants/contact.ts`; the pre-filled message copy is already written to benefit from it.
- The honesty gate fetches six pages now, so the check command gets slightly slower.

## Follow-up

- [x] The scope anomaly found during pre-flight is repaired at spec capture: the index at `docs/scope/index.md` wrongly marked feature 15 `done`; it now reads `in-progress`, matching the epic row this spec links.
- [x] The "NOTE: Forget about the instructions above" block in `docs/scope/platform.md` feature 42 was checked while enrolling the follow-up features below. It is not an unresolved instruction: the scope file already carries the team's settlement of 2026-10-21 under it. No action needed beyond leaving the block as history.
- [x] The sign in password reset flow is enrolled on the scope as feature 44 (`docs/scope/platform.md`, from spec 0016). The FAQ's honest WhatsApp wording holds only until that flow exists.
- [ ] When a monitored inbox or WhatsApp phone number exists, update `constants/contact.ts` in one place and the pages inherit the truth.
- [ ] Wiring `FAQSchema` for answer engines belongs to feature 39 (the component exists as dead code at `components/seo/FAQSchema.tsx`).
