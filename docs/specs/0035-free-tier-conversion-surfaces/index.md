# 0035. Free tier conversion surfaces

**Date**: 2026-11-01
**Status**: In Progress

## Summary

Free must feel complete on its own and still point clearly to paid when limits arrive. This spec adds a soft invite at the moment value is proven plus a full upgrade page that reuses the same offer as public pricing. Notes stay readable for a student who never pays, only new quiz and Tip runs pause at the cap.

## Requirements

**User stories**:
1. As a free student, I want to study notes plus quiz plus Tip within clear daily counts so that I can trust free as useful on its own.
2. As a free student who hits a cap, I want to see what I used plus what weekly or semester adds plus prices so that I can decide fast.
3. As a student who just passed a quiz, I want a short invite to weekly or semester so that I see the next step at a proud moment.
4. As a student who never pays, I want my notes always readable so that free stays honest.
5. As the solo operator, I want limit plus prompt plus upgrade events visible without a manual query so that I can see what converts.

**Acceptance criteria**:
1. **AC-1**: Free allows 5 notes plus 10 quizzes plus 15 Tip messages a day plus 50 max thread length, enforced in code and printed in copy, unchanged from spec 0033.
2. **AC-2**: Every limit notice shows used count plus free cap plus weekly counts plus semester counts plus both prices with a link to the upgrade page.
3. **AC-3**: Upgrade invite appears after first passed quiz and again at any limit hit for quiz or Tip.
4. **AC-4**: At a quiz or Tip cap, new AI runs pause with a dismissible invite, while opening and reading own notes and uploads keeps working with no block.
5. **AC-5**: Upgrade page shows Free plus weekly plus semester from the resolved offer source, with weekly at 500 XAF and semester at 3000 XAF unless an admin override changes it, MTN shown first with Orange always present, same copy source as public pricing.
6. **AC-6**: Full counts plus prices show at most once per active day in Africa Douala time, later hits that day show a short link only, a dismissed prompt stays quiet until next active day then may remind once.
7. **AC-7**: Limit hit plus prompt shown plus prompt clicked plus prompt dismissed plus upgrade start are written as KpiEvent rows and visible to admin with no manual query.
8. **AC-8**: When the offer read or the event write fails, study stays usable on a cached offer, the event retries in background, upgrade action waits for a fresh offer read before starting payment.

## Decision

**Chosen option**: Option 1: Inline plus page on KpiEvent with server day check

Add one small authed event endpoint plus reuse of usage plus plans plus payment initiate, inline notice plus full upgrade page built with tokens plus shadcn plus TanStack Query, all prices and counts from the resolved offer read.

## Feature design

**Data model sketch**:
1. `KpiEvent`: id plus userId (foreign key to `User`, many to one) plus event (text, one of `limit_hit` or `prompt_shown` or `prompt_clicked` or `prompt_dismissed` or `upgrade_start`) plus metadata (Json, holds surface plus kind plus used plus cap, e.g. surface quiz plus used 10 plus cap 10) plus createdAt. Indexes on userId plus event plus createdAt already exist. No change.
2. `Subscription`: id plus userId (unique, foreign key to `User`, one to one) plus plan (`WEEKLY` or `PRO`) plus status (`PENDING` or `ACTIVE` or `FAILED`) plus amount (Int, whole XAF) plus fapshiTransId (unique, nullable) plus provider plus phone plus activatedAt plus createdAt. No change.
3. No new table. No migration. Resolved offer (prices plus counts plus credits) comes from the plan catalogue read with file fallback plus admin override decided in spec 0033.

**State transitions**:
1. Prompt: `hidden` to `full` on first qualifying moment of the active day (first passed quiz or first limit hit), `full` to `short` on later hits the same day, `short` to `hidden` on dismiss, `hidden` to `full` again next active day at most once as the gentle retry, then quiet until a fresh limit hit.
2. Cap: `under cap` to `at cap` when used reaches free count for quiz or Tip, `at cap` holds while invite shows, returns to `under cap` next day or on pass activation. Notes read has no cap state.
3. Payment states reuse spec 0034: `PENDING` to `ACTIVE` to clock end for `WEEKLY` (7 days) and `PRO` (5 months).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/prompts/event` | POST | event (one of limit_hit, prompt_shown, prompt_clicked, prompt_dismissed, upgrade_start), surface (quiz, tip, note), kind (quiz_limit, tip_limit, first_pass), metadata Json opt | ok true | session owner only | 400 bad event, 401 no session, 403 other user, 429 rate limited at 30 per hour |
| `/api/usage` | GET | none | free plus paid counts plus used plus caps plus creditCosts plus showFull plus resetsAt | session | 401 no session |
| `/api/plans` | GET | none | resolved tiers with prices plus counts plus credits | public with authed override | 500 on catalogue read fail |
| `/api/payment/initiate` | POST | plan (WEEKLY or PRO), phone, provider | paymentUrl plus transId plus status PENDING | session | 400 bad plan or phone, 401 no session, 429 rate limited |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Inline notice render | used count plus free cap | `/api/usage` read (derived from AiUsageEvent plus Note plus Quiz counts, note used counts uploads only) |
| Inline notice render | weekly counts plus semester counts plus both prices | `/api/plans` resolved offer (file catalogue plus admin override from spec 0033, shape holds notes plus quizzes plus Tip per day) |
| Inline notice render | full or short form | `/api/usage` carries showFull bool (server checks last `prompt_shown` or `prompt_dismissed` for this user today in Africa Douala time, dismissed today beats shown today, clicked never forces full) |
| First passed quiz trigger | pass event plus score | quiz attempt grade write (pass at 50 percent or more, once per quiz id) |
| Dismiss plus retry | quiet until next Douala day plus one reminder | last KpiEvent `prompt_dismissed` plus `prompt_shown` dates compared in Africa Douala time on server via shared lib day module |
| Upgrade page render | plan cards at route `/subscription` plus MTN first plus Orange present plus prices | `/api/plans` resolved offer reusing the public pricing card component, provider marks are static copy (MTN first, Orange present) |
| Upgrade start | upgrade_start event plus plan chosen | POST body plan from upgrade page click |
| Admin view | counts of limit plus shown plus clicked plus paid | admin metrics page grouping KpiEvent by event per day for last 30 days plus Subscription ACTIVE rows, paid means ACTIVE subscription |
| Resets at time | Douala reset clock label | shared lib day module computes next Douala midnight ISO plus clock label |
| Offer cache | cached prices when read fails | TanStack Query cache with 5 minute stale time, failed events wait in memory with one beacon retry |

**Key invariants**:
1. Notes read never blocks on free caps. Only new quiz generation and new Tip messages pause at cap. Upload of a new note burns one of 5 daily notes, open and read never burns, enforced at note create.
2. No screen prints Unlimited for any tier.
3. Prices plus counts on inline notice and upgrade page and public pricing read the same resolved offer. Copy cannot drift. Code uses `WEEKLY` and `PRO`, copy shows Weekly and Semester Pass.
4. Money stays Int whole XAF. Credits stay a separate balance meter, never folded into plan copy.
5. Prompt event writes never block study. Study works when analytics fails. Event POST allows 30 per hour per user, overage drops quiet with one background retry.
6. One full prompt per calendar day in Africa Douala time at most. Dismiss means quiet until next Douala day. Pass means score at or above 50 percent once per quiz id, retakes and reloads never retrigger. At cap, quiz and Tip create return 402 with upgrade code, thread max 50 stays a separate composer guard.
7. KpiEvent rows for prompt events are kept at least 60 days with no sampling, so prompt memory survives. Concurrent hits use first write wins per user plus event plus Douala day, second reads short.

**Security model**:
Student writes own prompt events only, server takes userId from session never from body, unknown id returns 404, other student row returns 403, no session returns 401. Admin reads aggregate counts for all users. No prompt endpoint returns other users data. Rate limits guard event POST plus status poll. No new secrets. No compliance scope beyond existing auth plus payment data owned by specs 0033 and 0034.

**Configuration required**:
None. No new env vars. Reuses existing plan catalogue plus platform settings plus Fapshi secret from spec 0034.

**Critical test scenarios**:
1. Happy path: free student passes first quiz then sees full invite with counts plus prices and link, verifies **AC-3** plus **AC-2**.
2. Happy path: free student hits Tip cap then sees soft pause with dismiss, notes still open, second hit same day shows short link only, verifies **AC-4** plus **AC-6**.
3. Failure case: offer read fails then page shows cached offer with retry and blocks only payment start, study keeps working, verifies **AC-8**.
4. Auth case: no session POST to event returns 401, student B POST for student A returns 403, verifies **AC-7** guard.
5. Data case: dismiss today then no full prompt until next active day in Douala time, then at most one retry, verifies **AC-6**.

## Build plan

Ordered as Tracer Bullet slices. Each slice runs end to end through UI plus API plus data and works before the next starts. No migration in any slice.

1. Thin thread: event endpoint plus inline notice plus upgrade page reuse. Add POST `/api/prompts/event` writing KpiEvent with first write wins per user plus event plus Douala day, carry showFull plus resetsAt on `/api/usage`, add inline notice component with counts plus prices plus link using tokens plus skeleton plus refresh bar, reuse public pricing card at route `/subscription` with MTN first marks, add shared lib day module for Douala midnight, satisfies **AC-2**, **AC-5**, **AC-7**.
2. Value triggers plus quiet rules. Wire first passed quiz trigger plus quiz cap plus Tip cap to the same notice, enforce once per day full plus short later plus dismiss quiet until next active day plus one retry, keep notes read open while AI runs pause, satisfies **AC-3**, **AC-4**, **AC-6**.
3. Proof plus hardening. Add admin counts view reusing KpiEvent grouping plus paid rate from Subscription, add cached offer fallback plus background event retry plus rate limits, add skeletons plus empty plus error states per loading rules, add tests for happy plus dismiss plus fail plus auth, satisfies **AC-1**, **AC-7**, **AC-8**.

## Consequences

**Positive**:
1. Free stays useful and honest, notes open builds trust while caps fund the service.
2. Every ask names the cap plus what paid adds plus prices, so the choice is clear at the moment of need.
3. No new table keeps build and ops cost low for a solo team, admin sees the funnel with no manual query.

**Negative / tradeoffs**:
1. Extra event read per prompt adds a small query on limit hits, plus background retries add write load.
2. KpiEvent doubles as product state plus analytics, so future complex journeys may need the dedicated table we skip now.
3. Once per day plus one retry is gentle by design, so some students who would pay on a harder push will wait.

**Neutral**:
1. Weekly at 500 XAF and semester at 3000 XAF stay owned by spec 0033. A price change there flows here with no code change.
2. Conversion analytics in scope row 32 can build on these same KpiEvent rows.

## Follow-up

1. [ ] Confirm upgrade page route holds the same resolved offer read as public pricing with no copied price map, to close scope row 45 dashboard reconciliation in the same build.
2. [ ] Confirm Douala midnight helper lives in one shared date module so prompt day plus usage day plus credit day agree.
3. [ ] Watch prompt fatigue after ship: if dismiss plus retry shows annoyance in counts, tune to limit hit only before adding more surfaces.
