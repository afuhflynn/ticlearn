# 0001. Close the security and integrity holes before real students arrive

**Date**: 2026-10-12
**Status**: Proposed

## Summary

Twenty findings in the security audit have to close before real students use this app. A payment webhook that grants a subscription when its secret is unset, an admin route with no role check, a knowledge search that reads every user's notes, rate limiting that is written but never switched on, and an exam endpoint that can send answers to a phone. This spec decides how each hole closes, in shared code rather than twenty patches. It splits into four child specs, one per surface, all resting on the same four shared modules.

## Structure

| Child spec | What it is | Decision it carries |
|---|---|---|
| [0001-route-and-payment-hardening.md](0001-route-and-payment-hardening.md) | Webhook fail closed, replay protection, the admin guard, the contact form, deleting the leaky surfaces | Money and identity surfaces |
| [0001-abuse-limits.md](0001-abuse-limits.md) | The rate limit layer: buckets per route family, the proxy baseline, denial logs, bot detection scope | Cost and abuse resistance |
| [0001-ai-boundaries.md](0001-ai-boundaries.md) | Tool policy wrapper, deleting cross user knowledge reads, web search scrubbing, quiz creation boundaries, note upload URLs | Prompt injection blast radius and server side fetching |
| [0001-supply-chain-and-deploy-headers.md](0001-supply-chain-and-deploy-headers.md) | First CI workflow, dependency gate, security headers, compose credentials, edge rules, Renovate | Supply chain and deploy surface |

### Cross child contract

Four modules are built once, in the first build slice, and every child imports them. No child may invent its own version.

1. **`lib/env.ts`**: one zod validated module for the security critical server secrets. It is split by runtime. The Edge side, imported by `proxy.ts`, validates `ARCJET_KEY` only and never imports Prisma or any Node only module. The Node side validates `BETTER_AUTH_TRUSTED_ORIGINS` and `FAPSHI_WEBHOOK_SECRET` as well. Boot fails in production when a required value is missing or still holds its template placeholder. `FAPSHI_WEBHOOK_SECRET` is not a boot requirement, because a deploy can run without payments, and it is checked per request instead, returning 503.
2. **`lib/rate-limit.ts`**: the bucket table plus one `limit(bucket, request)` call a route makes at the top of its handler. It takes the request because the address key comes from the request, so every route handler that meters has the shape `(request: Request)`. It returns `null` to continue or a 429 `NextResponse` to return immediately. Declared characteristics are `userId` and `ip.src`. The one time passcode path declares an extra custom `emailHash` and uses a second rule, because Arcjet has no built in email characteristic and two characteristics in one rule make one fingerprint, not two counters.
3. **`lib/require-admin.ts`**: `requireAdmin()` returns the session, or a 403 `NextResponse` the route returns immediately. All 42 admin routes call it. No wrapper layer, no error boundary.
4. **`lib/ai/tool-policy.ts`**: `wrapTool(tool, policy)` runs a named policy between the model's proposed arguments and `execute`. Every chat tool in both chat tool sets goes through it, so a new tool cannot skip it by accident.

Security events are written with `console.log` as one JSON object per line, matching the repo's existing use of `console`. No logger is installed and none is added here. The shape is `{ event, route, bucket, fingerprint }`, where `fingerprint` is the first 12 characters of a sha256 of the account id or the address, never the raw value, so no personal data reaches the log. The events are `rate_limit_denied`, `arcjet_fail_open`, and `webhook_rejected`. Field queryable log search is a follow up.

## Requirements

**User stories**:
- As the owner, I want a forged payment callback to change nothing so that subscription state and affiliate balances cannot be moved by a stranger.
- As a student, I want my notes, results and conversations to be unreachable by anyone else so that I can trust the platform with real work.
- As the owner, I want every AI and upload route metered so that one account cannot spend my Gemini and Tavily budget in an afternoon.
- As a student, I want a fake reviewer or a bot to be refused quietly so that my inbox and my study session are not ruined by either.
- As the owner, I want the app to refuse to start when a secret is missing so that a placeholder key never looks like a healthy deploy.

**Acceptance criteria** (the contract, each independently checkable):

- **AC-1**: With `FAPSHI_WEBHOOK_SECRET` unset, `POST /api/webhooks/fapshi` returns 503 and writes no subscription row, no affiliate earning, and sends no email.
- **AC-2**: The webhook compares the bearer secret with a constant time comparison and returns 401 on mismatch, including the literal string `Bearer undefined`.
- **AC-3**: Replaying a captured SUCCESSFUL webhook with the same `transId` returns 200 and leaves subscription state, affiliate balances and the affiliate earning count unchanged, and a FAILED then SUCCESSFUL sequence with the same `transId` still activates the subscription.
- **AC-4**: Every route under `app/api/admin/` calls `requireAdmin()`, and a code shape test fails when one does not. A non admin session gets 403 from each of them.
- **AC-5**: `/api/admin/parse-status`, `/api/inngest/trigger` and the `searchKnowledge` tool no longer exist, and neither knowledge harvest job is registered or runs.
- **AC-6**: Every route under `app/api/` calls `limit(bucket, request)` or is on the named exempt list (the Inngest serve route, the auth catch all POST, and the generated UploadThing handler). A coarse address only baseline covers `/api/*` in `proxy.ts` regardless. A code shape test fails when a route is missing the call.
- **AC-7**: A denied request returns 429 with a JSON body and writes one `rate_limit_denied` log line naming the route and bucket, with a hashed fingerprint and no personal data in it.
- **AC-8**: Sending a one time passcode is limited to three per ten minutes per address and three per ten minutes per address hash, applied inside the better-auth send handler where the address is known. The fourth send for the same address returns 429.
- **AC-9**: `POST /api/contact` HTML escapes name, email, subject and message, ignores any submission that fills the hidden spam field, and allows three an hour per address.
- **AC-10**: A note create request's `fileUrl` value is ignored and the stored URL is derived server side from the upload key, and the fetcher refuses private, loopback and link local addresses and does not follow redirects. The same rule applies to the admin question ingest route, which also takes a client URL that a worker fetches.
- **AC-11**: Every chat tool in both chat tool sets is wrapped by `wrapTool`, no tool returns a raw `extractedText` field, and no tool queries Prisma without a user scope, either directly in the where clause or inside an OR branch, with the public quiz branch as the only allowlisted exception. A code shape test fails otherwise.
- **AC-12**: `webSearch` refuses (returns a plain refusal, no search performed) when the query contains an email address, a phone like digit run, a long digit run, or instruction shaped text, and truncates each returned result to about 2000 characters.
- **AC-13**: `createQuiz` no longer accepts `isPublic` from the model, and creates the quiz with `isPublic: false`.
- **AC-14**: `POST /api/ai/chat` returns 400 when `messages` has more than 50 entries or any text part is longer than 8000 characters, and no model call is made.
- **AC-15**: In production the app fails to boot when `ARCJET_KEY` or `BETTER_AUTH_TRUSTED_ORIGINS` is missing or equal to a template placeholder; no `as string` cast hides it, and the Edge side of the env module never imports Prisma.
- **AC-16**: better-auth `trustedOrigins` is read from `BETTER_AUTH_TRUSTED_ORIGINS`, falling back to `NEXT_PUBLIC_APP_URL` only when the server variable is absent.
- **AC-17**: `docker-compose.yml` takes every credential and identifier from environment substitution and binds both services to `127.0.0.1`. No password or user literal remains in the tracked file.
- **AC-18**: The Fapshi webhook path is not subject to bot detection, while shield and rate limiting still apply to it.
- **AC-19**: Every response carries `Content-Security-Policy` (static, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`, `img-src 'self' blob: data: https://*.ufs.sh https://*.utfs.io`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options` and `Permissions-Policy`. Static rendering and CDN caching keep working.
- **AC-20**: A GitHub Actions workflow runs on pull requests and nightly: frozen lockfile install, `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm audit --audit-level=high` with a commented allowlist file, `osv-scanner` on the lockfile, `gitleaks` over history, and a hard fail on any advisory in `pdf-parse`, `pdfjs-dist`, `mammoth` or `tesseract.js`.
- **AC-21**: The chat uploader accepts at most 4 images per request.
- **AC-22**: The Inngest note process job has a concurrency cap, and the four parsers are watched in the dependency gate.
- **AC-23**: `vercel.json` carries rate limit rules as reviewed code, including a body size cap on the JSON AI and notes routes.
- **AC-24**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (72 hours in minutes), and `renovate.json` at the repo root opens grouped pull requests with no auto merge for `better-auth`, `next`, `ai`, `@ai-sdk/*` and the PDF parsers.
- **AC-25**: When the Arcjet cloud check does not answer within two seconds and the request is allowed through, one `arcjet_fail_open` log line is written, detected by racing the Arcjet call against an own timer, since the decision object carries no timeout signal.

## Decision

**Chosen option**: Option 4 in `rationale.md`, close the concrete leaks in code with shared guards, on the existing stack.

Every hole is closed by code that decides, never by instructions in a prompt. Three surfaces with no real user are deleted rather than filtered. Rate limiting stays with Arcjet because the buckets already exist and it is the only layer that limits per signed in account, and it is applied in two places: a coarse address only baseline in the proxy so coverage cannot be forgotten, plus the named per family buckets in each route. The tool boundary is a 30 line hand rolled wrapper because the Arcjet Guard adapter is documented for AI SDK v7 and this project is on v6. The content security policy is a static header because a nonce policy would force every page to render per request and turn off CDN caching, which hurts exactly the phone audience in the scope.

**Implementation skills**: none. This repo has no installed community skills for its stack yet; the conventions that matter live in root `AGENTS.md` and the nested `app/api/AGENTS.md`, `lib/ai/AGENTS.md` and `prisma/AGENTS.md`.

## Feature design

**Shared modules** (built in the first slice; signatures below are the contract the children import):

| Module | Exports | Consumed by |
|---|---|---|
| `lib/env.ts` | `arcjetKey` (Edge safe), `trustedOrigins`, `webhookSecret`, each validated, typed | `proxy.ts`, `lib/auth.ts`, `lib/arcjet.ts`, the webhook, the rate limit layer |
| `lib/rate-limit.ts` | `limit(bucket, request)`, `limitOtpSend(request, email)`, the bucket table | every route under `app/api/`, and the better-auth OTP handler in `lib/auth.ts` |
| `lib/require-admin.ts` | `requireAdmin()` | every route under `app/api/admin/` |
| `lib/ai/tool-policy.ts` | `wrapTool(tool, policy)` and the policy set | `lib/ai/tools.ts` for both the general chat and the Paper 3 exam tool sets |

**Data model target** (one migration, owned by the route and payment child):

| Entity | Change | Notes |
|---|---|---|
| `affiliate_earnings` | add `fapshi_trans_id String?` with a unique index | nullable, so existing rows need no backfill and Postgres allows many nulls |

No other schema changes. Rate limit counters live in Arcjet, not in the database, denial records go to the application log rather than a new table, and replay protection reuses the transaction id columns that already exist on `subscriptions` and `credit_purchase_orders`.

**Security model** (cross child): sessions come from better-auth and are unchanged. Admin means `session.user.role === "ADMIN"` and nothing else. Every chat tool argument is checked in code against the `userId` captured when the tool factory was built, never against a value from the document. Payments are the only externally authenticated path besides Arcjet, and that path fails closed. This slice introduces no new compliance scope: no card data is stored (payments sit at Fapshi), and the personal data touched is account and study content already covered by Cameroonian data protection expectations.

**Configuration required**:

- `ARCJET_KEY`: already exists. Now validated at boot, placeholder values rejected.
- `BETTER_AUTH_TRUSTED_ORIGINS`: already documented but unused. Now required in production, comma separated list of origins.
- `FAPSHI_WEBHOOK_SECRET`: already exists. Now fails closed per request.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`: compose variables, read from an untracked `.env`.
- No new packages. No new credentials.

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| Webhook verification | expected secret | `lib/env.ts`, from `FAPSHI_WEBHOOK_SECRET` |
| Webhook replay check | already applied transaction | `subscriptions.fapshi_trans_id` plus `status`, and `credit_purchase_orders.fapshi_trans_id` |
| Admin guard decision | role | `session.user.role` from better-auth |
| Limit fingerprint, signed in | account key | `session.user.id`, hashed before it reaches a log or a decision |
| Limit fingerprint, anonymous | network key | `@arcjet/ip` on the request, falling back to `127.0.0.1` |
| OTP per address key | address fingerprint | sha256 of the requested email, computed in `lib/auth.ts` where the address is known |
| Denial log route name | which route denied | the request pathname |
| Fail open detection | whether Arcjet answered in time | an own two second timer racing the Arcjet call in `limit()` |
| Note file location | where the worker fetches bytes | derived server side from the upload key, ignoring the client's `fileUrl`, then range checked |
| Web search refusal | reason refused | the query string itself, checked by the tool policy |
| Contact spam trap | whether to answer | the hidden field's value in the request body |
| CI watched packages | which packages are watched | the list in the workflow file |
| Content security policy image hosts | which remote images load | the UploadThing hosts already in use (`ufs.sh`, `utfs.io`), enumerated in the child |

**Key invariants**:
- No prompt line is ever the only control. A prompt may ask the model to behave; the code decides.
- No client supplied URL is ever fetched by the server. The stored URL is derived server side.
- No chat tool returns raw extracted note text to the model.
- No write reaches the database without a scope check in the handler.
- Money moving always requires a verified, non replayed webhook.
- No route family is unmetered, by construction in the proxy and by name in the handler.

**Critical test scenarios**:
- Happy path: a real payment webhook with a correct secret activates the subscription once and creates one affiliate earning, verifies **AC-1**, **AC-3**.
- Failure case: the same webhook replayed ten times in a minute produces one affiliate earning row and one balance change, verifies **AC-3**.
- Failure case: a FAILED webhook then a SUCCESSFUL webhook with the same `transId` activates the subscription, verifies **AC-3**.
- Failure case: an unset webhook secret returns 503 with no writes at all, verifies **AC-1**, **AC-2**.
- Auth: a signed in non admin session calling every admin route gets 403, verifies **AC-4**.
- Auth: a note body containing injection instructions cannot cause a public quiz, cannot reach another user's notes, and cannot put a private string into a web search query, verifies **AC-11**, **AC-12**, **AC-13**.
- Cost: a scripted caller hitting the chat route in a loop is refused after the bucket empties, verifies **AC-6**, **AC-7**.

## Build plan

Project approach is **Tracer Bullet** (root `AGENTS.md`): a thin thread through every layer first, then thicken. Applied here that means the shared modules plus one full fix path plus the CI gate go in first, so every later fix lands on a harness that can prove it. Nothing ships before the harness exists.

1. Stand up the harness: vitest config (node environment, colocated tests), the `typecheck` script, and a first GitHub Actions workflow running frozen lockfile, typecheck, lint and tests. Satisfies **AC-20**.
2. Build the four shared modules: the split `lib/env.ts`, `lib/rate-limit.ts`, `lib/require-admin.ts`, `lib/ai/tool-policy.ts`, the `console` JSON security event line, and the coarse address only baseline in `proxy.ts`. Satisfies **AC-15**, **AC-6**, **AC-4**, **AC-11**.
3. Give every route handler the `(request: Request)` shape it needs to meter, then call `limit()` in each route family with the bucket assignment enumerated in the abuse limits child, and add the code shape test. Satisfies **AC-6**.
4. First full vertical fix: the Fapshi webhook (fail closed, constant time compare, Zod body, ACTIVE plus same transaction guard, affiliate upsert, credit branch spec, stored amount in receipts) with its migration and its tests. This is the one path that touches money, so it proves the pattern end to end. Satisfies **AC-1**, **AC-2**, **AC-3**.
5. Route and payment child in full: admin guard across all 42 routes, contact escaping and spam trap, replacing the internal trigger helper with a direct `inngest.send`, deleting the three leaky surfaces and both harvest jobs. Satisfies **AC-4**, **AC-5**, **AC-9**.
6. Abuse limits child in full: OTP buckets inside the better-auth send handler, denial and fail open logs, bot detection exclusion for the webhook, `vercel.json` rules, upload caps, note job concurrency. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-18**, **AC-21**, **AC-22**, **AC-23**, **AC-25**.
7. AI boundaries child in full: wrap every tool in both tool sets, drop raw text returns, scrub and truncate web search, remove `isPublic` from the model, cap chat input, derive note and ingest URLs server side. Satisfies **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**.
8. Supply chain and deploy surface child in full: headers with the enumerated image hosts, compose credentials and identifiers, `BETTER_AUTH_TRUSTED_ORIGINS`, dependency gate additions and allowlist file, `minimumReleaseAge`, `renovate.json`. Satisfies **AC-16**, **AC-17**, **AC-19**, **AC-20**, **AC-24**.
9. Prove the whole thing: run the code shape suite and the full test suite in CI, then walk every AC once against the running app. Satisfies **AC-1** through **AC-25**.

## Consequences

**Positive**:
- Money can no longer be granted by a guessed header, and commission can no longer be minted by a replay.
- No student's notes are readable by another student, and an uploaded note can no longer steer what the model does.
- AI and upload spend is bounded per account, so an abuse run costs you a known amount.
- Coverage of the rate limit layer no longer depends on a single test: the proxy baseline applies whether or not anyone remembers a route.

**Negative / tradeoffs**:
- Roughly 42 admin routes, 143 route handlers and 11 chat tools across two tool sets change. That is a large diff for one slice, and review will take real time.
- Every metered request now makes up to two Arcjet calls (the proxy's shield and bot check, plus the bucket check). Cached decisions are local and under a millisecond; cache misses cost 20 to 30 ms each.
- Strict limits will occasionally refuse a legitimate student on a bad mobile connection. The numbers are tuned for token buckets to absorb retries, but capacity 10 on chat is still a refusal if you tap send ten times.
- Rate limits fail open after a two second Arcjet timeout. A student mid session keeps working, but the abuse window during an Arcjet outage is real and only visible in the log.
- Deleting `searchKnowledge` and both harvest jobs removes a capability the team wanted. Any future cross user knowledge needs a scoped, owner filtered reader built on purpose.
- The note create payload keeps `fileUrl` for compatibility with three existing readers, but its value is now ignored. That is a field the client can still send and the server will not trust, which needs a comment in the schema so nobody later believes it is used.
- The OTP per address bucket needs a hand rolled email hash, because Arcjet has no built in email characteristic.
- The static content security policy allows inline scripts, so it is real defence in depth but not a strict policy against XSS.

**Neutral**:
- One nullable column and one unique index in `affiliate_earnings`. No data backfill, no downtime, revertible by dropping the index.
- Zero new runtime packages. Test tooling is vitest, already in `package.json` with no config.
- Chat image uploads drop from 10 to 4 per request.
- The upload bucket applies to processing and the upload handler, not to note creation, so plan note limits still govern how many notes a plan can hold.
- The security critical env variables become a small validated module split by runtime. The remaining 40 odd variables stay as they are, and stay in scope item 9.

## Rationale

Reasoning, options, and the verification notes from reading the code are in [rationale.md](rationale.md).

## Follow-up

- [ ] Items 21 to 31 in `docs/research/security.md` stay open by design: tool approval on `createQuiz`, the read and write tool split, untrusted content envelopes, better-auth rate limit tuning, session lifetime, and the subscription manual overwrite. Each needs its own decision.
- [ ] Cloudflare in front of Vercel is deferred. If it is added, `advanced.ipAddress.ipAddressHeaders` must point at `cf-connecting-ip` in the same change or better-auth limits become spoofable.
- [ ] Item 9 in the scope (document all 46 environment variables) still owns the full `.env.example`. This spec only adds the compose variables and the security critical validation.
- [ ] A behavioural prompt injection suite and a scheduled re-run after model upgrades are deferred. The research's static architecture assertions are in this slice; the OWASP scaffold is not.
- [ ] `app/api/auth/[...all]/route.ts` exports a `GET` that destructures to `undefined` today, so every auth GET is already dead. That is unrelated to security hardening and belongs in its own fix.
- [ ] Security events go to `console.log` JSON lines for now. A real log drain (Vercel log drain or an aggregator) is needed before denials and fail opens can be alerted on or queried by field.
- [ ] `docs/research/security.md` marks several claims unverified (Arcjet behaviour on an undefined key, whether chat images reach the model as image parts, whether Inngest signing is enabled on `/api/inngest`). Close them while the relevant code is open for this work.
- [ ] No community skills are installed for the Next.js, better-auth, Arcjet or AI SDK conventions this work touches. The nested `AGENTS.md` files carry the conventions today; a skills based record would serve the next security change better.