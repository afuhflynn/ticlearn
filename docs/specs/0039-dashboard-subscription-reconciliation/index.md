# 0039. Dashboard subscription reconciliation

**Date**: 2026-11-01
**Status**: In Progress

## Summary

The public pricing page and the in app subscription page sell the same offer. Both show Free plus Weekly Pass plus Semester Pass with the same prices and counts, and both start payment the same way through Fapshi with plan only. The subscription page loses the extra credit buy card and the manual transfer card, and the retired monthly plans leave the catalogue. A busy reader can trust this: one catalogue, one offer, one payment path.

## Requirements

**User stories**:
1. As a student, I want the subscription page to show the same three passes as the pricing page, so I trust the offer I saw before I signed in.
2. As a student, I want the upgrade button to start payment the same way in both places, so I never wonder which path is correct.
3. As a student with an active pass, I want a clear message when I try to buy again, so I know my pass runs until its end date.

**Acceptance criteria**:
1. **AC-1**: The subscription page offer grid shows only Free plus Weekly Pass plus Semester Pass, with label plus price plus period plus features plus CTA identical to `publicPlans` on the pricing page.
2. **AC-2**: The upgrade action on both pages sends plan only to `POST /api/payment/initiate` and follows the returned link, with no phone plus provider inputs on the page.
3. **AC-3**: All price plus feature plus credit copy on the subscription page renders from `planCatalog` plus plan limits, with no local price map, no local period label, and no screen printing a retired monthly plan.
4. **AC-4**: The credit top up card is gone from the subscription page, including its amount plus provider plus phone inputs and its initiate credits call.
5. **AC-5**: The manual Mobile Money card is gone from the subscription page, including its plan picker plus paid with picker plus transaction ID input plus manual submit call.
6. **AC-6**: `constants/plans.ts` holds only FREE plus WEEKLY plus PRO, and `payablePlans` holds only WEEKLY plus PRO, with retired rows and legacy helpers removed.
7. **AC-7**: A student with an ACTIVE pass who tries to initiate again receives a 409 plus a page message naming the current plan and its end date.
8. **AC-8**: Pending plus receipt copy uses catalogue words only, with plan label plus amount plus period label matching pricing, and the same Mobile Money marks.
9. **AC-9**: The page keeps the loading rule, with a shape matched skeleton on first load and prior content kept on refresh, and any button spinner lives only inside the button that started the action.

## Decision

**Chosen option**: Option 1: Catalogue parity with deletions (see `rationale.md` for the options).

The subscription page renders the same three passes from the same catalogue as pricing, starts payment with plan only, and the extra cards plus retired rows are deleted.

## Feature design

**Data model sketch**:
1. Plan catalogue in `constants/plans.ts`: keys FREE plus WEEKLY plus PRO only. Each entry keeps key plus label plus priceXaf plus period plus credits plus features plus CTA plus href plus popular plus forSale. WEEKLY priceXaf 500 period week credits 2500 CTA Start Weekly Pass. PRO priceXaf 3000 period semester credits 15000 CTA Start Semester Pass popular true. FREE priceXaf 0 period forever credits 200 CTA Get Started href sign up. The STARTER plus STANDARD plus PREMIUM entries plus `legacyPlans` are deleted, and `payablePlans` stays WEEKLY plus PRO with `publicPlans` as FREE plus WEEKLY plus PRO.
2. Shared period helper in `lib/plans-display.ts` (new small module): one function used by both the pricing cards and the subscription grid, returning forever or per 7 days or per semester. Both pages print the helper output verbatim, so per week never appears as a variant.
2. Plan limits in `lib/plan-limits.ts`: FREE 5 notes plus 10 quizzes plus 15 Tip messages a day, WEEKLY 10 plus 20 plus 50, PRO 100 plus 300 plus 200. No minus one sentinel on sale tiers. Retired monthly rows are removed, so a legacy ACTIVE row reads as FREE.
3. Subscription row: existing table reused, one row per user keyed by userId unique, with plan plus status plus amount plus fapshiTransId plus activatedAt. No new columns in this slice. No PlanOverride table in this slice.
4. Relations: subscription userId points to user id, one to one. Credit ledger rows point to subscription through `referenceId` shaped `plan:<subscriptionId>` with one award per subscription row.

**State transitions**:
1. Subscription: PENDING to ACTIVE on webhook SUCCESSFUL with stored amount match, PENDING to FAILED on webhook FAILED or EXPIRED, FAILED to PENDING on retry initiate reusing the same row. ACTIVE reads as FREE after clock expiry, 7 days for WEEKLY and 5 months for PRO from activatedAt.
2. Initiate guard: ACTIVE pass blocks a new initiate for the same user. The API returns 409 and the page names the current plan plus end date.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/payment/initiate` | POST | body plan string, one of WEEKLY or PRO, no phone fields | link string plus transId string plus status PENDING | session owner only | 400 unknown plan with body error naming the two valid plans, 409 active pass exists with body error plus currentPlan plus endDate ISO, 429 rate limited |
| `/api/payment/status` | GET | query transId string | status PENDING or ACTIVE or FAILED plus providerStatus string when present | session owner only | 404 unknown, 403 not owner |
| `/api/webhooks/fapshi` | POST | transId plus status plus amount | 200 ok | webhook secret | 401 bad secret, 503 secret unset |
| `/api/subscription` | GET | none | plan plus status plus amount plus transId plus activatedAt ISO or null | session owner only | 401 no session |
| `/api/subscription/manual` | POST | none, route retired | 410 gone with error pointing to Fapshi initiate | session owner only | 410 gone always |
| `/api/credits/purchase` | POST | none from this page, route kept for a later home | 404 or the later slice re points it | session owner only | 404 when unlinked |

Button behavior on both grids: while initiate is in flight the pressed button shows Starting payment and stays disabled, all other buy buttons stay disabled until it resolves, and a second press while pending is ignored client side plus serialized by transId server side.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Offer grid shows passes | label plus price plus period plus features plus CTA per tier | `planCatalog` entries for FREE plus WEEKLY plus PRO, with counts from `lib/plan-limits.ts` |
| Period line under price | per semester or per 7 days or forever | `period` field on the catalogue entry, rendered through one shared helper used by both pages |
| Upgrade button starts payment | payment link plus transId | `POST /api/payment/initiate` with plan only, Fapshi hosted phone entry |
| Active guard message | current plan name plus end date | subscription row plan plus activatedAt plus catalogue period math, end date is activatedAt plus 7 days for WEEKLY or plus 5 calendar months for PRO, formatted like 12 Jan 2027 in Africa Douala time, null activatedAt reads as contact support with the transId |
| Pending box | status label plus next step plus transId | subscription row plus `GET /api/payment/status`, webhook as truth, verbatim copy Finish the payment on your phone, then come back to this page plus Still waiting on the phone prompt plus Recheck now, transId shown in full with a copy affordance |
| Receipt box | plan label plus amount plus paid date plus transId | subscription row amount plus fapshiTransId plus activatedAt, verbatim shape Weekly Pass plus 500 FCFA plus paid 12 Jan 2027 plus Transaction id full value plus keep it for support, date in Africa Douala time |
| CTA per tier | button label plus target | catalogue CTA verbatim, FREE row shows Current plan when it is the current plan else Included in every account and disabled, paid rows show Current plan when current else the catalogue CTA, public FREE links to sign up while app FREE is disabled info only |
| Usage section | notes plus quizzes plus Tip counts with remaining | `/api/usage` keys pdfUploads plus quizGenerations plus aiTutorMessages with limits from plan limits, reset line reads Tip messages reset every day at Africa Douala midnight |
| Credits balance line | balance left | credits ledger sum for the user, shown as info only with no buy action on this page |

**Key invariants**:
1. Money is XAF in whole units, never minor units.
2. Copy counts equal enforced counts on every surface.
3. Both pages read the same catalogue entries, with no local price or feature strings.
4. No page prints a plan key outside FREE plus WEEKLY plus PRO.
5. No Unlimited word on any student facing screen.
6. One credit award per subscription row, keyed by `plan:<subscriptionId>`.
7. Webhook amount must equal the stored subscription amount or the payment stays pending.
8. ACTIVE blocks a new initiate with a 409 and a dated message. PENDING allows a retry initiate that reuses the same row and rotates transId to the new value, amount overwritten from the fresh resolved offer, with the credit award still keyed by `plan:<subscriptionId>` so a retry never double grants. Amount mismatch stays PENDING with a support note, never FAILED, so a slow webhook can still land.
9. A hit limit blocks new creates only and keeps prior content readable.
10. First load shows a shape matched skeleton, refresh keeps prior content with a thin bar, and a spinner lives only inside the acting button.
11. Clock expiry is enforced on read: ACTIVE with activatedAt past 7 days for WEEKLY or past 5 calendar months for PRO reads as FREE in `resolvePlan` plus usage, with no background job in this slice. Payment link life is 30 minutes; an expired link returns to the grid with the pending box offering recheck.
12. The subscription grid reuses the pricing card component with a mode prop for app versus public, so card markup plus CTA order plus Mobile Money marks stay identical and only the FREE target differs.

**Security model**:
1. Students may read resolved plans plus own usage plus own subscription plus own poll result. Students may initiate only for self, only WEEKLY or PRO.
2. Webhook stays public by design and is gated by secret compare, failing closed with 503 when the secret is unset.
3. No open route creates credit or affiliate rows in this slice. The deleted manual submit route must return 404 or 410 once the card is gone, never accept a transaction ID.

**Configuration required**:
1. No new env vars. Uses existing `FAPSHI_API_USER` plus `FAPSHI_API_KEY` plus `FAPSHI_WEBHOOK_SECRET`.
2. No PlanOverride keys in this slice. If override keys land later, both pages must read the same resolved offer.

**Critical test scenarios**:
1. Happy path: student buys WEEKLY for 500 from the subscription page, webhook SUCCESSFUL activates, poll shows ACTIVE, receipt shows Weekly Pass plus 500 plus transId, verifies **AC-1**, **AC-2**, **AC-8**.
2. Failure case: PIN timeout leaves PENDING, poll shows pending with recheck, retry reuses the same row with no double grant, verifies **AC-7** guard plus pending behavior.
3. Auth plus permission: no session initiate gets 401, cross user poll gets 403 or 404, manual submit route no longer accepts writes, verifies **AC-5**, **AC-7**.
4. Copy truth: subscription grid plus pricing grid show identical labels plus prices plus counts with no retired plan and no Unlimited word, verifies **AC-1**, **AC-3**, **AC-6**.
5. Deletion proof: credit top up plus manual card absent from rendered page, retired catalogue imports absent from the bundle, verifies **AC-4**, **AC-5**, **AC-6**.
6. Loading honesty: first visit paints the subscription skeleton, refresh keeps content with a thin bar, verifies **AC-9**.

## Build plan

Ordered as a thin thread first, per the Tracer Bullet approach in `AGENTS.md`. Each slice works end to end before the next starts.

1. Thin catalogue plus grid thread: trim `constants/plans.ts` to three passes, remove legacy helpers, add `lib/plans-display.ts` with the one period helper, render the subscription grid by reusing the pricing card component with a mode prop for app versus public, satisfies **AC-1**, **AC-3**, **AC-6**.
2. Payment path parity plus guard: switch the dialog to plan only initiate with link follow, add the ACTIVE 409 guard in the route plus the dated message on the page, satisfies **AC-2**, **AC-7**.
3. Deletions plus words plus feel: delete the credit top up card plus manual card plus their state and calls, point pending plus receipt at catalogue words, keep skeleton plus refresh bar plus button only spinner, satisfies **AC-4**, **AC-5**, **AC-8**, **AC-9**.

## Consequences

**Positive**:
1. One offer in code and on screen, so pricing and subscription can no longer drift.
2. Smaller page with one payment path, which is cheaper to test and support.
3. Catalogue only copy keeps future price edits in one file.

**Negative or tradeoffs**:
1. Credit top up leaves the page with no new home in this slice, so a student who wants credits sees info only until a later slice places the buy action.
2. Deleted manual route breaks any bookmarked transfer flow, and support must point those students to Fapshi.
3. Deleted catalogue rows mean any surprise legacy row in production would read as FREE until re added.

**Neutral**:
1. Pending poll plus webhook truth plus receipt email stay as built in specs 0033 and 0034, this slice only changes their words.
2. Admin override stays deferred, so a later slice must move both pages to the resolved offer together.

## Follow-up

1. Place the credit buy action in its right home and link it from the subscription credits line, so info only does not strand buyers.
2. Retire or redirect the standalone credit purchase and manual submit routes and confirm no client still calls them.
3. Decide the 2500 early buyer note from spec 0033, since PRO now reads 3000 on both pages.
4. Move both pages to the resolved offer when admin overrides land, never one page alone.

## Migration plan

**Strategy**: no migration needed
**Phases**:
1. Ship the trimmed catalogue plus grid plus plan only initiate plus deletions together, with no live rows to backfill.
2. Confirm no STARTER plus STANDARD plus PREMIUM rows exist in production before release, and confirm the removed routes return 404 or 410.
**Rollback**: revert the one commit to restore the prior page plus catalogue.
**Risks**: a hidden monthly row appearing after release would read as FREE, mitigated by the pre release row check and the ACTIVE guard.
