# 0001 d. Supply chain, headers and the deploy surface

Child of [0001](../index.md). Everything that protects the app before and around a request rather than inside one. Governed by the umbrella, no lifecycle status here.

## Summary

The repo has no CI, no security headers, tracked database credentials, and a browser exposed variable standing in for a server side trust boundary. This child adds the first workflow, the dependency gate, the response headers, the compose credential move, the edge rules as code, and an update bot that never merges auth or parser bumps.

## Requirements

- **AC-15**: In production the app fails to boot when `ARCJET_KEY` or `BETTER_AUTH_TRUSTED_ORIGINS` is missing or equal to a template placeholder; no `as string` cast hides it.
- **AC-16**: better-auth `trustedOrigins` is read from `BETTER_AUTH_TRUSTED_ORIGINS`, falling back to `NEXT_PUBLIC_APP_URL` only when the server variable is absent.
- **AC-17**: `docker-compose.yml` takes database and pgAdmin credentials from environment substitution and binds both services to `127.0.0.1`. The literal password `admin` is gone from the tracked file.
- **AC-19**: Every response carries a static content security policy plus nosniff, referrer policy, strict transport security, frame options and permissions policy, with static rendering and CDN caching intact.
- **AC-20**: A GitHub Actions workflow runs on pull requests and nightly: frozen lockfile install, typecheck, lint, tests, `pnpm audit --audit-level=high`, `osv-scanner` on the lockfile, and `gitleaks` over history.
- **AC-23**: `vercel.json` carries rate limit rules as reviewed code, including a body size cap on the JSON AI and notes routes.
- **AC-24**: `pnpm-workspace.yaml` sets `minimumReleaseAge`, and Renovate opens grouped pull requests with no auto merge for `better-auth`, `next`, `ai`, `@ai-sdk/*` and the PDF parsers.

## Decision

**Chosen**: build the first CI workflow with five real gates rather than a lint only pipeline, static security headers from `next.config.ts` rather than per request nonces, compose credentials moved to an untracked env file with both services bound to localhost, Vercel rate limit rules in `vercel.json` now with Cloudflare deferred, and Renovate opening grouped pull requests with a 72 hour cool off in pnpm workspace.

## Feature design

**Data model**: none. No migration in this child.

**Configuration required**:

| Variable | Purpose | Notes |
|---|---|---|
| `ARCJET_KEY` | Arcjet client | validated at boot, placeholder rejected |
| `BETTER_AUTH_TRUSTED_ORIGINS` | server side trust boundary | comma separated, required in production |
| `FAPSHI_WEBHOOK_SECRET` | webhook bearer secret | checked per request, fails closed (route and payment child) |
| `POSTGRES_USER` | local database user | compose variable, from an untracked `.env`; currently the literal `ticlearn` |
| `POSTGRES_PASSWORD` | local database password | compose variable, from an untracked `.env`; currently the literal `ticlearn_password` |
| `POSTGRES_DB` | local database name | compose variable, from an untracked `.env`; currently the literal `ticlearn` |
| `PGADMIN_DEFAULT_EMAIL` | local pgAdmin login | compose variable, from an untracked `.env` |
| `PGADMIN_DEFAULT_PASSWORD` | local pgAdmin password | compose variable, from an untracked `.env` |

No identifier or password literal stays in the tracked compose file, not just the passwords, so the file carries variable names only. `pnpm-workspace.yaml` currently has no `packages` key at all (it holds only build allowlists), so adding `minimumReleaseAge` is a small config shape change to a file that is not a workspace definition.

**Workflow jobs** (`.github/workflows/security.yml`, on pull requests and nightly):

| Job | Command | Gate |
|---|---|---|
| install | `pnpm install --frozen-lockfile` | fails on lockfile drift |
| typecheck | `tsc --noEmit` (new `typecheck` script) | fails the build |
| lint | `pnpm lint` | fails the build |
| test | `pnpm test` (vitest, from the harness slice) | fails the build |
| dependency audit | `pnpm audit --audit-level=high` | fails on high or critical, minus a commented allowlist at `.github/dependency-audit-allowlist.json`, owned by the repo owner |
| OSV scan | `osv-scanner` on `pnpm-lock.yaml` | fails on a fixable advisory, catches transitive issues pnpm misses |
| secrets | `gitleaks detect` over history | fails on any secret, run against full history once then incrementally |
| watched parsers | hard fail on any advisory for `pdf-parse`, `pdfjs-dist`, `mammoth`, `tesseract.js` | these parse attacker supplied binaries on every upload, so severity does not gate them |

**Header surface** (`next.config.ts` `headers()`, applied to all paths):

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` in development only); `style-src 'self' 'unsafe-inline'`; `img-src 'self' blob: data: https://*.ufs.sh https://*.utfs.io`; `font-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | camera, microphone and geolocation denied |

The image hosts are enumerated rather than described: the only remote images in the app are UploadThing files on `ufs.sh` and `utfs.io` (seven and four references respectively across `app/`, `lib/` and `components/`), plus blob URLs the PDF viewer creates. Vercel Analytics is same origin, so `default-src 'self'` covers it. Any new remote host later has to be added here, which is the point of naming them.

No nonce, so static generation, partial prerendering and CDN caching keep working.

**Key invariants**:
- A placeholder value never boots the app in production.
- No credential is committed; the compose file carries only variable names.
- A dependency advisory on an auth library or a parser is a hard fail, not a warning.
- Edge rules are reviewed as code.

**Critical test scenarios**:
- Happy path: a pull request runs every job and the merge is gated on all of them, verifies **AC-20**.
- Failure case: an unset or placeholder `ARCJET_KEY` in production stops the boot with a named error, verifies **AC-15**.
- Failure case: `pnpm audit` reporting a high severity advisory fails the workflow, verifies **AC-20**.
- Deploy surface: `curl -I` on a page shows all six headers, and a prerendered page still served from cache, verifies **AC-19**.
- Local: `docker compose up` binds 5435 and 5050 to localhost only, and the tracked file contains no password, verifies **AC-17**.

## Build plan

1. Add the `typecheck` script and the vitest config (with the harness slice in the umbrella), then the first workflow with install, typecheck, lint and test. Satisfies **AC-20**.
2. Add the dependency audit, OSV scan, gitleaks and the watched parser list to the workflow, with a short commented allowlist for false positives. Satisfies **AC-20**, **AC-22**.
3. Build `lib/env.ts` and replace the `as string` casts in `proxy.ts` and `lib/arcjet.ts` with a boot failure on a missing or placeholder value. Satisfies **AC-15**.
4. Read `trustedOrigins` from `BETTER_AUTH_TRUSTED_ORIGINS`, and add it to the template env file. Satisfies **AC-16**.
5. Add the static security headers in `next.config.ts` and confirm a prerendered page still serves from cache. Satisfies **AC-19**.
6. Move compose credentials to env substitution, bind both services to `127.0.0.1`, and document the new variables. Satisfies **AC-17**.
7. Add `vercel.json` rate limit rules and the JSON body size caps. Satisfies **AC-23**.
8. Set `minimumReleaseAge: 4320` (72 hours, expressed in minutes, which is the unit pnpm expects) in `pnpm-workspace.yaml`, and add `renovate.json` at the repo root with grouped patches and no auto merge for the sensitive packages. Satisfies **AC-24**.

## Consequences

**Positive**: the repo grows its first real gate, so every later security fix in this feature is provable in CI rather than asserted. Placeholder secrets can no longer masquerade as a healthy deploy. Nothing sensitive is committed or derivable from the tracked compose file. Dependency bumps for auth and parsers arrive as reviewable pull requests with a cool off.

**Negative / tradeoffs**: a noisy audit gate is worse than no gate, so the allowlist must be short and commented and someone has to review it. Frozen lockfile plus typecheck plus lint plus tests makes CI slower than lint alone. `gitleaks` over full history on the first run will surface historical matches that need triage, which is a one time afternoon. Static headers allow inline scripts, so this is defence in depth, not a strict policy against XSS. `minimumReleaseAge` makes the lockfile slightly stale on purpose, so a security fix published today may not reach you until the cool off expires.

**Neutral**: Cloudflare stays out of scope, so nothing about the app's trust boundary changes today. The 46 variable documentation effort stays in scope item 9; this child only adds the six variables the security work needs.

## Rationale

The deciding force is that a security fix nobody can prove is a comment. The scope row's done when condition asks for a test that fails without the fix, which cannot exist without a runner and a pipeline. That is why the workflow is built in the first build slice ahead of the fixes, and why the harness is a launch blocker rather than a nice to have. The gates chosen are the ones with real signal: a frozen lockfile and a typecheck are cheap and catch real breakage, the audit and OSV scan catch the parser class that this app is unusually exposed to, and gitleaks catches the credential leak that already happened once in this repo's history.

On headers, the deciding force is the audience again. A nonce based strict policy is the better answer against XSS and in Next 16 it forces dynamic rendering for every page, disables static generation, CDN caching and partial prerendering. Charging every student on mobile data for a threat this app has no evidence of is the wrong trade, so the static policy ships and the nonce migration stays available once someone measures a violation. The static policy still blocks framing, plugin content and transport downgrade, which are the attacks most likely to be aimed at a site with a shared session and an admin role.

The dependency policy is deliberately conservative because the highest consequence dependency in this app is `better-auth`, where a silent regression in origin validation is catastrophic, and the highest parser risk is `pdfjs-dist`, where the class of vulnerability is well populated. Both are on the no auto merge list alongside the AI SDK, whose tool approval semantics have already moved once. A 72 hour cool off in pnpm workspace costs almost nothing and removes the malicious publish class almost entirely.