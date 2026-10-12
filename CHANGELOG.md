# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Payment webhook hardening** — Fapshi webhook now fails closed when `FAPSHI_WEBHOOK_SECRET` is unset (returns 503), uses constant-time comparison for secret validation, and implements replay protection via `fapshi_trans_id` unique index on `affiliate_earnings`. FAILED→SUCCESSFUL sequences with the same transaction ID are allowed; duplicate SUCCESSFUL replays are idempotent.

- **Admin route authorization** — All 42 admin routes now call the shared `requireAdmin()` guard returning 403 for non-admin sessions. Leaky surfaces removed: `/api/admin/parse-status`, `/api/inngest/trigger`, `searchKnowledge` tool, and both knowledge harvest jobs (`harvestNoteKnowledge`, `harvestPaper3Knowledge`).

- **Rate limiting everywhere** — Coarse address-only baseline (60 req/min/IP) applied to all `/api/*` routes via `proxy.ts`. Per-route named buckets added via `lib/rate-limit.ts` (auth, AI, upload, quiz, notes, search, contact, payment, admin, default). OTP sends limited to 3 per 10 minutes per email hash inside better-auth send handler. Rate limit denials log JSON events with hashed fingerprints (`rate_limit_denied`, `arcjet_fail_open`).

- **Contact form hardening** — HTML escaping on all user inputs, honeypot `website` field silently drops spam, 3 requests/hour rate limit per IP.

- **AI tool boundaries** — All 10 chat tools across both tool sets wrapped via `wrapTool()` with policies: `userScope` (prevents cross-user data access), `webSearchScrub` (rejects emails, phones, instruction-like queries, truncates results to 2000 chars), `noRawText` (blocks raw extracted note text), `noIsPublic` (forces `isPublic: false` on quiz creation), `chatInputCap` (50 messages, 8000 chars per text part).

- **Server-side URL derivation** — Note creation and admin question ingest now derive `fileUrl` from `uploadthingKey` via `utapi.getFileUrls()`, ignoring any client-provided URL. Prevents SSRF via malicious `fileUrl` values.

- **Chat input validation** — `/api/ai/chat` returns 400 when `messages` exceeds 50 entries or any text part exceeds 8000 characters, before any model call.

- **Environment validation** — Boot fails in production when `ARCJET_KEY` or `BETTER_AUTH_TRUSTED_ORIGINS` is missing or holds a placeholder value. Edge runtime validates only `ARCJET_KEY`; Node validates all three critical secrets. `FAPSHI_WEBHOOK_SECRET` fails per-request with 503 if unset.

- **Security headers** — All responses now include CSP (enumerated UploadThing image hosts), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Permissions-Policy`.

- **Chat uploader limit** — Reduced from 10 to 4 images per request.

- **Inngest concurrency cap** — Note processing job limited to 4 concurrent executions.

### Infrastructure

- **CI pipeline** — GitHub Actions workflow runs on PRs and nightly: frozen lockfile install, `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm audit --audit-level=high`, `osv-scanner` on lockfile, `gitleaks` (fails build on secrets), dependency gate with allowlist for watched packages (`pdf-parse`, `pdfjs-dist`, `mammoth`, `tesseract.js`).

- **Dependency management** — `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (72 hours). `renovate.json` configured with grouped PRs, no auto-merge for `better-auth`, `next`, `ai`, `@ai-sdk/*`, and PDF parsers.

- **Docker Compose** — All credentials via env substitution (`${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, etc.), services bound to `127.0.0.1`.

- **Observability** — Migrated from PostHog to Sentry (Next.js SDK): client/server/edge config, `instrumentation.ts`, global error boundary, `sentry-tunnel` route, session replay with masking, data collection opt-out.

- **Test infrastructure** — Vitest configured with jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. Playwright added for E2E (browser install pending network). 18 passing tests for tool policy wrapper.

### Developer Experience

- **Type safety** — `lib/env.ts` split into Edge/Node validation with Zod schemas. `lib/require-admin.ts` shared admin guard. `lib/ai/tool-policy.ts` typed `wrapTool` with policy sets. `lib/rate-limit.ts` typed bucket configs and security event logging.

- **Code quality** — Biome formatting, strict TypeScript, no `any` in new code, consistent import sorting.

### Removed

- `/api/admin/parse-status` route and `/api/inngest/trigger` route
- `searchKnowledge` tool from both chat tool sets
- `harvestNoteKnowledge` and `harvestPaper3Knowledge` Inngest jobs
- PostHog analytics (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)

---

[2026-10-12] — Security and integrity hardening (spec 0001)