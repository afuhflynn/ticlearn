# 0048. Marketing pages refresh

**Date**: 2026-11-04
**Status**: In Progress

## Summary

This spec refreshes the words on every public page so each claim matches what the app does today. It keeps the layout, the prices, the screenshots and the section order exactly as they are. It makes the free limits, the pass facts, the contact path and the search previews read from code values so pages cannot drift.

## Requirements

**User stories**:
1. As a stranger, I want every public page to promise only what the app does, so I can trust the product before I join.
2. As a student comparing plans, I want the free limits and the pass facts to match the enforced values, so the price feels fair.
3. As a student needing help, I want one working contact path on every page, so I know where to ask.
4. As the team, I want stale copy to fail the check, so it cannot ship by accident.

**Acceptance criteria** (the contract, each independently checkable):
1. **AC-1**: The landing, pricing, about, FAQ, contact, terms and privacy pages state only shipped behavior. No page names community, leaderboard, feedback, progress or affiliate surfaces. No page ships secondary school wording.
2. **AC-2**: The free tier bullets equal `FREE_LIMITS` in code (5 notes, 10 quizzes, 15 Tip messages a day, plus the credits line `200 starting credits, enough for 4 quizzes` from the Free catalogue entry). The Weekly Pass and Semester Pass bullets are printed verbatim from the paid catalogue entries in `constants/plans.ts` (Weekly: 10 notes, 20 quizzes from your notes, 50 Tip messages a day, `2,500 credits included for the week`; Semester: 100 notes, 300 quizzes from your notes, 200 Tip messages a day, `15,000 credits included for the semester`, plus the page trace line `Every quiz traces back to the page it came from`). The grid must import the entries, never retype them, so a catalogue change reaches the page with no copy edit.
3. **AC-3**: The Semester Pass price reads 3,000 whole XAF per semester from the plan catalogue (`PRO` entry, `priceXaf` 3000, rendered with `toLocaleString` plus FCFA plus the period label per semester from `periodLabelForPlan`), and the Weekly Pass price reads 500 whole XAF per 7 days from the same catalogue (`WEEKLY` entry, `priceXaf` 500, period label per 7 days). The monthly figure under the semester price shows only the derived estimate from `monthlyEstimateForPlan` in `lib/plans-display.ts` (per month rounded from price divided by `semesterMonths` 5, rendered as `about 600 FCFA a month (estimate), paid once`). The pricing heading and intro print `Paid once over MTN Mobile Money or Orange Money, with no card and no auto renewal`, matching the card footers which print `Paid once over MTN Mobile Money or Orange Money`. The legal billing stance stays in Terms section 6: paid features bill in advance at checkout prices, paid over MTN MoMo or Orange Money through Fapshi, stoppable at any time with no promised refunds.
4. **AC-4**: Every contact detail on every public page resolves from the two exports in `constants/contact.ts` (`WHATSAPP_GROUP_URL` for the href, `WHATSAPP_GROUP_LABEL` for the link text, currently `Join the WhatsApp group`). The WhatsApp group link is the only contact path. No email address, no phone number and no business hours promise appears anywhere. The contact page keeps its single card (WhatsApp icon, `Reach us on WhatsApp` heading, group button) and the FAQ keeps its closing WhatsApp section, both reading the same two exports.
5. **AC-5**: The landing page keeps its eight sections in the current order (hero, benefits, how it works, study loop, subjects, get started, FAQ, CTA band). No layout change, no section added or removed, no price change.
6. **AC-6**: Each public page keeps valid metadata from its live `metadata` export (title and description written for university students, plus canonical and share preview). The seven pages are `app/(marketing)/page.tsx` (landing, share image `/og/home.png`), `app/(marketing)/pricing/page.tsx`, `app/(marketing)/about/page.tsx` (share image `/og/about.png`), `app/(marketing)/faq/page.tsx` (share image `/og/faq.png`), `app/(marketing)/contact/page.tsx`, `app/(marketing)/terms/page.tsx` and `app/(marketing)/privacy/page.tsx`. Wording may be retuned to match new copy, structure stays as today.
7. **AC-7**: The marketing screenshots stay as the current WebP captures under `public/marketing/`, each with accurate alt text (the short text a screen reader reads). No new capture is required unless a shot no longer matches the app. A shot counts as stale when the screen it shows has visibly changed in the app (new layout, renamed controls, different copy); same pixel sizes on recapture.
8. **AC-8**: All pages in this set stay public and session free (readable without login). Signup and pay keep their current behavior: a signed out visitor who taps subscribe goes to `/sign-in?callbackUrl=/pricing` and returns after sign in, and a signed in student starts payment through `POST /api/payment/initiate` with the plan key and follows the returned link.
9. **AC-9**: `scripts/check-landing-honesty.mjs` covers the seven pages in this set (`/`, `/pricing`, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`) with the current rules (cut surfaces, currency amounts except the pricing page price, bare percentages, invented counts, phone numbers, plus the no email rule) and fails the check command on any violation. Amounts in FCFA or XAF pass only on `/pricing`; the banned surface list stays as coded in the script.

## Decision

**Chosen option**: Option 1: Fix words in place

The pages keep their structure and only the words change, with each number and promise tied to the code value that enforces it.

## Rationale

Reasoning and options: see rationale.md.

## Feature design

**Data model sketch**: none. No schema change, no migration. Copy stays in page files and section components. Numbers stay in `FREE_LIMITS` (`lib/plan-limits.ts`), plan facts stay in the plan catalogue (`constants/plans.ts`), contact strings stay in `constants/contact.ts`, FAQ pairs stay in `FAQ_ITEMS` (`constants/index.ts`).

**State transitions**: not applicable. These are static public reads with no stateful entity.

**API surface**: none new, none removed. The subscribe and payment reads keep their current shape. The honesty gate reads the built pages as before, extended to the full set.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| No endpoint change in this spec | Not applicable | Not applicable | Not applicable | Public reads need no session | Not applicable |

**Value sourcing** (every value each page shows, and where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Landing free line | Notes count, quizzes count, Tip messages per day | `FREE_LIMITS` in `lib/plan-limits.ts` |
| Landing Mobile Money line | MTN Mobile Money and Orange Money named, no price printed | Authored copy fixed in this spec, provider names only |
| Pricing free card | Free bullets with real numbers | `FREE_LIMITS` in `lib/plan-limits.ts` |
| Pricing pass cards | Weekly 500 whole XAF per 7 days; Semester 3,000 whole XAF per semester; derived rounded monthly estimate labeled as estimate under the semester price | Prices and periods from plan catalogue in `constants/plans.ts` (`WEEKLY` `priceXaf` 500, `PRO` `priceXaf` 3000, `semesterMonths` 5), rendered with `toLocaleString` plus FCFA plus `periodLabelForPlan` in `lib/plans-display.ts`, estimate from `monthlyEstimateForPlan` in the same file |
| Pricing pass bullets | Weekly counted limits and credit line; Semester counted limits and credit line, page trace line `Every quiz traces back to the page it came from` | Paid catalogue entries in `constants/plans.ts` printed verbatim by the pricing grid in `components/marketing/pricing-plans.tsx` |
| Pricing pay action | Signed out visitor sent to `/sign-in?callbackUrl=/pricing`; signed in subscribe posts plan key and follows returned link | `handleSubscribe` in `components/marketing/pricing-plans.tsx`, `POST /api/payment/initiate` |
| Any contact row | WhatsApp group link and label | `WHATSAPP_GROUP_URL` and `WHATSAPP_GROUP_LABEL` in `constants/contact.ts`, the single contact source |
| FAQ answers | Cost, data use, offline behavior, account help | `FAQ_ITEMS` in `constants/index.ts`, corrected to match Terms and Privacy stances |
| Legal pages | Billing in advance, provider names, AI processing disclosure, real third party list | Authored copy fixed in this spec, written to match the payment route (`app/api/payment/initiate/route.ts` through Fapshi), the AI gateway providers named in Privacy, and the email plus error reporting providers named in Privacy; Terms section 6 and Privacy third party list are the approved stances |
| Page metadata | Title, description, canonical, share image path | Per page metadata exports, retuned words only, structure unchanged |
| Honesty verdicts | Pass or fail per page | `scripts/check-landing-honesty.mjs` over the built public pages |

**Key invariants**:
1. Every number on a public page equals the code value that enforces it at the time of ship.
2. Every contact detail resolves from `constants/contact.ts`. No page hardcodes a link, an email or a phone number.
3. No public page states an amount except the pricing page price, and no page states a percentage, a student count or a reply time promise.
4. The landing section order and the pricing card structure do not change in this spec.
5. Pages stay public and session free. Auth behavior for signup and pay does not change.

**Security model**: the seven pages stay fully public with no session check. No unauthenticated free text sink is added. No personal data is collected on these pages. The AI processing line in Privacy stays an honest statement of an existing data flow (notes and chats sent to model providers to produce answers).

**Configuration required**: none. No new env vars, no new secrets, no new flags.

**Critical test scenarios** (each maps to an acceptance criterion):
1. Happy path: a stranger reads landing then pricing then signup, and every number matches code, verifies **AC-1**, **AC-2**, **AC-3**.
2. Truth sweep: the honesty script passes over all seven built pages, and a grep finds no email, phone, amount outside pricing, percentage or invented count, verifies **AC-4**, **AC-9**.
3. Contact: every page links the same WhatsApp group from the contact file, verifies **AC-4**.
4. Structure: the landing renders the eight sections in order with current screenshots and alt text, verifies **AC-5**, **AC-7**.
5. Metadata: each page serves its title, description and canonical in the first HTML (the bytes sent before scripts run), verifies **AC-6**.
6. Access: signed out reads succeed on all pages, signup and pay keep current redirects, verifies **AC-8**.

## Build plan

Tracer Bullet (the project default): a thin thread through words and the gate first, then thicken page by page. Each slice works before the next starts.

1. Stand up the thin thread. Correct the landing free line and the CTA band Mobile Money line to match `FREE_LIMITS` and the catalogue, extend the honesty script to all seven pages, and make the check fail on violation. Satisfies **AC-1**, **AC-2**, **AC-9**.
2. Align the pricing page words with the catalogue without touching structure. Fix bullets, price line, estimate label, provider names and no renewal copy. Satisfies **AC-2**, **AC-3**.
3. Correct the remaining five pages in place. About, FAQ, contact, terms and privacy keep components and order, only claims change, with contact rows all reading the contact file. Satisfies **AC-1**, **AC-4**.
4. Retune titles and descriptions to match the new words, keeping canonicals, sitemap entries (the list of pages for search tools) and share images (the preview cards for WhatsApp) in place. Satisfies **AC-6**.
5. Confirm screenshots and alt text against the current app. Keep the WebP captures unless a shot is stale, in which case recapture from the seeded demo with the same sizes. Satisfies **AC-7**.
6. Pin the numbers in tests. Add or update unit tests that assert free bullets equal `FREE_LIMITS`, pass bullets equal the catalogue entries imported from `constants/plans.ts` (import the constants, never snapshot the strings), and contact rows equal the two contact exports. Run lint, the UI check, the honesty gate and the full suite. Satisfies **AC-2**, **AC-4**, **AC-9**.
7. Verify access and the stranger path end to end. Public reads succeed without a session, signup and pay keep current redirects, and the landing to pricing to signup path reads clean. Satisfies **AC-5**, **AC-8**.

## Consequences

**Positive**:
1. Every public promise traces to something real, which is the core trust repair this market rewards.
2. Limits and prices cannot drift silently, because copy reads code values and the gate fails the build on violation.
3. No layout, price or screenshot review is needed, so the change stays fast to ship and easy to review.

**Negative / tradeoffs**:
1. Copy still lives in page files, so a future limit change needs a human to update words and run the gate. The team accepts file edits as the CMS.
2. Awkward sections stay awkward. Words that do not fit the current blocks must be shortened rather than reshaped.
3. The FAQ keeps its full length, so the curated landing view carries the visual cost of completeness.

**Neutral**:
1. Structured data (labels that help search tools understand a page), per course share cards and guide content stay owned by later scope items. Nothing here preempts them.
2. A future phone number or inbox swaps in at `constants/contact.ts` with no page edits beyond the gate.

## Follow up

1. [x] Enroll or link the matching scope row for this refresh so the spec status can mirror the feature (Proposed to In Progress to Accepted).
2. [x] Confirm the paid catalogue entry before the pricing copy lands. Confirmed 2026-11-04: Weekly Pass 500 XAF (10 notes, 20 quizzes, 50 Tip a day, 2,500 credits) and Semester Pass 3,000 XAF (100 notes, 300 quizzes, 200 Tip a day, 15,000 credits, page trace line). Copy must print these counted limits, never unlimited.
3. [ ] When a monitored inbox or a direct number exists, update `constants/contact.ts` in one place and rerun the honesty gate.
4. [ ] Watch the WhatsApp invite behind `WHATSAPP_GROUP_URL` for rot (expired or revoked invite breaks the only contact path on every public page at once). A periodic check that the link still resolves belongs with whoever owns uptime, not with this copy pass.
