# 0001 b. Abuse limits and the rate limit layer

Child of [0001](../index.md). Cost and abuse resistance. Governed by the umbrella, no lifecycle status here.

## Summary

Arcjet rate limiting is written and never switched on, so every AI, upload, contact and admin route is unmetered. This child builds the shared limit layer, applies it in two places so coverage cannot be forgotten, calls the named per family buckets from every route with token bucket numbers tuned for students on mobile data, and makes every denial visible in the log.

## Requirements

- **AC-6**: Every route under `app/api/` calls `limit(bucket, request)` or is on the named exempt list (the Inngest serve route, the auth catch all POST, and the generated UploadThing handler). A coarse address only baseline covers `/api/*` in `proxy.ts` regardless. A code shape test fails when a route is missing the call.
- **AC-7**: A denied request returns 429 with a JSON body and writes one `rate_limit_denied` log line naming the route and bucket, with a hashed fingerprint and no personal data in it.
- **AC-8**: Sending a one time passcode is limited to three per ten minutes per address and three per ten minutes per address hash, applied inside the better-auth send handler where the address is known. The fourth send returns 429.
- **AC-18**: The Fapshi webhook path is not subject to bot detection, while shield and rate limiting still apply.
- **AC-21**: The chat uploader accepts at most 4 images per request.
- **AC-22**: The Inngest note process job has a concurrency cap, and the four parsers are watched in the dependency gate.
- **AC-23**: `vercel.json` carries rate limit rules as reviewed code, including a body size cap on the JSON AI and notes routes.
- **AC-25**: When the Arcjet cloud check does not answer within two seconds and the request is allowed through, one `arcjet_fail_open` log line is written.

## Decision

**Chosen**: keep Arcjet and apply it in two places. A coarse address only baseline in `proxy.ts` covers every `/api` path whether or not anyone remembers a route, and the named per family buckets are called from each handler where the session user is available. Token buckets with the research numbers, a second one time passcode bucket keyed on a hand rolled address hash, bot detection excluded from the payment webhook, and Arcjet's fail open behaviour accepted with a loud log event.

## Feature design

**Data model**: none. Counters live in Arcjet. Denials are `console.log` JSON lines, not table rows, so no schema change and nothing to migrate.

**Handler shape**: `limit(bucket, request)` needs the request, because the address key comes from `@arcjet/ip`, which needs a request object. 41 of the 143 handlers currently take no arguments at all, so the metered ones gain the `(request: Request)` shape. This is mechanical and is its own build task in the umbrella plan, because the helper cannot exist without it.

**Baseline (proxy)**: a token bucket on `/api/:path*`, address only, refill 20 per minute, capacity 60, inside the single Arcjet client in `proxy.ts`. It applies to every API route including ones nobody remembered, including the three exempt ones, which is the point: the baseline is a floor, not the policy. The Inngest serve route is exempt from this specific concern only if Inngest request signing is confirmed enabled, which is an open verification item, so the baseline covers it too unless that check passes.

**Named buckets** (all token buckets, characteristics `userId` and `ip.src` unless noted; every call passes `requested: 1`, which the existing unused buckets never needed because nothing called them):

| Bucket | Applies to | Refill | Capacity | Reasoning |
|---|---|---|---|---|
| `aiChat` | `/api/ai/chat` | 2 per minute | 10 | each message is a Gemini call with up to 5 tool steps, so bursts are real and sustained rates are not |
| `paper3Chat` | `/api/paper3/chat` | 1 per minute | 5 | in exam, stricter than general chat, on top of the existing 4 message exam limit |
| `generate` | quiz and mock generation routes | 1 per minute | 5 | the most expensive operations in the app, plus the daily cap already in those handlers |
| `upload` | note processing paths (`/api/notes/process`, `/api/notes/[id]/process`) and the UploadThing handler | 5 per hour | 10 | every processed note triggers PDF parsing or OCR |
| `contact` | `/api/contact` | 1 per hour | 3 | unauthenticated and sends email, so this is the cheapest high value limit in the set |
| `admin` | `/api/admin/*` | 30 per minute | 100 | admin is a handful of people; generous so nobody is locked out |
| `webhook` | `/api/webhooks/fapshi` | 30 per minute | 60, keyed `ip.src` only | must never drop a real payment; Fapshi retries |
| `baseline` | every other `/api/*`, in the proxy | 20 per minute | 60, keyed `ip.src` only | the floor |
| `otpIp` | one time passcode send | 1 per 10 minutes | 3 | the email bomb fix, per address |
| `otpEmail` | one time passcode send | 1 per 10 minutes | 3, keyed on a custom `emailHash` | a rotating address list still cannot bomb one inbox |

Note creation itself is **not** in the `upload` bucket. Plan note limits already cap how many notes a plan holds (FREE 2, STARTER 10), so metering creation too would cap a paying student at 11 uploads an hour regardless of plan. The bucket applies to the expensive path, which is processing.

**API surface** (module level, not endpoints):

| Export | Signature | Notes |
|---|---|---|
| `limit` | `limit(bucket: BucketName, request: Request): Promise<NextResponse \| null>` | returns null to continue, or the 429 response to return immediately |
| `limitOtpSend` | `limitOtpSend(request: Request, email: string): Promise<NextResponse \| null>` | runs `otpIp` then `otpEmail`; called from the better-auth send handler, hashing the address with sha256 before it leaves the server |
| `securityEvent` | `securityEvent({ event, route, bucket, fingerprint })` | one `console.log` JSON line; fingerprint is the first 12 characters of a sha256, never the raw id |

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| fingerprint, signed in | account key | `session.user.id` from better-auth, hashed before logging |
| fingerprint, anonymous | network key | `@arcjet/ip` on the request, falling back to `127.0.0.1` |
| OTP per address key | address fingerprint | sha256 of the email, computed inside `lib/auth.ts` where the send handler has it |
| bucket choice | which limit applies | the bucket named at the call site, assigned per route in the table below |
| denial log route name | which route denied | the request pathname |
| fail open detection | whether Arcjet answered in time | an own two second timer racing the Arcjet call inside `limit()`, because the returned decision object exposes no timeout signal |

**Route to bucket assignment** (the code shape test asserts only that a metered route contains a `limit(` call; this table is the source of truth for which bucket, and it is enumerated for all 143 routes at build time, not by family guesswork):

| Path family | Bucket |
|---|---|
| `/api/ai/chat` | `aiChat` |
| `/api/paper3/chat` | `paper3Chat` |
| `/api/quizzes/generate*`, `/api/mocks/generate*`, `/api/paper3/mocks/generate*` | `generate` |
| `/api/notes/process`, `/api/notes/[id]/process`, `/api/uploadthing` | `upload` |
| `/api/notes` (create, GET) | `baseline`, so plan limits stay the only cap on how many notes a plan holds |
| `/api/contact` | `contact` |
| `/api/admin/*` | `admin` |
| `/api/webhooks/fapshi` | `webhook` |
| everything else under `/api/*` | `baseline` |
| `/api/inngest` (serve) | exempt (Inngest signs its own requests) |
| `/api/auth/[...all]` POST | exempt (uses `protect()`) |
| `/api/uploadthing` handler generated by the SDK | exempt at the route level, metered at the UploadThing middleware instead |

**Key invariants**:
- No route family is unmetered. The proxy baseline covers routes the code shape test misses, and the test covers routes the baseline's path pattern misses.
- A denial is cheap and quiet for the caller: 429 plus a JSON body, never a stack trace.
- Bot detection never runs on a path that carries money.
- Nothing personal is written to the log; the fingerprint is a hash prefix.

**Critical test scenarios**:
- Happy path: a signed in student sending three chat messages in a burst is allowed, verifies **AC-6**.
- Failure case: the eleventh chat message inside a minute returns 429 and writes one log line whose fingerprint is not the account id, verifies **AC-7**.
- Failure case: four one time passcode sends for one address return 429 on the fourth, verifies **AC-8**.
- Availability: a webhook POST is not blocked by bot detection and is still limited, verifies **AC-18**.
- Failure case: when Arcjet cannot be reached within its timeout the request proceeds and one `arcjet_fail_open` line is written, verifies **AC-25**.
- Coverage: a route with no `limit(` call fails the code shape test, and a route outside the test's scan is still covered by the proxy baseline, verifies **AC-6**.

## Build plan

1. Build `lib/rate-limit.ts` with the bucket table, `limit`, `limitOtpSend`, `securityEvent`, and a single Arcjet client that replaces the three unused buckets and the duplicate client in `proxy.ts`. Satisfies **AC-6**, **AC-7**, **AC-25**.
2. Add the coarse address only baseline bucket to the `proxy.ts` client, applied to `/api/:path*`. Satisfies **AC-6**.
3. Give the metered route handlers the `(request: Request)` shape, then call `limit()` in every route family per the assignment table, and add the code shape test over `app/**/route.ts`. Satisfies **AC-6**.
4. Call `limitOtpSend` inside `lib/auth.ts` `sendVerificationOTP`, which is the only place the address is available, and add the two OTP buckets with the custom `emailHash` characteristic. Satisfies **AC-8**.
5. Exclude the Fapshi webhook path from bot detection in the `proxy.ts` middleware rule, keeping shield and the webhook bucket. Satisfies **AC-18**.
6. Cut chat uploader images to 4 and apply the `upload` bucket to the processing paths and the UploadThing middleware. Satisfies **AC-21**.
7. Cap the Inngest note process concurrency and add the four parsers to the watched list in the dependency gate. Satisfies **AC-22**.
8. Add `vercel.json` rate limit rules and the JSON body size caps. Satisfies **AC-23**.

## Consequences

**Positive**: the highest leverage finding in the audit closes with code that already existed and was not wired. Coverage no longer depends on a single test passing. Cost per abuse run becomes knowable. A student mid session is refused only in a way they can recover from.

**Negative / tradeoffs**: every metered request makes up to two Arcjet calls, the proxy's existing shield and bot check plus the bucket check. Cache misses cost 20 to 30 ms each, which lands on chat streaming start. Limits fail open after a two second Arcjet timeout, so an Arcjet outage reopens the abuse window and the only trace is a log line. Denials in `console.log` cannot be alerted on without a log drain. And a legitimate student who taps send ten times will be refused, which is intended but will generate at least one support message.

**Neutral**: no new packages and no schema change. The three unused Arcjet clients and the duplicate client in `proxy.ts` collapse into one, so the file shrinks. Buckets are defined in code, so tuning a number is a one line change. The Inngest serve route sits under the baseline unless its signing check passes, which is a verification item rather than an assumption.

## Rationale

The deciding force is the audience, and it decides three times. A fixed window or a sliding window punishes exactly the behaviour a student on a congested mobile network cannot avoid, which is retrying, so every limit is a token bucket and every capacity is well above the per minute refill. The fail open default is the second: failing closed on an Arcjet timeout would mean a study app that stops working because a third party had a bad minute, and the loss of abuse protection during that window is bounded and logged. The third is leaving note creation to the plan limits, because a paying student who has bought a note allowance should not discover it is metered an eleventh time an hour.

Adding the proxy baseline reverses an earlier decision in this design, and the reason is worth stating. A single `limit()` call per route is testable and explicit, but it makes a regex over 143 files the sole guarantee that no route is unmetered. The baseline is not testable per request, but it is testable by asserting its configuration, and it converts the largest single point of failure into defence in depth: forget a route and the baseline still applies. The two layers answer different questions, which is why both exist.

The one time passcode buckets live in `lib/auth.ts` rather than in the auth route because the route never sees the request body: better-auth consumes it, and the address is only available inside `sendVerificationOTP`, which is exactly where the limit belongs. Per address requires a hand rolled sha256 because Arcjet has no built in email characteristic, and passing a raw address to a third party would put personal data in someone else's request. Two characteristics in one rule make one fingerprint rather than two counters, which is why there are two rules and not one rule with two keys.