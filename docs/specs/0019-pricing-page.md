# 0019. Pricing Page and Semester Pass

**Date**: 2026-10-25
**Status**: In Progress

## Summary

The public pricing page shows a monthly "Pro" plan at 3,500 FCFA that does not match the semester product, and it prints a "Semester · /month" line that means nothing. This decision rebuilds the page around a free tier and one Semester Pass at 2,500 FCFA paid over MTN Mobile Money or Orange Money, with one shared plan catalogue as the only place a price or a limit is defined. The page shows the real free limits, the real paid features, the semester price with an estimated monthly line, and no auto renewal language. Building it means replacing the four duplicate price maps with that one catalogue.

## Context

The product moved to university students and a semester pass, but the public page still sells a "Pro" plan by the month at 3,500 FCFA. The page prints "per/month" from the plan data and then a second line that reads "Semester · /month", so the primary unit and the secondary unit contradict each other. The dashboard sells three different monthly plans. A student who compares the two surfaces sees two different offers.

The price itself is copied in four places and they disagree. `lib/fapshi.ts` has STARTER 3000, STANDARD 5000, PREMIUM 10000 and PRO 3500. The Fapshi webhook has the first three and no PRO. The manual subscription route has all four, with PRO at 3500. The dashboard has the first three and no PRO. The draft of this page promised 2,500, which the payment route would charge as 3,500. A student who sees 2,500 and then a 3,500 Mobile Money prompt does not trust the next page.

The payment reality is a one time Mobile Money transfer through Fapshi, with MTN as the first path and Orange always present, and no card. The free tier is the part a student evaluates before paying, so its limits have to be the real enforced limits, not a marketing guess. Not deciding leaves the page promising a price the backend does not charge, and leaves the free tier under explained.

## Requirements

**User stories**:
- As a student deciding whether to pay, I want to see the real free limits and the real paid features side by side, so I can judge what the pass adds.
- As a student ready to pay, I want to pay 2,500 FCFA for the semester over MTN or Orange Money, with no card and no renewal surprise, so I trust the purchase.
- As the team, I want one plan catalogue, so the page, the payment route, the webhook and the dashboard cannot show different prices.

**Acceptance criteria**:
- **AC-1**: The page shows exactly two tiers, Free (0 FCFA) and Semester Pass (2,500 FCFA per semester), and their bullet lists are genuinely different, not the same list repeated.
- **AC-2**: The Free tier states the real limits read from `FREE_LIMITS`: 2 notes, 4 quizzes, 8 Tip messages a day, plus the fact that a note the student uploads stays readable.
- **AC-3**: The Semester Pass states unlimited notes, unlimited quizzes, unlimited Tip messages, and that a quiz answer traces back to the page it came from.
- **AC-4**: The page treats the semester as the main unit and shows an estimated monthly line as secondary, labelled as an estimate.
- **AC-5**: The page names MTN Mobile Money and Orange Money via Fapshi, and says the payment is one time with no auto renewal, no card and no hidden charge.
- **AC-6**: The price on the card equals the amount the payment route charges, and both read the one plan catalogue.
- **AC-7**: A signed out visitor who chooses the pass is sent to sign in and returned to `/pricing`; a signed in student starts the payment and is redirected to the Fapshi link.
- **AC-8**: If payment initiation fails, the page shows a plain notice and lets the student retry, and the only spinner is inside the button that started the action.
- **AC-9**: The page carries its own title, description, canonical and social metadata written for a Cameroonian university student.
- **AC-10**: The heading and the copy are in the first HTML; only the plan cards are a client island.
- **AC-11**: A signed in student who is already on an active plan sees that plan's label as the current state, and the page says that buying the pass replaces the current plan.
- **AC-12**: A student with a pending payment sees a plain "finish on your phone" note, and the action stays available to retry.

## Options considered

### Option 1: Fix the copy and the duplicate maps only

Keep the existing page and plan set, correct the "per/month" and "Semester · /month" lines, and make the four price maps agree.

**Pros**:
- Smallest change; no new catalogue or surface.

**Cons**:
- The page still leads with a monthly unit, which is the wrong shape for a semester product.
- The four maps stay duplicated, so the next price edit drifts again.
- The card still cannot show a 2,500 semester price unless the backend actually charges it.

### Option 2: One plan catalogue and a rebuilt two tier page (chosen)

Add one catalogue in `constants/plans.ts` that owns every plan's key, label, price, period and features, rebuild the public page around Free and one Semester Pass at 2,500 FCFA, and make the payment route, webhook, manual route and dashboard read the catalogue.

**Pros**:
- The price shown equals the price charged, by construction.
- The free bullets and paid bullets read from the enforced limits, so they cannot drift.
- Adding a tier later is a catalogue entry, not a rewrite.
- One catalogue replaces four duplicate price maps.

**Cons**:
- Touches the public page, the payment route, the webhook, the manual route and the dashboard import.
- Changes the public offer from a monthly plan to a semester pass, which is a price and unit change.
- Reuses the `PRO` plan key for a plan the page labels "Semester Pass".

### Option 3: A new SEMESTER plan and the full plan model now

Add a `SEMESTER` value to the `Plan` enum, build the calendar expiry, and ship the three passes (semester, larger, year) in the same change.

**Pros**:
- The cleanest long term names and the complete scope row 28 model.

**Cons**:
- Pulls scope row 28, a Slice 5 feature, into a Slice 1 page.
- Needs a migration, a change to `resolvePlan`, and updates to every limit consumer.
- Delays a page that can ship on the existing plan.

## Decision

**Chosen option**: Option 2: One plan catalogue and a rebuilt two tier page.

The public page becomes Free plus a single Semester Pass at 2,500 FCFA, and one catalogue in `constants/plans.ts` becomes the only place a plan price, period, label, feature or limit reference is defined. `lib/fapshi.ts`, the Fapshi webhook, the manual subscription route, the admin plan upgrades route and the dashboard subscription page read it instead of keeping their own copies; `getPlanPrice` stays as a thin wrapper over the catalogue so no caller has to change shape. The pass is sold under the existing `PRO` plan key, whose limits are already unlimited, so no schema change is needed for this page. The dashboard keeps its three monthly plans for now and reads their prices from the catalogue; it does not add the Semester Pass to the monthly grid, and the follow-up covers pointing its upgrade action at `/pricing`.

## Rationale

The strongest force is trust. The page currently prints one price and the payment route charges another, and the draft's 2,500 semester pass would be charged as a 3,500 PRO plan. A student who sees 2,500 and then a 3,500 Mobile Money prompt does not buy again. One catalogue removes that class of bug by construction, because the card, the stored amount and the Fapshi request all read the same value.

The second force is the pivot. The product is sold by semester, not by month, so the page must lead with the semester and treat a monthly figure as an estimate. The third force is the repository rule that a new abstraction must replace an existing one, not sit beside it; four price maps are exactly the drift that rule exists to stop.

The runner up, adding a `SEMESTER` plan and the full calendar model now, is cleaner in name but pulls scope row 28 into a Slice 1 page and needs a migration plus a change to `resolvePlan`. It can follow once the page has shipped.

## Feature design

**Data model sketch**:
- `PlanDefinition` in `constants/plans.ts`: `key` (a `Plan` enum value or `"FREE"`), `label` (display name), `priceXaf` (whole FCFA), `period` (`"forever"`, `"month"` or `"semester"`), `semesterMonths` (display divisor, 5), `features` (string list), `cta`, `href`, `popular`. The existing `Plan` interface is renamed to `PlanDefinition`; its only importers are `app/(marketing)/pricing/page.tsx` and `components/marketing/pricing-plans.tsx`.
- `planCatalog`: the map of every plan by key. `publicPlans`: the two the page shows, `FREE` and `PRO` (label "Semester Pass", 2,500, semester, 5 months).
- Feature copy is fixed, not free text: Free is `"{pdfUploads} notes"`, `"{quizGenerations} quizzes from your notes"`, `"{aiTutorMessages} Tip messages a day"` and `"Read any note you upload, any time"`. The pass is `"Unlimited notes"`, `"Unlimited quizzes from your notes"`, `"Unlimited Tip messages"` and `"Every quiz traces back to the page it came from"`. The numbers come from `FREE_LIMITS` and `PAID_LIMITS.PRO`; the test asserts the numbers, not the prose.
- The monthly estimate is `Math.round(priceXaf / semesterMonths)` on the `PRO` entry, rendered behind an "about … a month" label, so a price that does not divide evenly still reads as an estimate.
- `Subscription` (unchanged): `id`, `userId` (unique), `userEmail`, `userName`, `plan`, `status`, `amount` (whole FCFA), `fapshiTransId` (unique), `activatedAt`, `createdAt`.
- No new table and no new column for this slice. Calendar expiry is scope row 28.

**State transitions**:
- `PENDING` to `ACTIVE` when the webhook reports `SUCCESSFUL`.
- `PENDING` to `FAILED` when the webhook reports `FAILED` or `EXPIRED`.
- `FAILED` back to `PENDING` when the student retries; the route reuses the existing row.
- `ACTIVE` to `PENDING` when the student buys again; the route reuses the existing row.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/payment/initiate` | POST | `plan` (a payable catalogue key, `"PRO"` on this page) | `{ link, transId }` | bearer | 400 invalid plan, 400 gateway message, 401, 500 |
| `/api/subscription/me` | GET | none | `{ subscription, previousPlan }` | bearer (401 returns `{ subscription: null }`) | 401 |
| `/api/webhooks/fapshi` | POST | `transId`, `status`, `externalId`, `amount` | `{ success }` | `Authorization: Bearer FAPSHI_WEBHOOK_SECRET` | 401, 503 when the secret is unset, 404 unknown subscription |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Free card bullets | 2 notes, 4 quizzes, 8 Tip messages a day | `FREE_LIMITS` in `lib/plan-limits.ts` |
| Semester Pass card price | 2,500 FCFA | `priceXaf` on the `PRO` entry in `constants/plans.ts` |
| Monthly equivalent | about 500 FCFA a month | `Math.round(priceXaf / semesterMonths)` on the `PRO` entry, behind an "about … a month" label |
| Semester Pass bullets | unlimited notes, quizzes and Tip messages | `PAID_LIMITS.PRO` (all `UNLIMITED`) in `lib/plan-limits.ts` |
| Amount charged at initiation | 2,500 FCFA | `priceXaf` read from the catalogue by `lib/fapshi.ts` |
| Plan label in the page and the webhook email | "Semester Pass" | `label` on the `PRO` entry |
| Current plan and status on the page | "Semester Pass", `ACTIVE` | `GET /api/subscription/me` returns `subscription.plan`, mapped through the catalogue |
| Sign in return path | `/pricing` | the page passes `callbackUrl=/pricing` |
| Provider names | MTN Mobile Money, Orange Money, Fapshi | page copy, not a database read |
| Receipt amount and affiliate commission | the amount the student actually paid | `Subscription.amount`, not the current catalogue price |

**Key invariants**:
- The price on the card, the amount stored in `Subscription.amount`, and the amount sent to Fapshi are the same catalogue value at initiation.
- The webhook reads `Subscription.amount` for the receipt and the commission, so an in flight payment is reported at the amount the student actually paid even if the catalogue changes.
- `FREE` is never written to the `Plan` enum; `resolvePlan` synthesizes it for a user with no active subscription.
- The page never prints "per month" as the primary unit, never says "cancel anytime", and never implies renewal.
- A signed out visitor never reaches `/api/payment/initiate`; the page sends them to `/sign-in?callbackUrl=/pricing`.
- The webhook fails closed when `FAPSHI_WEBHOOK_SECRET` is unset.
- A repeated webhook for the same `fapshiTransId` does not activate twice.
- The webhook labels every payable plan from the catalogue, including `PRO`, so a Semester Pass receipt never reads `undefined`.
- The webhook uses `Subscription.amount` for both the receipt and the affiliate commission, ignores the body `amount`, and keeps no local price map.
- A webhook whose incoming `transId` differs from the stored `sub.fapshiTransId` is a stale event and is ignored, so a late callback for an older attempt cannot stomp the current one.
- On the page, the cards and the call to action render at once from server data; the current-plan badge and the pending note appear when the subscription read lands, with no skeleton and no dimming on this public page.
- A student who is already active sees their plan label as the current state and a line that buying the pass replaces the current plan; a pending payment shows a "finish on your phone" note and keeps the action available.

**Security model**:
- `/api/payment/initiate` requires a session and accepts only a payable key in the catalogue, never `FREE`.
- The webhook sits in `publicPaths` in `proxy.ts` and must not require a session; it is authenticated by the shared secret.
- The page is public. The subscribe action is the only mutation, and it runs on the server route.
- No price map or secret is read on the client beyond the public catalogue data.

**Configuration required**:
- `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_BASE_URL` or `FAPSHI_SANDBOX`, `FAPSHI_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`: all already used; no new variable.

**Critical test scenarios**:
- Happy path: a signed in student on `/pricing` chooses the Semester Pass, the route charges 2,500, returns a link, and the webhook marks the subscription `ACTIVE`, verifies **AC-1**, **AC-6**, **AC-7**.
- Failure case: the gateway returns no link, the page shows a plain notice, the button returns to its normal state, and no spinner is left running, verifies **AC-8**.
- Auth: a signed out visitor chooses the pass and lands on sign in with `callbackUrl=/pricing`, verifies **AC-7**.
- Honesty: the free bullets equal `FREE_LIMITS`, the paid bullets equal `PAID_LIMITS.PRO`, and the page prints no monthly primary unit and no "cancel anytime", verifies **AC-2**, **AC-3**, **AC-5**.
- Price equality: the displayed price and the route amount both come from the catalogue, and a price change in the catalogue moves both, verifies **AC-6**.
- In flight price change: a `PENDING` subscription created before a catalogue change is activated with its stored `amount`, not the new price, verifies **AC-6**.
- Metadata and rendering: the title, description and canonical are in the first HTML, verifies **AC-9**, **AC-10**.
- Stale webhook: a retry replaces `fapshiTransId`, and a late `SUCCESSFUL` callback for the older id is ignored, verifies **AC-6**.
- Current and pending state: an active student sees their label, and a pending student sees the finish note, verifies **AC-11**, **AC-12**.

## Build plan

Tracer Bullet: a thin thread through every layer first, then thicken.

1. Stand up the thin thread. Rename the existing `Plan` interface in `constants/plans.ts` to `PlanDefinition` and update its two importers. Add the `PRO` entry with label "Semester Pass", `priceXaf` 2,500, `period` "semester" and `semesterMonths` 5. Keep `lib/fapshi.ts` `getPlanPrice` as a thin wrapper over the catalogue, and render the paid card from it. This proves the price shown equals the price charged end to end. Satisfies **AC-1**, **AC-6**.
2. Add the Free entry and derive both bullet lists from `FREE_LIMITS` and `PAID_LIMITS.PRO`, so the tiers are genuinely different and honest. Satisfies **AC-2**, **AC-3**.
3. Rebuild the page presentation: semester first, estimated monthly line, no auto renewal, providers named, honest free copy, server component with the cards as the only client island. Satisfies **AC-1**, **AC-4**, **AC-5**, **AC-10**.
4. Wire the subscribe action through `lib/api-client.ts`, not a raw `fetch`: signed out to `/sign-in?callbackUrl=/pricing`, signed in to `POST /api/payment/initiate` with `{ plan: "PRO" }`, redirect to the link, plain error notice on failure, spinner only inside the button. Show the active plan label as the current state with the replace line, and show the pending note when the read says `PENDING`. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-11**, **AC-12**.
5. Replace the remaining duplicate price maps. The webhook reads the catalogue for every payable label, including `PRO`, and uses `Subscription.amount` for both the receipt and the commission, ignoring the body `amount`; it also ignores a `SUCCESSFUL` callback whose `transId` differs from the stored `sub.fapshiTransId`. The manual route and the admin plan upgrades route read the catalogue for their amounts; the dashboard keeps its three monthly plans and derives their prices from the catalogue, without adding the Semester Pass to the monthly grid. Satisfies **AC-6**.
6. Add page metadata: title, description, canonical `/pricing`, Open Graph and Twitter fields. Satisfies **AC-9**.
7. Add tests: a catalogue test that the displayed price equals the route price and the bullets equal the limits, a page test for the copy and metadata, a browser test for the signed out redirect and a mocked signed in initiate, and a webhook test for the stale `transId` guard. Satisfies **AC-1** to **AC-12**.

## Consequences

**Positive**:
- The price shown is the price charged, by construction.
- The free limits and paid features cannot drift from the enforced limits.
- The page stops sounding like a monthly subscription.
- One catalogue replaces four duplicate price maps.

**Negative / tradeoffs**:
- The public offer changes from a 3,500 monthly Pro to a 2,500 semester pass, a price cut and a different unit; revenue per student drops unless volume rises.
- The dashboard still carries the old monthly plan grid and credits copy behind the sign in wall, so a second offer remains until a later slice; this spec only makes its prices agree.
- Reusing the `PRO` key for a plan the page calls "Semester Pass" couples the display name to an internal enum value; a future rename needs a migration.
- No calendar expiry in this slice, so a purchased pass stays active until scope row 28 adds expiry and `resolvePlan` handling.

**Neutral**:
- `constants/plans.ts` grows from a display list into the single plan catalogue, and every consumer imports it.
- `FREE` is still synthesized, not stored, so the catalogue handles `"FREE"` separately from the `Plan` enum.

## Follow-up

- [ ] Scope row 28 owns the academic calendar, `Subscription.expiresAt`, `resolvePlan` treating an expired pass as free, and the three passes (semester, larger and year). This page is built so adding a tier is a catalogue entry, not a rewrite.
- [ ] Scope row 29 owns the payment failure experience: a PIN timeout reads as normal, a pending payment shows what happens next, and the receipt arrives by email. This page only names the providers and shows a plain retry.
- [ ] Reconcile the dashboard plan grid, feature copy and credit discounts with the catalogue, or point its upgrade action at `/pricing`, so a student does not see a second, different offer behind the sign in wall.
- [ ] Confirm the 2,500 reading against the research: this spec reads it as the whole semester price, while the research basis names a monthly band of 1,600 to 5,000 FCFA. If 2,500 is meant per month, the semester price and the monthly line both change.
- [ ] Correct the scope index drift: `docs/scope/index.md` marks feature 17 "done" while `docs/scope/market.md` still says "needs a decision" and leaves the design task unchecked. Align the row when this spec is linked.

## Migration plan

**Strategy**: no migration needed. No schema change; prices and labels are code constants.

**Phases**:
1. Land the catalogue, the money path, the page and the metadata in one deploy.
2. Verify the price shown equals the price charged, including a `PENDING` subscription created before the deploy.
3. Update the dashboard import once the public page is live.

**Rollback**: revert the commit. No data is transformed, and existing `Subscription.amount` rows keep their stored amount.

**Risks**: a `PENDING` subscription created before the deploy may be activated after it. The webhook must use `Subscription.amount` for the receipt and commission, not the new catalogue price, or the student is told a different amount than they paid.
