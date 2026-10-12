# 0001 a. Route and payment hardening

Child of [0001](../index.md). Money and identity surfaces. Governed by the umbrella, no lifecycle status here.

## Summary

Close the four surfaces where an unauthenticated caller can move money or read data today. The Fapshi webhook fails closed and refuses replays, every admin route goes through one shared role guard, the contact form escapes its input, and three surfaces with no real user are deleted rather than filtered.

## Requirements

- **AC-1**: With `FAPSHI_WEBHOOK_SECRET` unset, the webhook returns 503 and writes no subscription row, no affiliate earning, and sends no email.
- **AC-2**: The webhook compares the bearer secret with a constant time comparison and returns 401 on mismatch, including the literal string `Bearer undefined`.
- **AC-3**: Replaying a captured SUCCESSFUL webhook with the same `transId` returns 200 and leaves subscription state, affiliate balances and the affiliate earning count unchanged, and a FAILED then SUCCESSFUL sequence with the same `transId` still activates the subscription.
- **AC-4**: Every route under `app/api/admin/` calls `requireAdmin()`, a code shape test fails when one does not, and a non admin session gets 403 from each.
- **AC-5**: `/api/admin/parse-status`, `/api/inngest/trigger` and the `searchKnowledge` tool no longer exist, and neither knowledge harvest job is registered or runs.
- **AC-9**: `POST /api/contact` HTML escapes all four fields, ignores submissions that fill the hidden spam field, and allows three an hour per address.

## Decision

**Chosen**: fail closed plus replay guard on the webhook, one shared `requireAdmin` for all admin routes, escaping plus a spam trap on contact, and deletion of the three surfaces with no real user. Delete rather than filter because the shared knowledge reader is undocumented in the system prompt and has no user facing feature behind it, the mail relay route has only internal callers, and the parse status route ignores the id it is passed.

## Feature design

**Data model**:

| Entity | Field | Type | Rule |
|---|---|---|---|
| `affiliate_earnings` | `fapshi_trans_id` | `String?` | unique index, nullable, mapped to `fapshi_trans_id` |

No other change. The nullable add needs no backfill and Postgres allows many nulls in a unique index. `subscriptions.fapshi_trans_id` is already unique, and `credit_purchase_orders.fapshi_trans_id` is already unique and already guards the credit branch through `lib/credit-purchase-fulfillment.ts`, which re-reads the order inside a transaction and bails unless it is still `PENDING`.

**Replay guard, stated exactly** (this is the subtle part):

- The subscription guard is **not** "this transaction id is already on the row". The FAILED and EXPIRED branches write that column today, so a FAILED then SUCCESSFUL sequence for the same transaction would early return and never activate a customer who actually paid. The guard is: **if the subscription is already `ACTIVE` and its `fapshiTransId` equals the incoming `transId`, return 200 and write nothing.**
- `affiliateEarning` is created with an upsert keyed on `fapshiTransId`, so one transaction can never mint two commission rows.
- A genuinely second payment for the same student carries a new `transId`, passes the guard (the subscription is ACTIVE but with a different id), overwrites the subscription's transaction id, and creates its own commission row. That is a real second sale, so a second commission is correct. Replaying the first payment afterwards is caught by the affiliate upsert on that first `transId`, which still exists on the earnings table even though the subscription column has moved on.
- The credit branch keys on the order prefix, finds the `CreditPurchaseOrder` by its own unique `fapshiTransId`, returns 404 when the order is unknown, and otherwise delegates to the existing idempotent fulfilment. No change to that logic, only the documented contract.

**State transitions** (subscription, unchanged in shape, hardened in effect):

| From | Event | To | Guard |
|---|---|---|---|
| `PENDING` | verified, non replayed SUCCESSFUL webhook | `ACTIVE` | secret present, matches, and not (already ACTIVE with this same transaction id) |
| `ACTIVE` with the same transaction id | replayed webhook | `ACTIVE` (unchanged) | early return 200, no writes |
| `FAILED` with the same transaction id | SUCCESSFUL webhook | `ACTIVE` | the guard does not apply, because the row is not yet ACTIVE |
| any | secret unset | unchanged | 503, no writes |
| any | secret mismatch | unchanged | 401, no writes |

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/webhooks/fapshi` (subscription) | POST | `transId` (required non empty string), `status`, `externalId` (required string); body `amount` ignored | 200 on applied or replayed | bearer secret, fails closed | 401, 422 (missing or malformed), 503 (secret unset) |
| `/api/webhooks/fapshi` (credit) | POST | `externalId` with the credit order prefix, `transId`, `status` | 200 on fulfilled or already fulfilled | bearer secret, fails closed | 401, 404 (unknown order), 422, 503 |
| `/api/admin/*` (42 routes) | existing | unchanged | unchanged | session plus `requireAdmin` | 401, 403 |
| `/api/contact` | POST | `name`, `email`, `subject`, `message`, plus a hidden `website` field | `{ success: true }` | none | 422 invalid, 429 limited |
| `/api/inngest/trigger` | removed | n/a | n/a | n/a | 404 |

**Replacing the deleted route's callers**: `lib/inngest/trigger.ts` currently `fetch`es `/api/inngest/trigger` over HTTP, which fails in production where there is no loopback origin. It is rewritten to call `inngest.send()` directly. Its three call sites keep working unchanged: the `databaseHooks.user.create` block in `lib/auth.ts` (which fires on Google sign up), and `app/(auth)/verify-email/page.tsx`. This is a behaviour fix that falls out of the deletion, not extra scope.

**Key invariants**:
- The webhook reads the expected secret from `lib/env.ts` and refuses to run without it.
- Amounts in receipts come from `PLAN_PRICES` and the stored subscription amount, never from the request body.
- `requireAdmin` is the only place an admin role check lives in a route file.
- A rejected webhook writes one `webhook_rejected` log line with no body content and no personal data.

**Configuration required**: none beyond `lib/env.ts`, which the umbrella builds. The compose variables live in the supply chain child.

## Build plan

1. Create the migration adding `fapshi_trans_id` to `affiliate_earnings` with its unique index. Satisfies **AC-3**.
2. Build `lib/require-admin.ts` returning the session or a 403 response. Satisfies **AC-4**.
3. Harden the webhook: fail closed on an unset secret, constant time compare, Zod body requiring a non empty `transId`, the ACTIVE plus same transaction guard, `affiliateEarning` upsert on the transaction id, the documented credit branch contract including its 404, and stored amount in receipts. Satisfies **AC-1**, **AC-2**, **AC-3**.
4. Refactor all 42 admin routes onto `requireAdmin()`. Satisfies **AC-4**.
5. Delete `/api/admin/parse-status/[jobId]`. Rewrite `lib/inngest/trigger.ts` to call `inngest.send()` directly, then delete `/api/inngest/trigger` and confirm the Google sign up hook and the verify email page still trigger. Satisfies **AC-5**.
6. Delete the `searchKnowledge` tool, and unregister both `harvestNoteKnowledge` and `harvestPaper3Knowledge` from the Inngest registry, leaving the shared knowledge table untouched for existing rows. Satisfies **AC-5**.
7. Escape all four contact fields, add the hidden spam field, and apply the contact rate limit. Satisfies **AC-9**.

## Consequences

**Positive**: a replayed webhook is a no op, so commission cannot be minted twice. The FAILED then SUCCESSFUL case still activates the customer, which a naive transaction id guard would have broken. Admin authorisation becomes one name the test can require. Three surfaces that were pure risk are gone.

**Negative / tradeoffs**: 42 admin routes change, and any custom response shape a route relied on has to be preserved by hand. Deleting the mail relay route means no supported way to send a welcome email by hand from the admin UI, which someone will ask for. Deleting the harvest jobs stops a per note AI extraction pass, which also means note processing gets cheaper. Rewriting the trigger helper is a behaviour fix to a sign up path, so the Google sign up and verify email flows need a manual pass after the change.

**Neutral**: the migration adds a nullable column and a unique index, is safe to apply on a live database, and reverts by dropping the index. Existing affiliate earning rows keep a null transaction id and can never be mistaken for a replay.

## Rationale

The pattern in `createQuiz` at `lib/ai/tools.ts:463-474`, which re-queries the note with the user id in the where clause and throws, is the correct shape for an authorisation check, and it already exists in this codebase. `requireAdmin` applies the same idea to the role check, and the difference is that it gets a name, so a test can require it by name across all 42 files instead of a human reading 42 files.

The replay guard is the one place where the obvious implementation is wrong, and the wrong version is invisible until a customer complains. Guarding on the transaction id alone looks equivalent to guarding on the replay, because that column is unique. It is not equivalent: the FAILED and EXPIRED branches already write it, so the guard would swallow the successful retry of a payment Fapshi reported as failed and then retried under the same transaction. Guarding on `ACTIVE` plus the id states the actual invariant, which is "this payment has already been applied", and leaves the failure path alone.

Deleting rather than filtering is the call with a real cost. A filter on `searchKnowledge` means an owner column and a trust label on every chunk, a harvester that writes them, and a reader that honours them, all to serve a tool the system prompt never mentions. Nobody's product depends on it. If official cross user material is wanted later, the right build is a scoped reader with official content ingested on purpose, which is a better afternoon's work than retrofitting trust labels onto student uploads.