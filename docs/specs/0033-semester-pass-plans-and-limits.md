# 0033. Semester pass plans and limits

**Date**: 2026-10-31
**Status**: In Progress

## Summary

This spec sets Free plus a 7 day weekly pass plus a 5 month semester pass as the only offer, with generous bounded counts and no Unlimited wording anywhere. Free grows to 5 notes plus 10 quizzes plus 15 Tip messages a day so habit forms first. Weekly sells at 500 XAF with 2500 credits, semester at 3000 XAF with 15000 credits, each purchase running its own clock from payment time.

## Context

The catalogue today sells Free plus four monthly style tiers, with PRO as a semester pass at 2500 XAF. Copy prints Unlimited for notes plus quizzes plus Tip on the top tiers, while spend still draws down a credit balance capped at 12000, so the promise and the meter disagree. The public page from spec 0019 promises 2500 for the semester, the dashboard still sells monthly tiers, and students who compare surfaces see two offers.

Payment runs as a one time Mobile Money transfer through Fapshi (a payment provider), with MTN first and Orange always present. A PIN timeout today reads as an error, a pending payment shows no recheck action, and a missed webhook leaves a paid student locked. Payout for affiliates drops the lifetime total when it pays, attribution needs a verified email, and no open route may create an affiliate row.

The team is solo plus agents, the win is conversion rate within the first month, and the audience is Anglophone university students first, living mostly on 15000 to 25000 XAF a month with a phone first study habit. Free must work alone, the upgrade must feel light like airtime, and hardship must resolve through referrals, not through locked notes.

## Requirements

**User stories**:
- As a student, I want to see Free plus weekly plus semester with plain counts, so I can judge what a pass adds.
- As a student with little cash, I want a 500 XAF weekly pass, so I can pay a small first PIN before I trust the semester.
- As a student who paid, I want a clear paid state plus a receipt plus a transaction id, so I trust the purchase when the phone prompt is slow.
- As the solo operator, I want one catalogue plus editable prices and limits with an audit log, so copy can never drift from enforcement.

**Acceptance criteria**:
- **AC-1**: Only Free plus WEEKLY plus PRO (the semester pass) are for sale, with monthly tiers hidden from sale but still honored for old active subs.
- **AC-2**: Free allows 5 notes plus 10 quizzes plus 15 Tip messages a day plus 50 max thread length, enforced in code and printed in copy.
- **AC-3**: WEEKLY allows 10 notes plus 20 quizzes plus 50 Tip messages a day for 7 days, enforced and printed.
- **AC-4**: PRO allows 100 notes plus 300 quizzes plus 200 Tip messages a day for 5 months, enforced and printed.
- **AC-5**: No student facing screen prints the word Unlimited for any tier.
- **AC-6**: WEEKLY sells at 500 XAF with 2500 credits awarded once per subscription row, PRO sells at 3000 XAF with 15000 credits awarded once per subscription row.
- **AC-7**: Each purchase runs its own clock from payment time, 7 days for WEEKLY and 5 months for PRO.
- **AC-8**: Upgrade prompt appears after the first passed quiz and again at any limit hit, naming the limit plus what weekly or semester adds.
- **AC-9**: Payment initiate reuses one subscription row per user with PENDING to ACTIVE to FAILED states, webhook uses the stored amount, retry never double grants, and a status poll lets the app recheck a pending payment with webhook as truth.
- **AC-10**: Receipt arrives by email plus in app paid state shows transaction id for support.
- **AC-11**: Prices plus limits are editable by admin with an audit log, reads fall back to the file catalogue when no override exists, and every surface reads the same resolved offer.
- **AC-12**: Attribution needs a verified email, one active pass per user, self referral never pays, signup award cannot double pay on retry, and rate limits guard initiate plus poll.
- **AC-13**: Payout moves REQUESTED to PAID and clears pending only, lifetime total stays intact, partner screens never show referee emails.
- **AC-14**: Limit hit plus upgrade start plus paid success plus pending to paid rate plus per student AI cost in XAF are tracked and visible to admin with no manual query.

## Options considered

### Option 1: Bounded counts with weekly plus semester

Add a WEEKLY plan key, keep PRO as the semester pass, retire monthly tiers from sale, write generous bounded caps into limits and copy, raise semester to 3000 XAF, and add poll plus receipt plus admin editable overrides.

**Pros**:
- Matches the small plus semester shape the engineer picked, with a low first PIN
- Promise equals meter, so trust holds on compare
- Purchase clock needs no school calendar job

**Cons**:
- Changes the 0019 promise of 2500, so the page needs a price update and a note for early buyers
- Admin editable overrides add audit and fallback logic a file only catalogue would skip

### Option 2: Keep Unlimited inside and hide it in copy

Keep the minus one sentinel for large caps, change only the words on the page, keep prices at 2500.

**Pros**:
- Smallest code change, no limit migration
- Keeps the 0019 price promise intact

**Cons**:
- Promise still disagrees with the credit meter, so heavy use hits a hidden ceiling
- AI cost stays open ended on the top tier, which breaks the margin story

### Option 3: Free plus semester only at 2500

Keep the 0019 shape exactly, no weekly pass, no price change.

**Pros**:
- No migration, no price update, least work for solo build

**Cons**:
- No low entry point, so the first PIN stays high for cash short students
- Misses the airtime like feel the engineer asked for

## Decision

**Chosen option**: Option 1: Bounded counts with weekly plus semester

Weekly plus semester with bounded counts, purchase clock, poll plus receipt, and admin editable overrides with audit.

## Rationale

The engineer picked small plus semester, richer free, generous counts, purchase clock, 500 weekly, 3000 semester, prompt after first win, weekly plus PRO keys, bounded all, poll plus webhook, admin editable, one offer everywhere, email plus in app receipt, verify plus limits, support led refund, and full money trail. The one place judgment overrides the file only instinct is admin editable overrides. A file only catalogue is simpler, but the solo operator needs to adjust counts without a code change when AI cost moves, so an override with audit and file fallback is worth the extra logic. Raising semester to 3000 breaks the 0019 promise of 2500, which is called out in Consequences with a remedy. Bounded caps win over hidden Unlimited because the audit showed the meter already caps spend, so honest counts keep trust and keep cost provable.

## Feature design

**Data model sketch**:
- Plan catalogue in `constants/plans.ts`: keys FREE plus WEEKLY plus PRO, each with label plus priceXaf plus period plus credits plus features list. WEEKLY priceXaf 500 period 7 days credits 2500. PRO priceXaf 3000 period 5 months credits 15000. Monthly keys stay in code but flagged not for sale.
- Plan limits in `lib/plan-limits.ts`: same shape PlanLimits with pdfUploads plus quizGenerations plus aiTutorMessages plus maxConversationMessages. FREE 5 plus 10 plus 15 plus 50. WEEKLY 10 plus 20 plus 50 plus 100. PRO 100 plus 300 plus 200 plus 500. STANDARD plus STARTER plus PREMIUM rows stay for old subs. No tier uses the minus one sentinel for sale tiers.
- Subscription: existing table reused, one row per user (`userId` unique), fields plan plus status plus amount plus fapshiTransId plus activatedAt. States PENDING to ACTIVE to FAILED.
- PlanOverride (new): id plus planKey plus priceXaf nullable plus limits JSON nullable plus updatedBy plus createdAt, one live row per planKey at most. Reads prefer override then file.
- PlanAudit (new): id plus planKey plus actorId plus before JSON plus after JSON plus createdAt, append only.
- AffiliateEarning: existing row reused, status PENDING to REQUESTED to PAID, payout clears pendingEarnings only.
- Credit award linkage stays `referenceId` shaped `plan:<subscriptionId>` with type BONUS, one award per subscription row (a ledger entry in plain words).

**State transitions**:
- Subscription: PENDING to ACTIVE on webhook SUCCESSFUL with stored amount match, PENDING to FAILED on webhook FAILED or EXPIRED, FAILED to PENDING on retry initiate reusing the same row. ACTIVE stays until clock expiry, then reads as FREE. Clock is 7 times 24 hours for WEEKLY and 5 times 30 days for PRO from activatedAt. An override applies to the next purchase only, never mid cycle.
- AffiliateEarning: PENDING to REQUESTED on partner request, REQUESTED to PAID on admin payout. No transition drops totalEarnings.
- PlanOverride: draft values to live on admin save with audit write in the same transaction (a single DB transaction in plain words).

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/plans` | GET | none | resolved tiers with counts plus prices plus credits | public | 500 on catalogue read fail |
| `/api/usage` | GET | none | plan plus limits plus usage plus remaining plus creditCosts | session | 401 no session |
| `/api/payment/initiate` | POST | plan: WEEKLY or PRO | paymentUrl plus transId plus status PENDING | session | 400 bad plan, 429 rate limited |
| `/api/payment/status` | GET | transId: string | status PENDING or ACTIVE or FAILED | session owner only | 404 unknown, 403 not owner |
| `/api/webhooks/fapshi` | POST | transId plus status plus amount | 200 ok | webhook secret | 401 bad secret, 503 secret unset |
| `/api/admin/plans` | GET | none | file values plus overrides plus audit trail | admin | 403 non admin |
| `/api/admin/plans` | PUT | planKey plus priceXaf plus limits | resolved tier | admin | 400 bad counts, 403 non admin |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Pricing cards show counts | notes plus quizzes plus Tip per day per tier | `lib/plan-limits.ts` merged with PlanOverride |
| Pricing cards show prices | 0 plus 500 plus 3000 XAF | `constants/plans.ts` merged with PlanOverride |
| Upgrade prompt after first win | pass names plus gains | resolved tiers from `/api/plans`, trigger on first quiz score at or above pass mark for any quiz type, at most once per day, dismiss stores date |
| Limit notice | limit name plus remaining plus weekly or semester gain | `/api/usage` remainingOf plus resolved tiers |
| Initiate payment | paymentUrl plus transId | Fapshi initiate with stored `Subscription.amount` |
| Poll pending | status label plus next step | `/api/payment/status` reading Subscription row, webhook as truth |
| Receipt | planLabel plus amount plus reference plus paidAt | Subscription row plus Inngest `payment-received` template inputs |
| Admin override save | new price plus limits | admin form inputs, written to PlanOverride plus PlanAudit |
| Money trail | limit hit plus upgrade start plus paid success plus pending to paid rate plus AI cost XAF | event rows plus usage ledger plus AI cost ledger |

**Key invariants**:
- Money is XAF in whole units, never minor units.
- Copy counts equal enforced counts on every surface.
- Webhook amount must equal the stored subscription amount or the payment stays pending.
- One credit award per subscription row, keyed by `plan:<subscriptionId>`.
- Payout never reduces lifetime total, it clears pending only.
- No open route creates an affiliate row, only admin create approves PENDING to ACTIVE.
- Rate limits guard initiate plus poll plus webhook adjacent reads.
- Daily counts reset at Africa/Douala midnight. One note equals one uploaded file row, one quiz equals one generated set, one Tip message equals one tutor message row, thread length counts conversation messages. A hit limit blocks new creates only and keeps drafts readable.
- Amount snapshot happens at initiate from the resolved offer. An ACTIVE pass blocks a new initiate with a clear message. PaymentUrl lives 30 minutes. TransId comes from Fapshi. Poll runs every 5 seconds up to 5 minutes then shows a support hint with transaction id. Webhook SUCCESSFUL plus FAILED plus EXPIRED map to ACTIVE plus FAILED plus FAILED. Amount mismatch stays PENDING with a support note. Delivery serializes by transId through the replay guard.
- PaidAt equals webhook time, reference equals transId, receipt template is `payment-received`, resend runs through admin, paid state on the subscription page reads the subscription row.
- Override JSON matches the PlanLimits shape. Allowed ranges are counts 0 to 1000 and price 100 to 20000 in round 50 steps. Partial update is allowed. Before plus after store full tier JSON. Audit retained 2 years for admin viewers only.
- Verified email means better-auth emailVerified. One active pass means one ACTIVE subscription. Self referral means same userId or same email, which never pays. Signup award is 500 credits on the first ACTIVE of the referee. Initiate limited to 5 per hour per user, poll to 30 per minute per user.
- Money trail events are limit_hit plus upgrade_start plus paid_success with userId plus plan plus amount. AI cost in XAF equals the ledger sum per user per term. Pending to paid rate uses a 7 day window on the metrics page.

**Security model**:
- Students may read resolved plans plus own usage plus own subscription plus own poll result. Students may initiate only for self, only WEEKLY or PRO.
- Admin only may read or write PlanOverride plus PlanAudit plus affiliate payout. Webhook is public by design and gated by constant time secret compare, failing closed with 503 when the secret is unset.
- Attribution requires a verified email, one active pass per user, self referral never pays.

**Configuration required**:
- No new provider keys. Uses existing `FAPSHI_API_USER` plus `FAPSHI_API_KEY` plus `FAPSHI_WEBHOOK_SECRET` plus `ADMIN_EMAIL`.
- New platform setting keys for override cache life plus poll interval, documented in `.env.example` with safe defaults.
- Resolved offer caches 60 seconds keyed `plans:resolved`, invalidated on admin PUT. Monthly rows resolve with a not for sale flag.

**Critical test scenarios**:
- Happy path: student buys WEEKLY for 500, webhook SUCCESSFUL activates, poll shows ACTIVE, receipt arrives, satisfies **AC-6**, **AC-9**, **AC-10**.
- Failure case: PIN timeout leaves PENDING, poll shows pending with recheck, retry reuses the same row with no double grant, satisfies **AC-9**.
- Auth/permission: non admin PUT to `/api/admin/plans` gets 403, uninvited student sees no affiliate surface, satisfies **AC-11**, **AC-13**.
- Copy truth: pricing plus subscription plus limit notice show identical counts with no Unlimited word, satisfies **AC-5**.
- Ledger safety: double webhook delivery plus double signup award retry grant once, payout keeps lifetime total, satisfies **AC-9**, **AC-12**, **AC-13**.

## Build plan

1. Catalogue plus limits plus resolved read: add WEEKLY, set PRO to 3000 with 15000 credits, set FREE plus WEEKLY plus PRO caps, retire monthly from sale, add GET `/api/plans` resolved read, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
2. Thin purchase thread: initiate with one row reuse plus webhook stored amount check plus idempotent award plus GET status poll, satisfies **AC-7**, **AC-9**.
3. Student surfaces: pricing cards plus subscription page plus limit notices plus after first win prompt, all from the same resolved offer with no Unlimited wording, satisfies **AC-5**, **AC-8**, **AC-11**.
4. Receipt plus money trail: Inngest receipt plus paid state plus transaction id plus limit hit plus upgrade start plus paid success plus pending to paid rate plus AI cost XAF, satisfies **AC-10**, **AC-14**.
5. Admin overrides plus affiliate ledger fix: PlanOverride plus PlanAudit with fallback, payout that preserves lifetime total, verified email attribution, rate limits, satisfies **AC-11**, **AC-12**, **AC-13**.

## Consequences

**Positive**:
- Promise equals meter, with bounded counts a student can reason about.
- Low weekly entry plus prompt after first win should lift conversion rate.
- One catalogue plus audit ends the two offer drift.

**Negative / tradeoffs**:
- Semester moves from 2500 to 3000, breaking the 0019 promise. Early buyers at 2500 need honoring plus a page note, or trust dips.
- Admin editable overrides add logic and review surface a file only catalogue would skip.
- Richer free raises AI cost per free student until conversion pays it back.

**Neutral**:
- Monthly keys stay in code for old subs, so the catalogue carries dead rows until those subs expire.
- Poll adds a read path the webhook alone did not need, with its own rate limit to operate.

## Follow-up

- [ ] Honor plan for 2500 early buyers: keep their PRO rows at the old amount and note the change on the pricing page.
- [ ] Price sensitivity survey in the first term to replace inferred 500 plus 3000 with real willingness to pay.
- [ ] Institution sponsorship design for students who never pay, kept deferred in the scope.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Add WEEKLY plus new caps plus overrides tables alongside live code, no surface cutover.
2. Cut sale surfaces to Free plus WEEKLY plus PRO, keep old monthly rows valid for active subs.
3. Update PRO price for new purchases only, grandfather active 2500 rows to term end.
**Rollback**: revert sale surfaces to file catalogue with monthly hidden, keep overrides inert.
**Risks**: active monthly subs seeing a changed offer, double award on retry, missed webhook leaving PENDING. Mitigated by row reuse, idempotent award key, and poll plus webhook truth.
