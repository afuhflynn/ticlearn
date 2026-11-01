# 0034. Mobile money payments for the pass

**Date**: 2026-11-01
**Status**: In Progress

## Summary

This spec fixes the live Mobile Money buy so a student can pay for a weekly or semester pass and can also type an amount to buy credits directly. It keeps Fapshi as the only provider and reuses the tables and helper you own today. It makes a timed out PIN read as normal waiting, makes pending clear with a recheck control, and makes paid trust clear with email plus in app receipt.

## Requirements

**User stories**:
1. As a student, I want to buy a weekly or semester pass with Mobile Money so that I can unlock the term counts.
2. As a student with little cash, I want to type a small amount and get matching credits so that I can pay a small first PIN before I trust the semester.
3. As a student with a slow PIN prompt, I want calm waiting words plus a recheck so that I know the buy is alive and I know what to do next.
4. As the solo operator, I want one award per row plus a webhook guard so that a retry or a double delivery cannot grant twice.

**Acceptance criteria**:
1. **AC-1**: Pass buy plus typed credit buy are both live. Pass uses plan buttons only. Credit uses a typed amount.
2. **AC-2**: Student sees MTN first then Orange as a static pair. No live fetch. This matches the scope MTN first rule.
3. **AC-3**: Pass amount comes only from the resolved plan price. Credit amount is typed from 500 XAF to 20000 XAF in 100 XAF steps. Credits equal amount times 5. Whole XAF only.
4. **AC-4**: A timed out PIN reads as normal waiting and invites a retry. The word error never shows for a timeout.
5. **AC-5**: A pending buy shows what happens next plus a recheck control plus the transaction id (the Fapshi reference, a short code for support). Auto poll runs every 5 seconds up to 5 minutes, then shows a support hint with the id.
6. **AC-6**: Paid success sends email receipt plus shows an in app paid state with plan label plus amount plus reference plus paid date.
7. **AC-7**: Webhook uses the stored amount. Amount mismatch stays pending with a support note. Missing secret returns 503. Bad secret returns 401.
8. **AC-8**: Retry reuses the same row and the same transaction link. No new row on retry. No double grant on retry.
9. **AC-9**: Fapshi id is unique. One credit award per row by reference id. Double delivery grants once.
10. **AC-10**: When the webhook never arrives, status poll may mark ACTIVE on confirmed paid from live Fapshi status. Webhook stays the primary truth.
11. **AC-11**: Student starts only for self and sees only own rows. Admin may view all rows for support. Unknown id returns 404. A row owned by another student returns 403.
12. **AC-12**: First load shows a shape matched skeleton (grey blocks shaped like the coming content). PIN wait shows a numbered bar (a progress bar with real numbers and stage names). No spinner anywhere except inside the pressed button.

## Decision

**Chosen option**: Option 1: Fix in place with reuse

Keep Fapshi alone and reuse the current tables and helper, with typed credit buys and clear pending and receipt added beside the pass flow.

## Feature design

**Data model sketch**:
1. `Subscription`: id plus userId (unique, foreign key to `User`, one to one) plus plan (`WEEKLY` or `PRO`) plus status (`PENDING` or `ACTIVE` or `FAILED`) plus amount (Int, whole XAF) plus fapshiTransId (unique, nullable) plus provider (nullable text, e.g. MTN or Orange) plus phone (nullable text, digits only) plus activatedAt (nullable date and time) plus createdAt. Indexes on userId plus status plus fapshiTransId.
2. `CreditPurchaseOrder`: id plus userId (foreign key to `User`, one to many) plus amountXaf (Int, whole XAF) plus creditsPromised (Int) plus status (`PENDING` or `ACTIVE` or `FAILED`) plus fapshiTransId (unique, nullable) plus provider (nullable text) plus phone (nullable text) plus createdAt plus updatedAt. Index on userId.
3. No new table. Migration adds provider plus phone to both tables. Credit award linkage stays by reference id shaped `plan:<subscriptionId>` for pass and `credit:<orderId>` for typed buys.

**State transitions**:
1. Subscription: `PENDING` to `ACTIVE` on webhook SUCCESSFUL with stored amount match. `PENDING` to `FAILED` on webhook FAILED or EXPIRED. `FAILED` to `PENDING` on retry initiate reusing the same row with a fresh provider link when the old link expired. `ACTIVE` holds to clock end (7 days for `WEEKLY`, 5 months for `PRO` from activatedAt), then reads as free.
2. CreditPurchaseOrder: `PENDING` to `ACTIVE` on webhook SUCCESSFUL with stored amount match. `PENDING` to `FAILED` on webhook FAILED or EXPIRED. `FAILED` to `PENDING` on retry reusing the same row.
3. Poll bridge: `PENDING` to `ACTIVE` on live status SUCCESSFUL only, with the same stored amount check and the same one award guard, written through the same fulfill path as the webhook with one writer at a time by Fapshi id. Webhook stays primary. Poll never moves `ACTIVE` back.
4. Timeout without a terminal status stays `PENDING` with calm waiting copy. Amount mismatch stays `PENDING` with a support note. Delivery serializes by Fapshi id through the replay guard.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/payment/initiate` | POST | plan (`WEEKLY` or `PRO`), phone, provider | paymentUrl, transId, status `PENDING` | session | 400 bad plan or bad phone, 401 no session, 429 rate limited |
| `/api/credits/purchase/initiate` | POST | amountXaf (500 to 20000 step 100), phone, provider | paymentUrl, transId, creditsPromised, status `PENDING` | session | 400 bad amount or bad phone, 401 no session, 429 rate limited |
| `/api/payment/status` | GET | transId as query | status plus plan or amount plus next step | session owner only | 400 missing id, 401 no session, 403 other student row, 404 unknown |
| `/api/webhooks/fapshi` | POST | transId plus status plus externalId plus amount | 200 ok | webhook secret | 400 missing fields, 401 bad secret, 503 secret unset |
| `/api/admin/payments` | GET | none, optional status filter | buyer plus plan or amount plus status plus id list | admin | 403 non admin |
| `/api/plans` | GET | none | resolved tiers with prices plus counts plus credits | public | 500 on catalogue read fail |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Pass card shows price | amount in XAF | resolved tier from `/api/plans`, merged from `constants/plans.ts` with `PlanOverride` row, audited in `PlanAudit` |
| Credit box shows credits | creditsPromised | amountXaf times `CREDIT_XAF_RATE` of 5, computed on server at initiate and stored on the row, client shows preview only |
| Provider buttons show order | MTN first then Orange | static pair in code, no fetch, matches scope MTN first rule |
| Initiate returns link | paymentUrl plus transId | Fapshi initiate call with stored amount plus phone plus provider, phone digits only Cameroon shape, provider MTN or Orange only |
| Pending shows next step | waiting line plus recheck plus id | `Subscription` row or `CreditPurchaseOrder` row plus poll result, id shown is full fapshiTransId, support hint names WhatsApp contact from `constants/contact.ts` |
| Poll shows status | `PENDING` or `ACTIVE` or `FAILED` plus next step | row status, with live Fapshi status read through `getPaymentStatus` plus `parseFapshiPaymentStatusPayload` as bridge when row is `PENDING`, client timer cancels on unmount |
| Receipt shows proof | plan label plus amount plus reference plus paid date | row plus paid date in Africa Douala format, sent through Inngest `payment-received` template with existing sender, paid state lives on the subscription page |
| Webhook decides grant | grant or hold | stored amount match in whole XAF plus fapshiTransId uniqueness in DB plus one award per reference id in the credit ledger, status strings uppercased, mismatch stays pending with support note |
| Limit notice names gain | limit name plus weekly or semester gain | `/api/usage` remaining plus resolved tiers |
| Admin support view shows rows | buyer plus plan or amount plus status plus id | `GET /api/admin/payments` reading `Subscription` plus `CreditPurchaseOrder` rows, admin only |

**Key invariants**:
1. Money is XAF in whole units. No minor units anywhere.
2. Pass amount is fixed at initiate from the resolved offer in `PlanOverride` or file fallback. Credit credits are fixed at initiate as amount times `CREDIT_XAF_RATE` of 5 on the server.
3. Webhook amount must equal the stored amount or the row stays pending with a support note.
4. One credit award per row, keyed by reference id with a unique guard in the credit ledger.
5. One ACTIVE pass per student. A new pass initiate is blocked with a clear message while one is ACTIVE. Pass retry finds by student. Credit retry finds by order. A fresh provider link is fetched onto the same row when the old link expired. Phone or provider change is allowed before paid.
6. Fapshi id is unique in DB. Double delivery grants once.
7. Phone is digits only, Cameroon shape (a phone number in the Cameroon format, length plus prefix per provider confirmed at build). Provider is MTN or Orange only at this spec, shown MTN first.
8. Poll cadence is every 5 seconds up to 5 minutes, then a support hint with the id. Confirmed paid for the bridge means live status SUCCESSFUL only, written through the same fulfill path as the webhook with one writer at a time by id. Initiate is limited to 5 per hour per student. Poll is limited to 30 per minute per student. A pending credit double tap reuses the pending order with the same amount within 15 minutes.
9. Daily counts reset at Africa Douala midnight. Paid date equals webhook time, or poll confirm time when the bridge fires, shown in Douala format.
10. Copy counts equal enforced counts on every surface. No screen prints the word Unlimited for any tier. Timeout copy never uses the word error.

**Security model**:
Students may read resolved plans plus own usage plus own subscription plus own credit orders plus own poll result. Students may initiate only for self, only `WEEKLY` or `PRO` for pass, only 500 XAF to 20000 XAF for credits. Admin only may view all rows for support. Webhook is public by design and gated by constant time secret compare (a timing safe string match), failing closed with 503 when the secret is unset and 401 on bad secret. Attribution and affiliate rules stay as in spec 0033. Phone digits are personal data (private info tied to a person) and show only to owner plus admin.

**Configuration required**:
1. `FAPSHI_API_USER`: Fapshi user key for initiate plus status reads.
2. `FAPSHI_API_KEY`: Fapshi secret key for initiate plus status reads.
3. `FAPSHI_WEBHOOK_SECRET`: webhook guard, fail closed when unset.
4. `NEXT_PUBLIC_APP_URL`: builds the redirect back to app after provider page.
5. `ADMIN_EMAIL`: support contact shown on pending timeout and mismatch.

**Critical test scenarios**:
1. Happy path: student buys `WEEKLY`, webhook SUCCESSFUL activates, poll shows ACTIVE, receipt arrives, verifies **AC-1**, **AC-5**, **AC-6**, **AC-7**.
2. Failure case: PIN timeout leaves `PENDING`, screen shows calm waiting plus recheck with no error word, retry reuses the same row with no double grant, verifies **AC-4**, **AC-8**.
3. Auth and permission: poll on another student row gets 403, unknown id gets 404, non admin bulk view gets 403, webhook with bad secret gets 401, missing secret gets 503, verifies **AC-7**, **AC-11**.
4. Ledger safety: double webhook delivery plus double tap grant once, amount mismatch stays pending, missed webhook is healed by poll bridge once, verifies **AC-8**, **AC-9**, **AC-10**.
5. Copy truth plus feel: pass amount from buttons only, credit math 500 gives 2500 and 3000 gives 15000, skeleton then numbered bar with no spinner, verifies **AC-3**, **AC-12**.

## Build plan

1. Migration plus resolved read: add provider plus phone to both tables, keep one row per student reuse, expose resolved prices for pass plus credit rate, satisfies **AC-1**, **AC-3**.
2. Thin pass thread: initiate with plan plus phone plus provider, webhook with stored amount check plus id guard plus award, status poll by id with owner check, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-11**.
3. Credit thread beside pass: typed amount initiate with bounds plus snapshot of creditsPromised, same webhook shape with `credit:<orderId>` award key, same poll shape, satisfies **AC-1**, **AC-3**.
4. Student pending plus receipt: waiting words with no error term, what happens next plus recheck plus id, static MTN first buttons, auto poll up to 5 minutes then support hint, email plus in app paid state through Inngest, satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-12**.
5. Hardening plus admin plus trail: poll bridge that can mark ACTIVE on SUCCESSFUL only through the shared fulfill path, rate limits, admin list view, limit hit plus upgrade start plus paid success events with pending to paid rate, satisfies **AC-10**, **AC-11**.

## Consequences

**Positive**:
1. A timed out PIN no longer reads as failure, so fewer students abandon at the PIN step.
2. Pending with recheck plus id keeps the student in app instead of lost on the provider page.
3. Typed credits give a low entry buy that feels like airtime, which should lift first pay.
4. One award per row plus stored amount match ends double grant and replay pay.

**Negative / tradeoffs**:
1. Poll that can write adds a second writer beside the webhook. The id guard plus amount check plus same fulfill path contain it, but review the bridge path with care.
2. Static MTN first matches scope and kills the fetch, but if Fapshi ever reorders or renames providers the static pair drifts. Track provider mix after ship.
3. Richer pending plus polling adds reads against Fapshi. Rate limits guard abuse but add 429 paths to test.

**Neutral**:
1. Monthly plan keys stay in code for old active subs, so the catalogue carries dead rows until those subs end.
2. Phone plus provider on each row adds personal data. Owner plus admin only, with the same retention as the money trail.

## Follow-up

1. Confirm Cameroon phone rule with real numbers (length plus prefix per provider) so validation rejects typos without blocking valid lines, and confirm the Inngest `payment-received` sender plus copy.
2. Confirm Cameroon phone rule with real numbers (length plus prefix per provider) so validation rejects typos without blocking valid lines.
3. Price sensitivity check in the first term to replace inferred 500 plus 5 per XAF with real willingness to pay.
4. Institution sponsorship path for students who never pay stays deferred.
5. Enroll or link scope row 29 to this spec file so status mirrors the feature.



## Build plan

1. Migration plus resolved read: add provider plus phone to both tables, keep one row per student reuse, expose resolved prices for pass plus credit rate, satisfies **AC-1**, **AC-3**.
2. Thin pass thread: initiate with plan plus phone plus provider, webhook with stored amount check plus id guard plus award, status poll by id with owner check, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-11**.
3. Credit thread beside pass: typed amount initiate with bounds plus snapshot of creditsPromised, same webhook shape with `credit:<orderId>` award key, same poll shape, satisfies **AC-1**, **AC-3**.
4. Student pending plus receipt: waiting words with no error term, what happens next plus recheck plus id, static MTN first buttons, auto poll up to 5 minutes then support hint, email plus in app paid state through Inngest, satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-12**.
5. Hardening plus admin plus trail: poll bridge that can mark ACTIVE on SUCCESSFUL only through the shared fulfill path, rate limits, admin list view, limit hit plus upgrade start plus paid success events with pending to paid rate, satisfies **AC-10**, **AC-11**.

## Consequences

**Positive**:
1. A timed out PIN no longer reads as failure, so fewer students abandon at the PIN step.
2. Pending with recheck plus id keeps the student in app instead of lost on the provider page.
3. Typed credits give a low entry buy that feels like airtime, which should lift first pay.
4. One award per row plus stored amount match ends double grant and replay pay.

**Negative / tradeoffs**:
1. Poll that can write adds a second writer beside the webhook. The id guard plus amount check plus same fulfill path contain it, but review the bridge path with care.
2. Static MTN first matches scope and kills the fetch, but if Fapshi ever reorders or renames providers the static pair drifts. Track provider mix after ship.
3. Richer pending plus polling adds reads against Fapshi. Rate limits guard abuse but add 429 paths to test.

**Neutral**:
1. Monthly plan keys stay in code for old active subs, so the catalogue carries dead rows until those subs end.
2. Phone plus provider on each row adds personal data. Owner plus admin only, with the same retention as the money trail.

## Follow-up

1. Confirm Cameroon phone rule with real numbers (length plus prefix per provider) so validation rejects typos without blocking valid lines, and confirm the Inngest `payment-received` sender plus copy.
2. Confirm Cameroon phone rule with real numbers (length plus prefix per provider) so validation rejects typos without blocking valid lines.
3. Price sensitivity check in the first term to replace inferred 500 plus 5 per XAF with real willingness to pay.
4. Institution sponsorship path for students who never pay stays deferred.
5. Enroll or link scope row 29 to this spec file so status mirrors the feature.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Add nullable provider plus phone columns beside live code, no surface cutover. Keep old initiate working.
2. Cut pass initiate to new inputs with row reuse plus new pending plus receipt. Add credit initiate beside it. Keep webhook compatible with old rows.
3. Point all surfaces at the resolved offer plus static MTN first buttons. Turn on poll bridge plus rate limits plus admin view.
**Rollback**: revert surfaces to prior initiate plus webhook, keep new columns nullable and inert.
**Risks**: active pending rows during cutover seeing changed wording, double award on retry, missed webhook leaving paid locked. Mitigated by row reuse, id guard, stored amount check, and poll bridge.
