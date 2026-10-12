# Review, migrate/openai-to-gemini, 2026-10-12

**Reviewed by**: (different model from author) — author on Meta/muse-spark-1.1
**Scope**: ~140 files, branch vs base (migrate/openai-to-gemini vs main)
**Verdict**: Changes requested

## Summary

The change implements the "Security and integrity hardening" feature (spec 0001), addressing 25 acceptance criteria across four child specs: route/payment hardening, abuse limits, AI boundaries, and supply chain/deploy headers. Four shared security modules are introduced (`lib/env.ts`, `lib/rate-limit.ts`, `lib/require-admin.ts`, `lib/ai/tool-policy.ts`) and applied across ~140 API routes. Leaky surfaces (`parse-status`, `inngest/trigger`, `searchKnowledge`, harvest jobs) are removed. Security headers, CI hardening, dependency gate, and Sentry migration from PostHog are included.

Overall the direction is correct and comprehensive, but several blockers and majors need fixing before merge.

## Blockers

### 🔴 Arcjet `protect()` call signature mismatch, `lib/rate-limit.ts:67-69`
**Problem**: The `aj.withRule(rule).protect(request, { requested: 1, userId })` call uses an object signature that doesn't match Arcjet v1's expected parameters. Arcjet v1 expects either a string identifier or an object with specific properties (`fingerprint`, `characteristics`). The current call passes `requested` and `userId` which may not be valid.

**Why it matters**: This causes a TypeScript error (`Expected 2 arguments, but got 3` then `Object literal may only specify known properties`) and will likely fail at runtime when Arcjet tries to rate limit, leaving routes unmetered.

**Suggested fix**: Check Arcjet v1 documentation for the correct `protect()` signature. Likely needs `{ fingerprint: userId }` or `{ characteristics: { userId } }`. Test the rate limiting end-to-end after fixing.

### 🔴 Node env validation runs at module load on Edge, `lib/env.ts:90-99`
**Problem**: `getNodeEnv()` is called at module load time (line 99: `trustedOrigins = getNodeEnv().trustedOrigins`). This function validates `BETTER_AUTH_TRUSTED_ORIGINS` which is a Node-only env var. The module is imported by `lib/arcjet.ts` which runs in Edge middleware (`proxy.ts`), causing boot failure: `Invalid input: expected string, received undefined` for `BETTER_AUTH_TRUSTED_ORIGINS`.

**Why it matters**: The Edge middleware crashes on startup, breaking all auth and rate limiting. The app won't start in production.

**Suggested fix**: Split the module so Edge-safe exports (`arcjetKey`) are lazily evaluated or in a separate Edge-only module. Move Node-only validation behind a function that's only called in Node runtime (e.g., inside route handlers, not at module top level). The `lib/env.ts` should export a function `getTrustedOrigins()` that's only called in Node contexts.

## Major

### 🟠 `wrapTool` loses type safety, `lib/ai/tool-policy.ts:86-128`
**Problem**: The wrapped tool returns `tool({...}) as T` but the `execute` function inside the wrapper accepts `args: unknown` and returns `Promise<unknown>`. The original tool's `execute` had proper generic types `Tool<Args, Output>`. This loses the AI SDK's type-safe tool calling — the model can now pass any args and get any result.

**Why it matters**: The AI SDK relies on tool type inference for correct model behavior. Losing types means the model could call tools with wrong arguments, causing runtime errors that TypeScript would have caught.

**Suggested fix**: Use generics to preserve the tool's input/output types: `wrapTool<T extends Tool<any, any>>(toolDef: T, policyNames: PolicyName[], context: PolicyContext): T`. Inside, type `originalExecute` as `T['execute']` and ensure the wrapper's execute has the same signature.

### 🟠 Replay protection gap in Fapshi webhook, `app/api/webhooks/fapshi/route.ts:193`
**Problem**: The `isReplay` check handles `existingSubscription?.status === "ACTIVE"` after the `FAILED` → `SUCCESSFUL` allowance block. If a subscription is already ACTIVE and a SUCCESSFUL replay arrives, it should return early (idempotent), but the current order allows the FAILED→SUCCESSFUL block to run first, which could process a replay.

**Why it matters**: A replayed SUCCESSFUL webhook for an already-active subscription could create duplicate affiliate earnings or send duplicate emails.

**Suggested fix**: Reorder checks: first handle `existingSubscription?.status === "ACTIVE" && status === "SUCCESSFUL"` → return early. Then handle `existingSubscription?.status === "FAILED" && status === "SUCCESSFUL"` → allow activation. Then reject other replays.

### 🟠 Missing null check on `utapi.getFileUrls()` result, `app/api/notes/route.ts:115-124`
**Problem**: `utapi.getFileUrls(uploadthingKey)` returns `Promise<{ data: { url: string; key: string }[] }>` but code accesses `fileUrls.data[0].url` without checking if `data` exists or has length. If the key is invalid or file deleted, `data` could be empty array.

**Why it matters**: Runtime error when uploading notes with invalid/expired keys, leaking stack traces to users.

**Suggested fix**: Add `if (!fileUrls?.data?.length) return 400` before accessing `fileUrls.data[0].url`.

### 🟠 Same null access in admin question ingest, `app/api/admin/questions/ingest/route.ts:38-46`
**Problem**: Same pattern as notes route — `fileUrls.data[0].url` accessed without validation.

**Why it matters**: Same runtime error for admin question ingestion.

**Suggested fix**: Same null/length check before accessing array.

### 🟠 In-memory OTP rate limit map, `lib/auth.ts:15-21`
**Problem**: `otpRateLimitMap` is a `Map` in module scope. In serverless/Edge deployments (Vercel), each invocation gets a fresh process or the map resets on cold start. OTP rate limiting won't persist across requests.

**Why it matters**: Attackers can bypass the 3/10min limit by waiting for cold starts or hitting different instances.

**Suggested fix**: Use Arcjet's built-in email characteristic (`characteristics: ["email"]`) for OTP rate limiting, or a distributed store (Redis via Upstash/Vercel KV). The in-memory map is only suitable for single-process long-running servers.

### 🟠 CSP includes `'unsafe-inline'` and `'unsafe-eval'`, `next.config.ts:14-15`
**Problem**: The CSP header allows inline scripts and eval, which defeats the primary XSS protection CSP provides. The comment says "Static rendering and CDN caching keep working" but inline scripts are the main CSP bypass.

**Why it matters**: If any XSS exists (e.g., via unescaped user content), the CSP won't block it. The security hardening effort is undermined.

**Suggested fix**: Use nonces for inline scripts (Next.js supports this via `next.config.js` CSP nonce) or move all inline scripts to external files. At minimum, document why each unsafe directive is needed and create a follow-up task to remove them.

### 🟠 Gitleaks continues on error, `.github/workflows/ci.yml:71-75`
**Problem**: `continue-on-error: true` on gitleaks step means secret detection won't fail CI. A leaked API key in a PR would be reported but the build passes.

**Why it matters**: Secrets can be merged and deployed before detection. The dependency gate is the point of the security hardening.

**Suggested fix**: Remove `continue-on-error: true`. If false positives occur, add allowlist rules in `.gitleaks.toml` instead.

### 🟠 Hardcoded password in docker-compose.yml, `docker-compose.yml:8-9, 27-28`
**Problem**: `POSTGRES_PASSWORD: ticlearn_password` and `PGADMIN_DEFAULT_PASSWORD: admin` are literals in the tracked file. AC-17 requires "No password or user literal remains in the tracked file."

**Why it matters**: Credentials committed to git history. Anyone with repo access gets DB and pgAdmin access.

**Suggested fix**: Use `${POSTGRES_PASSWORD}` and `${PGADMIN_DEFAULT_PASSWORD}` with env substitution (already done for other vars). Ensure `.env.example` documents these and they're set in CI/CD secrets.

## Minor

### 🟡 Unknown policies silently skipped, `lib/ai/tool-policy.ts:114-124`
**Problem**: `if (!policy) continue` silently ignores typos in policy names (e.g., `["userScop"]`). In development this should warn or throw.

**Suggested fix**: In development (`process.env.NODE_ENV !== 'production'`), log a warning or throw when a policy name isn't found.

### 🟡 Bucket configs hardcoded, `lib/rate-limit.ts:56-62`
**Problem**: Refill rates, intervals, capacities are magic numbers. Can't tune without code change.

**Suggested fix**: Move to `lib/platform-settings.ts` or env vars, read at runtime.

### 🟡 Web search shares chat input caps, `lib/ai/tools.ts:586-627`
**Problem**: `WEB_SEARCH_TOOL_POLICIES` includes `chatInputCap` (50 messages, 8000 chars). Web search shouldn't share the chat input limits — it's a separate tool with different abuse profile.

**Suggested fix**: Create `WEB_SEARCH_TOOL_POLICIES = ["webSearchScrub"]` only, or a separate cap for web search.

### 🟡 Input validation duplicated in chat route, `app/api/ai/chat/route.ts:106-124`
**Problem**: The 50-message/8000-char validation in the chat route duplicates `lib/ai/tool-policy.ts:chatInputCap`. Two places to update, risk of drift.

**Suggested fix**: Remove the route-level validation; rely on the tool policy wrapper which runs before model call.

### 🟡 AI Elements reasoning component scope creep, `components/ai-elements/reasoning.tsx`, `lib/ai/index.ts`
**Problem**: AI Elements reasoning component added but not tied to security hardening scope. May indicate unrelated changes bundled in.

**Suggested fix**: Move to separate PR if not required for the security hardening ACs.

### 🟡 Dependency gate allowlist is empty template, `.dependency-gate-allowlist.txt`
**Problem**: File says "Currently no advisories are allowlisted" but has example entries commented out. Unclear if intentional.

**Suggested fix**: Either add real allowlist entries with justification, or document "empty by design — all high/critical advisories fail CI."

## Nits

- ⚪ `vitest.config.ts:2`, Import `path` without `node:` protocol — Biome flags `useNodejsImportProtocol`
- ⚪ `lib/ai/tool-policy.ts:109`, `originalInputSchema` declared but never used — dead code
- ⚪ `app/api/contact/route.ts:13-22`, `escapeHtml` uses object map — could use `replaceAll` with function for cleaner code
- ⚪ `README.md:133-134`, Environment table still references `NEXT_PUBLIC_POSTHOG_KEY/HOST` — stale docs after Sentry migration

## Strengths

- Comprehensive security hardening across 25 ACs with shared modules avoiding duplication
- Server-side URL derivation for note create and admin ingest (AC-10) eliminates SSRF vector
- Constant-time comparison for webhook secret (AC-2) prevents timing attacks
- Security event logging with hashed fingerprints (AC-7) balances auditability with privacy
- Tool policy wrapper (`wrapTool`) ensures no chat tool can bypass safety policies
- CI pipeline with gitleaks, osv-scanner, dependency gate, minimumReleaseAge, renovate is thorough

## Test Coverage

`TESTS = configured` (vitest + @testing-library/react + playwright configured). The test suite at `tests/lib/ai/tool-policy.test.ts` has 18 passing tests covering the policy wrapper. However, new logic in `lib/env.ts`, `lib/rate-limit.ts`, `lib/require-admin.ts`, `lib/auth.ts` (OTP rate limiting), and route handlers is untested. These are security-critical modules — missing coverage on error paths, fail-open behavior, and replay protection is a gap. Recommend adding tests for the four shared modules and the Fapshi webhook.