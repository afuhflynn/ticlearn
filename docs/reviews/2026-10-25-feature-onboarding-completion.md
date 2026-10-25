# Review, feature/onboarding-completion, 2026-10-25

**Reviewed by**: meta/muse-spark-1.1 (author on opus)
**Scope**: 14 files, branch vs main
**Verdict**: Approve with nits

## Summary

The pricing page change rebuilds the public pricing surface around spec 0019: one plan catalogue in `constants/plans.ts` that is the single source of truth for every plan's price, label, period and features; the public page shows Free and Semester Pass (2,500 FCFA per semester) with bullets read from `FREE_LIMITS` and `PAID_LIMITS.PRO`; the payment route, webhook and manual route all read the catalogue so the price shown equals the price charged; and the page carries its own metadata with the plan cards as the only client island. Tests cover AC-1 through AC-8. The change is clean and correct; no blockers or majors. A few minor issues around swallowed errors and a raw `fetch` call, plus small nits, are listed below.

## Minor

### 🟡 Swallowed subscription-fetch error hides plan state, `components/marketing/pricing-plans.tsx:45`

**Problem**: The `useEffect` that reads the student's subscription ends with `.catch(() => {})`, which swallows every error silently. When the read fails, `subscription` stays `null`, so `currentPlan` becomes `"FREE"` and `isActive` becomes `false`. The page then shows the student as if they have no active plan, even if they do, and offers the "Start Semester Pass" button they may already have paid for.

**Why it matters**: A transient API failure can make a paying student see the wrong plan state and be offered a purchase they don't need. There is no user-facing signal that the read failed.

**Suggested fix**: Replace the empty catch with error handling that at least records the failure (e.g. sets an error state or logs it), so the page doesn't silently misrepresent the student's plan.

### 🟡 Raw `fetch` bypasses the api client, `components/marketing/pricing-plans.tsx:62`

**Problem**: `handleSubscribe` calls `fetch("/api/payment/initiate", ...)` directly instead of going through `lib/api-client.ts`. AGENTS.md states: "Client calls go through `lib/api-client.ts` on top of `config/axios.config.ts`. Do not add a new raw `fetch` path next to it."

**Why it matters**: This bypasses the shared axios config, base URL, error handling, and retry behaviour the rest of the app uses. It is a second, divergent HTTP path for the same job, which is exactly the kind of drift the repository rule against competing abstractions exists to stop.

**Suggested fix**: Route the payment initiation through `api` (e.g. `api.mutations.payment.initiate({ plan: planKey })`) so it shares config and error handling with the rest of the client layer.

## Nits

### ⚪ `tests/constants/plans.test.ts:36` — weak hint on integer assertion

**Problem**: `expect(Number.isInteger(plan.priceXaf), plan.label).toBe(true)` passes `plan.label` as a vitest hint, but hints are only shown on failure and don't describe what failed. It's easier to read as `expect(plan.priceXaf).toBeInteger()`.

**Suggested fix**: Use `expect(plan.priceXaf).toBeInteger()` or give the hint a more descriptive message.

## Strengths

- One plan catalogue replaces four duplicate price maps; the page, payment route, webhook, manual route and dashboard all read it, so price shown equals price charged by construction.
- Free bullets read from `FREE_LIMITS` (2 notes, 4 quizzes, 8 Tip messages a day) and Semester Pass bullets from `PAID_LIMITS.PRO` (all unlimited), so they cannot drift from the enforced limits.
- The webhook fails closed when `FAPSHI_WEBHOOK_SECRET` is unset, uses `Subscription.amount` for the receipt and commission (ignoring the body `amount`), and ignores stale callbacks whose `transId` differs from the stored `fapshiTransId`.
- The page is a server component with heading, copy and metadata in the first HTML; only the plan cards are a client island (AC-10).
- Tests cover AC-1 through AC-8, including signed-out redirect to `/sign-in?callbackUrl=/pricing`, signed-in payment initiation, current-plan state, pending-payment state, and plain-error retry.

## Test coverage

`TESTS = configured` (vitest). The change is well covered:
- `tests/constants/plans.test.ts` covers AC-1, AC-2, AC-3, AC-4, AC-6 (catalogue integrity, prices, bullets from limits).
- `tests/app/(marketing)/pricing/page.test.tsx` covers AC-9 (metadata) and AC-10 (server-rendered heading/copy).
- `tests/components/marketing/pricing-plans.test.tsx` covers AC-7 (sign-in redirect, payment initiation, current plan, free signup link) and AC-8 (plain notices on failure, retry).
- `tests/app/api/webhooks/fapshi.test.ts` covers AC-6 (stale transId ignored, subscription activated, wrong secret rejected).

No new logic in the changed files is left untested.
