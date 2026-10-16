# Review, email system rebuild, 2026-10-17

**Reviewed by**: beam-free (author on sonnet; degraded, same-family review, no differing model available)
**Scope**: 52 files, uncommitted working tree
**Verdict**: Changes requested

## Summary

The rebuild replaces the inline template module with a table-based template system routed through Inngest, adds an EmailSuppression table and period-keyed EngagementLog, and ships a webhook/unsubscribe/dev-preview. The structure is sound and the pipeline works end to end. Two correctness issues stand out: failed sends return a result object instead of throwing, so Inngest never retries them (AC-5), and the templates do not escape user-controlled inputs (AC-2). Both are fixable without restructuring.

## Major

### 🟠 Failed sends do not throw, so Inngest never retries, `lib/email/send.ts:64`

**Problem**: `sendEmail` catches SMTP errors and returns `{ success: false, error }` instead of rethrowing. Every Inngest handler calls `renderAndSend`, which calls `sendEmail`, so a failed send resolves successfully and Inngest's retry policy never fires.

**Why it matters**: AC-5 requires retry with backoff up to four times on provider failure. With the current shape, a down SMTP provider silently drops the send and the function reports success. The dead-letter/retry story in the spec depends on throws.

**Suggested fix**: rethrow the error (or a wrapped Error) after the suppression check, so Inngest retries; keep the `{ success: false }` only for the suppression-skip path. Alternatively, return the result and have each Inngest handler throw when `result.success === false`.

### 🟠 Templates do not escape user-controlled inputs, `lib/email/layout.ts:151` and every template

**Problem**: The `text`, `h1`, `h2`, `link` helpers interpolate content verbatim. Templates pass `firstName`, `userName`, `subjectLine`, `message`, etc. straight in. AC-2 and the key invariant require escaping at render time. The test suite was written to assert escaping and had to be relaxed because it does not happen.

**Why it matters**: A malicious signup name containing markup injects HTML into verification and admin emails, which is exactly the injection the rebuild claims to close.

**Suggested fix**: escape in the helpers (`text`, `h1`, `h2` escape content; `link` escapes label and attribute-encodes url), or add an explicit `escapeHtml` at each interpolation site. Prefer the helper so no template can forget.

### 🟠 Weekly digest dispatch is serial with N+1, `lib/inngest/email-functions.ts:152`

**Problem**: `sendWeeklyDigest` loops over up to 200 users, calling `hasEmailOptedIn`, `nonDigestCountLastSevenDays`, and `renderAndSend` (which calls `isSuppressed`) per user, each a separate DB query. That is roughly 600 queries per run, serially.

**Why it matters**: On a 2 GB Android-class DB this is slow and can exceed Inngest's function timeout; the digest cron becomes a liability.

**Suggested fix**: batch the opt-in and suppression lookups with `findMany`/`in` filters, or move per-user sends into child Inngest events.

### 🟠 Webhook route reads `req.headers` but the spec shows signature verification; fine, but `getSecret` falls back to FAPSHI secret, `app/api/webhooks/email-provider/route.ts:24`

**Problem**: `getSecret()` returns `EMAIL_WEBHOOK_SECRET || WEBHOOK_SECRET`, and `WEBHOOK_SECRET` is the FAPSHI webhook secret in this codebase (see `lib/env.ts`). If only `FAPSHI_WEBHOOK_SECRET` is set, the email webhook silently reuses it, coupling two unrelated providers' trust domains.

**Why it matters**: A leak of one secret compromises the other; a misconfigured deploy authenticates email webhooks with a payment secret.

**Suggested fix**: require a dedicated `EMAIL_WEBHOOK_SECRET` (or document that `WEBHOOK_SECRET` is the email one) and fail closed when absent, matching the fapshi pattern.

## Minor

### 🟡 `computeReadiness` import left after dead-code removal, `lib/email/send.ts:4`

**Problem**: The import is now unused (removed with `hydrateEngagementData`). TypeScript allows unused imports by default here, so it compiles, but it is dead weight.

**Why it matters**: Lint noise, minor.

**Suggested fix**: remove the import (done in this pass).

### 🟡 `notifyAdminsOfFeedback` is fire-and-forget with no retry, `app/api/feedback/route.ts:78`

**Problem**: Called with `.catch(() => {})`. If the send fails, no one knows. Acceptable for a non-critical alert, but worth noting.

**Why it matters**: Admin alerts can silently disappear.

**Suggested fix**: enqueue through Inngest instead of calling `notifyAdminsOfFeedback` inline, so failures retry.

### 🟡 Unsubscribe token is base64 of a raw user id, `app/api/unsubscribe/[token]/route.ts:12`

**Problem**: The token is `base64url(userId)` with no signature. Anyone who guesses or enumerates a user id can unsubscribe them, and the token is reversible.

**Why it matters**: IDOR on unsubscribe; minor privacy issue.

**Suggested fix**: sign the token (HMAC of userId + expiry) or use a random stored token.

### 🟡 `sendEmail` returns `{ success: false }` on SMTP failure but the suppression regex is narrow, `lib/email/send.ts:70`

**Problem**: Only permanent-looking SMTP errors trigger suppression. A 4.4.1 or 4.2.2 (mailbox full / try again later) is not suppressed, which is correct, but the regex also misses provider-specific permanent codes.

**Why it matters**: Minor under-suppression.

**Suggested fix**: rely on the provider webhook as the source of truth and keep the regex as a best-effort fallback.

## Nits

- ⚪ `lib/email/transport.ts:1`, `nodemailer` is imported as default; fine, but the spec says Nodemailer stays under Resend SMTP. Ensure `SMTP_HOST` points at Resend in prod.
- ⚪ `lib/email/layout.ts:56`, logo CID uses `logo@ticlearn.ticsummit.org`; consistent with the corrected domain. Good.
- ⚪ `lib/inngest/email-functions.ts:193`, digest props hardcode `streak: 0, quizzes: 0, readinessPct: 0` instead of real data; the digest is currently a placeholder.

## Strengths

- Clean template registry (`isTemplate`, `TEMPLATES`) with a single render entry point; adding a template is localized.
- Suppression lookup sits at the top of `sendEmail`, so every path (transactional, lifecycle, payment, campaign) is covered.
- Frequency caps and opt-in checks live in the Inngest handler, not the request path, matching AC-5.
- The webhook route handles both single-event and array payloads and verifies a signature or bearer token.

## Test coverage

Covered: webhook signature/suppression (5 tests), template rendering (5 tests), unsubscribe (2 tests). Not covered: Inngest handler frequency caps and opt-in gating, `sendEmail` suppression-throw behavior (once fixed), digest dispatch, transport verification. AC-1/AC-3/AC-4/AC-6 are manual/operational and not automatable.
