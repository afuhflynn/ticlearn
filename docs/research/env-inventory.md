# Environment Variable Inventory — TiCLearn

**Audit date:** 2026-10-12
**Scope:** every environment variable the app reads, directly or through a dependency.
**Method:** exhaustive `process.env` / `NEXT_PUBLIC_` sweep of the repo (excluding `node_modules`, `.git`, `.next`, `pnpm-lock.yaml`), plus a scan of each installed dependency's dist for env-var names it reads at runtime, plus reading `.env.example`, `example.env`, `prisma/schema.prisma`, `prisma.config.ts`, `proxy.ts`, `next.config.ts`, `docker-compose.yml`, `mprocs.yaml`.

**No application code was modified. `.env` and `.env.example` were read only.**

---

## 1. Summary

| Metric | Count |
| --- | --- |
| Unique variables the app actually reads (code or runtime dependency) | **46** |
| …of which genuinely **required** for the app to boot and work | **7** |
| …of which **optional / degrade gracefully** | **39** |
| Variables listed in `.env.example` or `example.env` but read by **nothing** | **5** |
| Dependencies installed but **not wired into the app** | **6** |
| Security findings | **6** (2 high, 3 medium, 1 low) |
| Hardcoded secrets found in source | **0** |
| Hardcoded production URLs that should be variables | **7 locations** |
| Existing env template files | **2, and they conflict** (`.env.example`, `example.env`) |

### The shape of the app's config surface

TiCLearn is small and server-heavy. Almost everything is a server-side secret. There is exactly **one** browser-exposed variable, `NEXT_PUBLIC_APP_URL`, and it is not a secret — but it is (mis)used to drive a server-side security decision (`trustedOrigins`), which is the single most important thing to fix in this document.

Three notable structural facts:

1. **AI keys are never read by our code.** `lib/ai/instances.ts` is two lines: `import { google } from "@ai-sdk/google"; export { google };`. `lib/ai/registry.ts` and `lib/ai/orchestrator.ts` both call `google("gemini-2.5-flash")` with **no key argument**. The key is picked up implicitly by `@ai-sdk/google` from `GOOGLE_GENERATIVE_AI_API_KEY`. Grepping our source for AI keys finds nothing — this is a real trap for the next developer.
2. **Prisma 7 config-driven datasource.** `prisma/schema.prisma:9-11` declares `datasource db { provider = "postgresql" }` with **no `url`, no `directUrl`, no `shadowDatabaseUrl`**. The URL comes solely from `prisma.config.ts:12`. There is therefore currently **no** `DIRECT_URL` and **no** `SHADOW_DATABASE_URL` anywhere in the project.
3. **Uploads and background jobs are wired implicitly.** Neither `lib/uploadthing.ts` nor `lib/uploadthing-server.ts` nor `lib/inngest/client.ts` mentions an env var. UploadThing and Inngest read their own credentials from the environment inside their SDKs.

---

## 2. Full variable table

Legend — **Req**: Required / Optional. **Where**: Server-only / Browser-exposed. **Kind**: Secret / Public.

### 2.1 Database

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | `prisma.config.ts:12`, `lib/prisma.ts:6` | PostgreSQL connection string. Used by Prisma CLI (migrate/seed/studio) and by the runtime `PrismaPg` adapter. | `postgresql://user:pass@host:port/db?schema=public` | **Required** | Server | **Secret** (embeds password) | **No** |
| `NODE_ENV` | `lib/prisma.ts:17`, `lib/prisma.ts:23` | Toggles Prisma dev logging. Also read by Next.js, Vercel Analytics, UploadThing, and better-auth internals. | `development` \| `production` \| `test` | Required (platform) | Server + build | Public | Yes |

Not present, but expected if the project moves to a pooled host like Neon/Supabase:

| Variable | Would be read at | Purpose | Req | Notes |
| --- | --- | --- | --- | --- |
| `DIRECT_URL` | (would be `prisma.config.ts` or `schema.prisma`) | Direct (non-pooled) Postgres URL used by `prisma migrate`. Standard split with Neon. | Optional | **Missing.** Neon docs recommend `DATABASE_URL` = pooled, `DIRECT_URL` = direct. |
| `SHADOW_DATABASE_URL` | `prisma.config.ts` `migrations.shadowDatabaseUrl` | Throwaway DB Prisma creates to detect migration drift. Needed only when the DB user lacks `CREATE DATABASE`. | Optional | **Missing.** Currently `pnpm db:migrate` relies on the app user having database-level rights. |

### 2.2 Application / URL

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `lib/auth-client.ts:5`, `config/axios.config.ts:3`, `lib/auth.ts:62`, `lib/email/send.ts:490,539,618,771,832`, `app/api/ai/chat/route.ts:350`, `app/api/payment/initiate/route.ts:54`, `app/api/credits/purchase/initiate/route.ts:74`, `app/api/admin/invites/route.ts:59`, `app/api/paper3/attempts/[attemptId]/share/route.ts:54` | Canonical app origin. Drives better-auth `trustedOrigins`, browser axios base URL, browser auth client base URL, payment redirect URLs, admin invite links, shareable result links, and every button link in outbound email. | Absolute URL, no trailing slash: `https://ticlearn.ticsummit.org` | **Required** | **Browser-exposed** (the `NEXT_PUBLIC_` prefix forces this) | Public | Yes (it is a URL, not a credential) — **but see Security §5.1** |
| `BETTER_AUTH_SECRET` | read inside `better-auth` (`node_modules/better-auth/dist`) | HMAC key that signs session cookies and encrypts stored tokens. | 32+ byte random string; generate with `openssl rand -base64 32` | **Required** (better-auth refuses to run in production without it) | Server | **Secret** | **No** |
| `BETTER_AUTH_URL` | read inside `better-auth` | Base URL better-auth uses for its own callback/base resolution. Must match `NEXT_PUBLIC_APP_URL`. | Absolute URL | Optional (better-auth infers from request) but recommended | Server | Public | Yes |
| `BETTER_AUTH_TRUSTED_ORIGINS` | read inside `better-auth` | CSV allow-list of origins for CSRF protection. Overrides the `trustedOrigins` array hardcoded in `lib/auth.ts:62`. | Comma-separated origins: `https://a.com,https://b.com` | Optional | Server | Public | Yes |
| `BETTER_AUTH_SECRETS` | read inside `better-auth` | Key-rotation list (current + previous). | Comma-separated base64 strings | Optional | Server | **Secret** | **No** |

### 2.3 Authentication — Google OAuth

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | `lib/auth.ts:34` | OAuth 2.0 Web-application client ID for "Sign in with Google". Passed with a non-null assertion — no guard, so a missing value produces a runtime failure, not a startup error. | `xxxxx.apps.googleusercontent.com` | **Required** for Google sign-in | Server | Public (by Google's design) | Yes, though keep it out of the repo anyway |
| `GOOGLE_CLIENT_SECRET` | `lib/auth.ts:35` | OAuth 2.0 client secret exchanged for tokens at the token endpoint. Same non-null-assertion hazard as above. | Opaque ~35-char string | **Required** for Google sign-in | Server | **Secret** | **No** |

### 2.4 AI

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | implicitly, by `@ai-sdk/google` at `environmentVariableName: "GOOGLE_GENERATIVE_AI_API_KEY"`. Consumed by the `google("gemini-2.5-flash")` calls in `lib/ai/registry.ts:11` and `lib/ai/orchestrator.ts:7`. | The app's **only** AI provider. Every chat, quiz generation, exam generation, grading, summarisation, and Paper 3 evaluation depends on it. | `AIza…` (Google API key) | **Required** | Server | **Secret** | **No** |
| `TAVILY_API_KEY` | `lib/ai/tools.ts:15`, used at `:64-70` | Web-search tool exposed to the AI agent. If unset the tool returns the string `"Web search is unavailable because TAVILY_API_KEY is not set."` — graceful degradation. | `tvly-…` | Optional | Server | **Secret** | **No** |
| `TAVILY_PROJECT` | `TAVILY_PROJECT` inside `@tavily/core` | Optional project ID so one key can be split across environments and filtered in Tavily's logs. | Opaque project id | Optional | Server | Public-ish | Yes |
| `TAVILY_HTTP_PROXY` / `TAVILY_HTTPS_PROXY` | `TAVILY_HTTP_PROXY` / `TAVILY_HTTPS_PROXY` inside `@tavily/core` | Outbound proxy for Tavily calls. Relevant if deploying where egress is restricted. | Proxy URL | Optional | Server | Public | Yes |

> **Not present and not needed today:** `OPENAI_API_KEY`, `NIM_API_KEY`. Both appear in `.env.example` but the multi-model chain described in `AGENTS.md` (`gpt → gemini → nemotron → mistral → deepseek`) has been collapsed to Gemini-only. See §4.1.

### 2.5 Email (SMTP via nodemailer)

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SMTP_HOST` | `lib/email/send.ts:14` | SMTP server hostname. | `smtp.gmail.com`, `smtp.brevo.com`, … | **Required** for any email | Server | Public | Yes |
| `SMTP_PORT` | `lib/email/send.ts:15`, `:16` | SMTP port. Also switches TLS mode: `secure` is true **only** when the port string is exactly `"465"`; 587 means STARTTLS. | Number as string: `587`, `465` | **Required** for any email | Server | Public | Yes |
| `SMTP_USER` | `lib/email/send.ts:18` | SMTP username / login. | Email address or provider username | **Required** for any email | Server | Semi-secret (identifies the mailbox) | No |
| `SMTP_PASS` | `lib/email/send.ts:19` | SMTP password or app password. | Opaque, often 16–24 chars for Gmail app passwords | **Required** for any email | Server | **Secret** | **No** |
| `FROM_EMAIL` | `lib/email/send.ts:34` | Envelope + header `From`. Falls back to `TiCLearn <no-reply@ticlearn.ticsummit.org>` if unset. | RFC 5322 display form: `TiCLearn <no-reply@yourdomain.com>` | Optional (has fallback) | Server | Public | Yes |
| `ADMIN_EMAIL` | `lib/email/send.ts:639`, `app/api/contact/route.ts:16`, `app/api/webhooks/fapshi/route.ts:173` | Where contact-form submissions, new-feedback notifications, and payment-webhook admin alerts are delivered. | Email address | Optional but should be **Required** in production | Server | Public | Yes |

> **Note:** the nodemailer transport is built at module load (`lib/email/send.ts:13-21`) with no validation. If `SMTP_HOST` is missing the transport constructs with `host: undefined` and every `sendMail` throws; the caller catches and returns `{success:false}` — so the app does not crash, but no email is ever sent, and email OTP sign-in (`lib/auth.ts:95-109`) becomes unusable. **Email OTP is the primary sign-in flow**, so a broken SMTP config looks like "sign-in is broken" to a user.

### 2.6 Security — Arcjet

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ARCJET_KEY` | `proxy.ts:8`, `lib/arcjet.ts:18`, `:30`, `:43`, `:56` | Arcjet **site key**. Drives `shield()`, `detectBot()`, four `tokenBucket()` rate limiters, and `protectSignup()` (email MX validation + disposable-domain deny + sliding window). Constructed at module scope in `proxy.ts`, which runs on **every matched request**. | `ajkey_…` | **Required** — `proxy.ts` casts `as string` and calls `arcjet({key: undefined})` at import time if absent | Server | **Secret** (it is a site-scoped credential, not a public site key) | **No** |
| `ARCJET_ENV` | `ARCJET_ENV` inside `@arcjet/next` | Forces SDK environment (`development` \| `production`). Useful locally so Live-mode rules don't block you. | `development` \| `production` | Optional | Server | Public | Yes |

> Arcjet's rules are all set to `mode: "LIVE"` (`proxy.ts:11-13`, `lib/arcjet.ts:21,24,33,46,59,70,76,83,90`). A wrong/absent key does not degrade to no protection — it fails the request.

### 2.7 Payments — Fapshi (Cameroon Mobile Money)

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FAPSHI_API_USER` | `lib/fapshi.ts:1`, sent as the `apiuser` header at `:39` and `:85` | Fapshi service username (one per service created in the dashboard). | Short opaque username | **Required** for payments | Server | Semi-secret | No |
| `FAPSHI_API_KEY` | `lib/fapshi.ts:2`, sent as the `apikey` header at `:40` and `:86` | Fapshi service API key. | Opaque secret string | **Required** for payments | Server | **Secret** | **No** |
| `FAPSHI_BASE_URL` | `lib/fapshi.ts:4` | Overrides the computed base URL. `.trim()`ed, then used if truthy. | `https://sandbox.fapshi.com` (verified against Fapshi's OpenAPI `servers` block) | Optional (falls through to `FAPSHI_SANDBOX` logic) | Server | Public | Yes |
| `FAPSHI_SANDBOX` | `lib/fapshi.ts:5` | When exactly `"true"`, base becomes `https://sandbox.fapshi.com`; otherwise `https://live.fapshi.com`. | Literal string `true` (case-sensitive comparison) | Optional | Server | Public | Yes |
| `FAPSHI_WEBHOOK_SECRET` | `app/api/webhooks/fapshi/route.ts:34` | Shared secret compared against the inbound `Authorization: Bearer …` header on payment webhooks. This is the **only** thing standing between a stranger and crediting themselves a subscription. | Opaque secret string chosen by you and configured in the Fapshi dashboard webhook settings | **Required** for payment reconciliation | Server | **Secret** | **No** |

> ⚠ **The live base URL is unverified.** Fapshi's published OpenAPI spec lists only `https://sandbox.fapshi.com`. The hardcoded production fallback `https://live.fapshi.com` at `lib/fapshi.ts:7` could not be confirmed from Fapshi's docs. **Do not go live until you confirm the production host from your Fapshi dashboard.** See §5.5.

### 2.8 Background jobs — Inngest

None of these are referenced in our source. All are read inside the `inngest` package. The client is `lib/inngest/client.ts:3-6`; the serve route is `app/api/inngest/route.ts`.

| Variable | Read by | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `INNGEST_EVENT_KEY` | `inngest` SDK | Authenticates `inngest.send()` calls — i.e. every async job trigger: note processing, quiz generation, Paper 3 evaluation, daily metrics, engagement campaigns, email sends. | Hex string | **Required** in cloud mode for all background jobs | Server | **Secret** | **No** |
| `INNGEST_SIGNING_KEY` | `inngest` SDK | Signs requests to and from `/api/inngest`. Also how Inngest Cloud authenticates your serve endpoint. | Hex string, even length; generate with `openssl rand -hex 32` | **Required** in cloud mode | Server | **Secret** | **No** |
| `INNGEST_DEV` | `inngest` SDK | `1` points the SDK at the local dev server and disables signature verification. | `1` \| `0` | Optional | Server | Public | Yes |
| `INNGEST_BASE_URL` | `inngest` SDK | Shared API/event origin override. Needed for self-hosting. | URL | Optional | Server | Public | Yes |
| `INNGEST_EVENT_API_BASE_URL` | `inngest` SDK | Event-ingest origin override. | URL | Optional | Server | Public | Yes |
| `INNGEST_API_BASE_URL` | `inngest` SDK | REST/GraphQL origin override. | URL | Optional | Server | Public | Yes |
| `INNGEST_ENV` | `inngest` SDK | Environment header, for branch-level Inngest environments. | Environment name/id | Optional | Server | Public | Yes |
| `INNGEST_SERVE_ORIGIN` | `inngest` SDK | Public origin Inngest uses to reach you. Set this behind a proxy/tunnel where Host inference fails. | Origin incl. protocol and port | Optional | Server | Public | Yes |
| `INNGEST_SERVE_PATH` | `inngest` SDK | Path Inngest calls. | `/api/inngest` | Optional | Server | Public | Yes |
| `INNGEST_SIGNING_KEY_FALLBACK` | `inngest` SDK (≥3.18.0) | Old key kept during rotation so in-flight runs don't fail. | Hex string | Optional | Server | **Secret** | **No** |
| `INNGEST_LOG_LEVEL` | `inngest` SDK | SDK log verbosity. | `debug` \| `info` \| … | Optional | Server | Public | Yes |
| `INNGEST_STREAMING` | `inngest` SDK | Opt into streaming connect responses. | boolean-ish | Optional | Server | Public | Yes |
| `INNGEST_ALLOW_IN_BAND_SYNC` | `inngest` SDK | Permit function-registration sync without a signing key (local dev). | boolean-ish | Optional | Server | Public | Yes |
| `INNGEST_CONNECT_GATEWAY_URL` | `inngest` SDK | Override the Connect (durable worker) gateway. | URL | Optional | Server | Public | Yes |
| `INNGEST_CONNECT_ISOLATE_EXECUTION` | `inngest` SDK | Run each Connect job in isolation. | boolean-ish | Optional | Server | Public | Yes |
| `INNGEST_CONNECT_MAX_WORKER_CONCURRENCY` | `inngest` SDK | Cap concurrent Connect workers. | Number | Optional | Server | Public | Yes |
| `INNGEST_SERVE_HOST` | `inngest` SDK | Bind address for the serve handler. | Hostname | Optional | Server | Public | Yes |

### 2.9 File uploads — UploadThing

| Variable | Read at | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UPLOADTHING_TOKEN` | implicitly by `uploadthing` / `uploadthing/server` (`new UTApi()` at `lib/uploadthing-server.ts:3`, `createRouteHandler` at `app/api/uploadthing/route.ts:5`) | The single credential for UploadThing v7. Base64-encoded JSON containing the API key, app id, and regions — presigned upload URLs are generated on your server, so no extra call is needed. | Base64-encoded JSON blob (looks like `eyJhcGlLZXki…`) | **Required** for uploads | Server | **Secret** | **No** |

### 2.10 Hosting / analytics (platform-injected)

| Variable | Read by | Purpose | Format | Req | Where | Kind | Safe to publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VERCEL_URL` | `@vercel/analytics` (used at `app/layout.tsx:2`) | Auto-injected by Vercel; the analytics script self-configures. | Hostname | Auto on Vercel | Server + client | Public | Yes |
| `VERCEL_WEB_ANALYTICS_DISABLE_LOGS` | `@vercel/analytics` | Opt out of analytics log collection. | boolean-ish | Optional | Server | Public | Yes |

`@vercel/analytics` needs **no** configuration variable. `app/layout.tsx` renders `<Analytics />` and it works out of the box.

### 2.11 Local development / tooling

These are not read by app code but shape the dev loop.

| Item | Where | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose.yml:10-12` | Backing credentials for the local Postgres on **port 5435**. These must stay in sync with the `DATABASE_URL` in `.env`. |
| `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` | `docker-compose.yml:21-22` | pgAdmin login on port 5050. Currently `admin@ticlearn.com` / `admin` — a hardcoded weak credential. See §5.4. |
| `INNGEST_DEV=1` | `.env` | Makes the SDK talk to the local Inngest dev server started by `pnpm dev:all` (`mprocs.yaml`). |
| ngrok authtoken | *not in repo* | `pnpm ngrok:dev` is in `mprocs.yaml` and `package.json`, but no authtoken is stored anywhere. You'll need `ngrok config add-authtoken`. |
| `DATABASE_URL` override for `pnpm db:studio` | — | Prisma Studio reads the same `DATABASE_URL`. |

---

## 3. Per-provider signup instructions

Every URL below was verified by fetching live vendor documentation. Anything I could not confirm is explicitly marked **unverified**.

### 3.1 Google Gemini (the AI provider — the only one that matters)

| | |
| --- | --- |
| Variable | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Where to get it | Google AI Studio → API Keys page. Direct link: **https://aistudio.google.com/apikey** (verified — this exact URL is cited by Google's own OpenAI-compatibility docs). Docs: https://ai.google.dev/gemini-api/docs/api-key |
| What it looks like | A string starting `AIza`, 39 characters |
| Gotcha | Google is mid-migration from *standard* keys to *authorization* keys. **As of 2026, the Gemini API rejects unrestricted standard keys.** Keys created in AI Studio are created as auth keys and are restricted to the Gemini API by default. If you copy an old unrestricted key, requests will start failing — the fix is to restrict it to "Gemini API only" in AI Studio or create a new key. |
| Gotcha | `@ai-sdk/google` reads `GOOGLE_GENERATIVE_AI_API_KEY`. Google also documents `GEMINI_API_KEY` for the newer `@google/genai` SDK — **this project uses `@ai-sdk/google`, so it is `GOOGLE_GENERATIVE_AI_API_KEY` that matters.** Setting only `GEMINI_API_KEY` will silently do nothing. |

### 3.2 Google OAuth (sign-in)

| | |
| --- | --- |
| Variables | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Where to get it | **https://console.cloud.google.com/apis/credentials** (verified) |
| Steps | 1. Create/select a Google Cloud project. 2. Enable the Google OAuth 2.0 API / Google Identity Services. 3. Credentials → Create Credentials → OAuth client ID → **Web application**. 4. Add Authorized redirect URI: `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google` and Authorized JavaScript origin: `<NEXT_PUBLIC_APP_URL>`. 5. Copy the client ID and client secret. |
| Gotcha | Redirect URIs must match **exactly**, scheme and trailing slash included. Mismatches fail silently at the callback. |
| Note | `lib/auth.ts:34-35` uses non-null assertions. If you delete these two values, the app does not fail at boot — it fails when a user clicks "Sign in with Google". |

### 3.3 Arcjet

| | |
| --- | --- |
| Variable | `ARCJET_KEY` |
| Where to get it | Console: **https://console.arcjet.com** (verified — current Arcjet docs consistently reference `console.arcjet.com`). The `.env.example` comment says `https://app.arcjet.com`, which is the **older** URL — update it. |
| What it looks like | `ajkey_…` |
| Steps | Create a free account → create a site for your project → copy the site key from the SDK Installation section. |
| Also set | `ARCJET_ENV=development` locally, so Live-mode rules report instead of blocking you. |
| Gotcha | `proxy.ts` builds the Arcjet client at module scope and the matcher covers nearly every route. A missing key is an immediate hard failure for the whole app. |

### 3.4 UploadThing

| | |
| --- | --- |
| Variable | `UPLOADTHING_TOKEN` **only** |
| Where to get it | Dashboard: **https://uploadthing.com/dashboard** (verified) → your app → **API Keys** → **V7** tab → copy the Token. Docs: https://docs.uploadthing.com/v7 |
| What it looks like | Base64-encoded JSON (opaque, `eyJ…`) |
| **Important v7 change** | Verified from UploadThing's own v7 migration guide: v7 merged the app id and region into the token. **`UPLOADTHING_APP_ID` is no longer a required environment variable.** This project runs `uploadthing@^7.7.4`. `UPLOADTHING_APP_ID` in `.env.example` is a leftover from v6. |

### 3.5 Fapshi (Cameroon mobile-money payments)

| | |
| --- | --- |
| Variables | `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET` |
| Where to get it | Marketing site **https://www.fapshi.com**; developer docs **https://docs.fapshi.com** (verified — the docs site publishes an OpenAPI spec with a `llms.txt` index). |
| Steps | 1. Create and activate a Fapshi account. 2. **Create a service** in the dashboard — this is what yields your API User and API Key. 3. Set the webhook URL per service to `https://<your-domain>/api/webhooks/fapshi` and pick a bearer secret. |
| Auth shape (verified from the OpenAPI spec) | Two custom headers on every request: `apiuser` and `apikey`. Matches `lib/fapshi.ts:39-40` exactly. |
| Sandbox base URL | `https://sandbox.fapshi.com` — **verified**, it is the `servers` entry in Fapshi's published OpenAPI spec. |
| **Live base URL** | `https://live.fapshi.com` — used as the hardcoded fallback at `lib/fapshi.ts:7`. **UNVERIFIED.** Fapshi's docs only publish the sandbox server. Confirm the production host from your dashboard before going live, and prefer setting `FAPSHI_BASE_URL` explicitly so the fallback is never load-bearing. |
| IP whitelisting (verified) | If you enable IP whitelisting in the Fapshi dashboard, transaction-creation endpoints return 403 for any server not on the list. On serverless hosts with changing egress IPs this will break payments. |

### 3.6 Inngest (background jobs)

| | |
| --- | --- |
| Variables | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_DEV` |
| Where to get it | Dashboard: **https://app.inngest.com** (verified — Inngest's own docs link `https://app.inngest.com/env/production/manage/signing-key`). Docs: https://www.inngest.com/docs/platform-and-operations/keys-and-access |
| Steps | Create an account → create an app → pick your environment (dev / production) → **Event Keys** tab and **Signing Key** tab. Both are per-environment. |
| What they look like | Hex strings. Generate your own signing key with `openssl rand -hex 32` if self-hosting. |
| Gotcha | The signing key is **not** required against the local Inngest dev server — that's why `INNGEST_DEV=1` is fine locally and the cloud key is not. Set both keys before deploying. |
| Gotcha | If you tunnel (ngrok) to reach Inngest Cloud, set `INNGEST_SERVE_ORIGIN` to the tunnel origin; Host-header inference will otherwise point Inngest at the wrong URL. |
| Gotcha | On Vercel, the Inngest integration sets `INNGEST_SIGNING_KEY` once and **never rotates it**. Rotation is a manual dashboard + env-var update. |
| Gotcha | Rotation support (`INNGEST_SIGNING_KEY_FALLBACK`) requires SDK ≥ 3.18.0; this project is on `inngest@^4.1.2`, so you're fine. |

### 3.7 Tavily (web search for the AI agent)

| | |
| --- | --- |
| Variable | `TAVILY_API_KEY` |
| Where to get it | Dashboard: **https://app.tavily.com** (verified — Tavily's docs link it as "Get an API key"). Quickstart: https://docs.tavily.com/documentation/quickstart |
| What it looks like | `tvly-…` |
| Free tier | 1,000 API credits per month, no card required (verified from Tavily's quickstart). |
| Optional | `TAVILY_PROJECT` to split one key across environments and filter in Tavily's logs (verified from the JS SDK reference). |

### 3.8 Email (SMTP)

No single vendor — the app speaks plain SMTP via nodemailer, so any provider works. What you need is a host, port, username, and password.

| Provider | Host | Port | Notes |
| --- | --- | --- | --- |
| Gmail | `smtp.gmail.com` | 587 | Requires 2-Step Verification, then an **App Password** (16 chars, spaces stripped) at https://myaccount.google.com/apppasswords. A normal account password will not work. |
| Any other | provider-specific | 587 (STARTTLS) or 465 (implicit TLS) | The code sets `secure: true` **only** when `SMTP_PORT` is the exact string `"465"` (`lib/email/send.ts:16`). Use 587 for everything else. |
| Resend / Postmark / SendGrid | provider-specific | varies | Would need an API key instead of user/pass — not a drop-in with the current nodemailer config. |

Also set `FROM_EMAIL` in RFC 5322 form (`TiCLearn <no-reply@yourdomain.com>`) and `ADMIN_EMAIL` as a bare address, so contact-form and admin notifications have a destination.

### 3.9 Database

| | |
| --- | --- |
| Variable | `DATABASE_URL` |
| Local | `docker-compose.yml` runs Postgres 15-alpine on **host port 5435** (not 5432), user/password/db all `ticlearn`. `pnpm db:up` then `DATABASE_URL="postgresql://ticlearn:ticlearn_password@localhost:5435/ticlearn?schema=public"` |
| Production | Neon: sign up at **https://console.neon.tech/signup** (verified). Project dashboard → **Connect** button → copy the connection string. Docs: https://neon.com/docs/get-started/connect-neon |
| Pooled vs direct | Verified from Neon's FAQ: use the `-pooler` hostname for the app and a **separate direct URL for migrations**. That is exactly the missing `DIRECT_URL` in §4.2. |
| Prisma and Neon | Neon can append `&connect_timeout=30` for Prisma (`neon connection-string --prisma`). |

---

## 4. Stale and missing variables

### 4.1 Variables listed in env templates that no code reads — **5**

| Variable | Listed in | Why it's stale |
| --- | --- | --- |
| `OPENAI_API_KEY` | `.env.example:34`, and **present in the live `.env`** | `@ai-sdk/openai` and `@ai-sdk/openai-compatible` are installed but **imported by zero files**. The orchestrator has no multi-model chain: `lib/ai/registry.ts` and `lib/ai/orchestrator.ts` both contain only `const gemini = google("gemini-2.5-flash")`. `AGENTS.md` describes a 5-model fallback chain and `generateCritical()` calling "openai(gemini-2.5-flash)" — that documentation is out of date. **A real `sk-proj-…` key sits in the local `.env` doing nothing.** It should be removed from `.env` and from the template, and revoked if it was ever exposed. |
| `NIM_API_KEY` | `.env.example:40` | NVIDIA NIM was part of the same removed chain. Zero references to `nim`, `nvidia`, `nemotron`, `mistral`, or `deepseek` anywhere in `app/` or `lib/`. |
| `UPLOADTHING_APP_ID` | `.env.example:47`, **and present in the live `.env`** | UploadThing v7 (this project is on `^7.7.4`) folded app id and region into `UPLOADTHING_TOKEN`. Verified from UploadThing's v7 migration guide. `uploadthing/server` reads only `UPLOADTHING_TOKEN` and `NODE_ENV`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | `.env.example:88`, **and present in the live `.env`** | **Zero** references to PostHog in `app/`, `lib/`, `components/`, `hooks/`, or `providers/`. `postcss.config.mjs` has no PostHog plugin. PostHog is not a dependency. Analytics is `@vercel/analytics` only. Because this is `NEXT_PUBLIC_`-prefixed, Next.js **inlines it into the browser bundle** — dead weight shipped to every visitor. |
| `NEXT_PUBLIC_POSTHOG_HOST` | `.env.example:89`, **and present in the live `.env`** | Same as above. Also browser-inlined and unused. |

### 4.2 Variables read in code that are missing from `.env.example` — **1 read, several gaps**

Read by code, absent from `.env.example`:

| Variable | Read at | Missing because |
| --- | --- | --- |
| `NODE_ENV` | `lib/prisma.ts:17`, `:23` | Present in `example.env:17` but not `.env.example`. (Next.js sets it automatically; it shouldn't be hand-set.) |

Present in `example.env` but **also absent from `.env.example`**: `NODE_ENV`. Everything else in `example.env` is a subset of `.env.example`.

The two templates disagree:

| Variable | In `.env.example` | In `example.env` |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | yes |
| `OPENAI_API_KEY`, `NIM_API_KEY` | yes | **no** |
| `FAPSHI_SANDBOX` | yes (`"true"`) | **no** — `example.env` only has `FAPSHI_BASE_URL` |
| `TAVILY_API_KEY` | yes | **no** |
| `INNGEST_DEV` | yes | **no** |
| `NODE_ENV` | **no** | yes |

**Two example files with different contents is itself a bug.** `example.env` is tracked in git (`.gitignore` has `.env*`, which does not match `example.env`) and has better setup instructions than `.env.example`; `.env.example` has the more current variable list. Pick one.

### 4.3 Dependencies installed but not wired into the app — **6**

| Package | `package.json` | Imports in source | Consequence |
| --- | --- | --- | --- |
| `@polar-sh/better-auth` | line 43 | **0** | Payments run through Fapshi. Polar is entirely vestigial. **Confirmed — the example given in the task holds.** |
| `@polar-sh/sdk` | line 44 | **0** | Same. |
| `@ai-sdk/openai` | line 34 | **0** | Left over from the OpenAI→Gemini migration (`8ead1e9 migrate: switch AI provider from OpenAI GPT to Google Gemini 2.5 Flash`). |
| `@ai-sdk/openai-compatible` | line 35 | **0** | Same. |
| `@inngest/realtime` | line 20 | **0** | Realtime Inngest features unused. |
| `dotenv` | line 65 | indirectly, via `prisma.config.ts:3` (`import "dotenv/config"`) | This one **is** used — keep it. |

Dead dependencies inflate install size and, for the AI ones, invite someone to believe a fallback chain exists when it does not.

### 4.4 Documentation drift

`AGENTS.md` describes an orchestrator with a `[gpt → gemini → nemotron → mistral → deepseek]` fallback chain, a model health cache, `openai("gemini-2.5-flash")` direct calls, and `TIMEOUT_MS`-based timeouts. The actual `lib/ai/orchestrator.ts` has **one** model, **no** health cache, and the "Critical" functions are byte-for-byte duplicates of the ordinary ones. Anyone setting env vars based on `AGENTS.md` will set keys for providers the app cannot reach.

### 4.5 Variables the app will need and does not have yet

#### a) A second web-search provider

Today `TAVILY_API_KEY` is the only search backend and it is optional. The orchestrator has no fallback, so a Tavily outage or quota exhaustion silently degrades the AI agent rather than failing loudly. Candidate second providers, all verified:

| Provider | Variable | Where to get it | Credential shape | Free tier |
| --- | --- | --- | --- | --- |
| **Exa** | `EXA_API_KEY` | Keys at **https://dashboard.exa.ai/api-keys** (verified from Exa's docs). API at `https://api.exa.ai`. | `Authorization: Bearer $EXA_API_KEY` or `x-api-key`. The `exa-js` SDK reads `EXA_API_KEY` from the environment automatically. | $10/mo plus a $10 onboarding bonus |
| **Brave Search API** | `BRAVE_SEARCH_API_KEY` | Dashboard at **https://brave.com/search/api** (verified). | `X-Subscription-Token: <key>` header | $5/1k requests, $5 free credits/month |
| **Firecrawl** | `FIRECRAWL_API_KEY` | Already exercised in this repo via the `firecrawl` skill; a `.firecrawl/` directory exists at the repo root. | Bearer token | Free tier available |

**Recommendation:** add `EXA_API_KEY`. It's the closest functional match to Tavily (content-included responses, built for agents), its SDK reads the env var with no code change, and it's the strongest on the retrieval benchmarks Exa publishes. Wire it behind the same `searchWithTavily`-shaped seam in `lib/ai/tools.ts:57` so the fallback is a `try/catch`, not a refactor.

#### b) French translation

There is currently **no i18n layer of any kind**. `app/layout.tsx:62` hardcodes `locale: "en_CM"`. There are no locale route segments, no message catalogues, no translation libraries in `package.json`. If French is coming, this needs a genuine architecture decision (route-based `/fr/...` vs. client-side dictionary) plus a translation provider:

| Option | Variable | Where to get it | Notes |
| --- | --- | --- | --- |
| **DeepL** | `DEEPL_AUTH_KEY` | Account at https://www.deepl.com/pro-api, key from the dashboard. Docs: **https://developers.deepl.com/docs/getting-started/auth** (verified) | Header `Authorization: DeepL-Auth-Key <key>`. Two base URLs: `https://api-free.deepl.com` (Free) and `https://api.deepl.com` (Pro). **500,000 characters/month free.** Best quality for the English↔French pair specifically. |
| **Google Cloud Translation v3** | `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_LOCATION`, plus a service-account JSON credential | Console: **https://console.cloud.google.com/apis/credentials** (verified) | Already have a Google Cloud project for OAuth, so this is incremental. Full FR support including Cameroonian French registers. Heavier setup (service-account JSON, not a single key). |

**Recommendation:** DeepL. One key, one header, 500k free characters/month, and FR is its strongest language pair. Note the security implication: translating user-authored content and AI output through a third party is a data-transfer decision worth making explicitly, not by default.

#### c) SMS / code-by-text (phone sign-up, currently deferred)

Zero SMS code exists in the codebase — the only occurrence of "SMS" is user-facing copy about a Fapshi transaction reference (`app/(dashboard)/subscription/page.tsx:1001`). Better-auth is configured for **email** OTP (`lib/auth.ts:95-109`) only. When phone sign-up lands it will need:

| Provider | Variables | Where to get it | Notes |
| --- | --- | --- | --- |
| **Africa's Talking** (recommended for Cameroon) | `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY` | Dashboard: https://account.africastalking.com. Docs: **https://developers.africastalking.com/docs/authentication** (verified) | Auth is an `apiKey` header plus a `username`. **On sandbox the username is literally `sandbox`.** Live SMS endpoint `https://api.africastalking.com/version1/messaging`; sandbox `https://api.sandbox.africastalking.com/version1/messaging` (both verified). Strong Cameroon/MTN/Orange coverage — the same operators Fapshi settles through. |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | https://www.twilio.com/try-twilio | `Verify` handles OTP delivery and validation. Well-documented, but Cameroon MTN/Orange routing quality and pricing are weaker than Africa's Talking. |

Two Cameroon-specific notes: MTN's Cameroonian network requires **explicit prior approval** before you may send A2P SMS to its subscribers, and Orange Cameroon has its own commercial terms. Budget lead time for both — this is the long pole in a phone-OTP launch, not the API integration.

#### d) Offline / cache store

There is **no** service worker, no `next-pwa`, no Serwist, no Workbox, no IndexedDB library (`idb-keyval`, `localforage`), and no offline strategy anywhere in the repo. Grep confirms zero hits.

Server-side, caching exists but is ephemeral: `lib/ai/cache.ts:9` is a bare `new Map()` with the comment *"In-memory cache — no Redis dependency / For production with multiple instances, replace with DB or Redis."* Every serverless cold start loses all cached AI results, and the cache is not shared across instances.

| Need | Candidate | Variable to add | Notes |
| --- | --- | --- | --- |
| Shared server-side cache | Redis (Upstash, Vercel KV, or self-hosted) | `REDIS_URL` / `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Replaces the `Map` in `lib/ai/cache.ts`. The AI cache is the single biggest win — `cacheTtlMs` values in `lib/ai/registry.ts` range from 0 to 30 days, and today none of them survive a redeploy. |
| Client-side offline | Serwist or `next-pwa` + IndexedDB | none required | Needed for the offline study experience implied by the market (spotty connectivity). No credential needed; it's a build-time concern. |
| Edge KV for cached content | Vercel KV / Upstash Redis REST | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | If you want `unstable_cache` / `revalidateTag` backed by something real. |

---

## 5. Security findings

### 5.1 HIGH — `NEXT_PUBLIC_APP_URL` decides a server-side trust boundary

`NEXT_PUBLIC_APP_URL` is **inlined into the browser bundle** by Next.js at build time. It is simultaneously used at `lib/auth.ts:62` as the sole entry in better-auth's `trustedOrigins`:

```ts
trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"],
```

That array is the CSRF origin allow-list for session-cookie-bearing auth requests. A variable that ships to every browser is deciding which origins the server will accept credentials from. In practice it's not attacker-controlled — it's in the deploy config — so this is a **design** flaw rather than an active exploit. But:

- It means a client-side bundle value and a server-side security control can never be independently rotated or audited.
- `BETTER_AUTH_TRUSTED_ORIGINS` (verified as read by better-auth) exists precisely for this and is **unused**. Use it on the server; keep `NEXT_PUBLIC_APP_URL` for the browser only.
- The `!` assertion before `||` is dead: `process.env.X!` is only a TypeScript assertion, so `undefined! || "http://localhost:3000"` does fall back correctly. Behaviourally safe, but it reads as if the fallback can't happen.

**Fix:** `trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")`.

### 5.2 HIGH — an unset `FAPSHI_WEBHOOK_SECRET` makes the webhook publicly writable

`app/api/webhooks/fapshi/route.ts:34`:

```ts
authHeader !== `Bearer ${process.env.FAPSHI_WEBHOOK_SECRET}`
```

If the variable is unset, this becomes the literal string comparison `authHeader !== "Bearer undefined"`. Two consequences:

1. Anyone who sends `Authorization: Bearer undefined` **passes the check** and can post a fabricated payment-success payload, crediting themselves a subscription or triggering affiliate commission (`COMMISSION_RATE = 0.2` at `:25`).
2. The route is in `proxy.ts`'s `publicPaths` (it starts with `/api/webhooks`), so there is no session or Arcjet `shield` protection standing in front of it.

Secondary issue on the same line: `!==` on secrets is not timing-safe. Use `crypto.timingSafeEqual`.

**Fix:** fail closed — `const expected = process.env.FAPSHI_WEBHOOK_SECRET; if (!expected) return 503;` then compare with `timingSafeEqual`.

### 5.3 MEDIUM — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` use non-null assertions with no guard

`lib/auth.ts:34-35`:

```ts
clientId: process.env.GOOGLE_CLIENT_ID!,
clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
```

The `!` silences TypeScript and does nothing at runtime. With either value missing, `betterAuth()` still constructs successfully and the app boots green — then "Sign in with Google" fails at click time with an opaque error, and email delivery of failure diagnostics is impossible because SMTP may be broken too. Validate at startup and fail loudly, or drop the provider config entirely when unconfigured.

`ARCJET_KEY` has the same class of problem with worse consequences: `proxy.ts:8` casts `as string` and constructs the Arcjet client at module scope inside a middleware that matches nearly every route.

### 5.4 MEDIUM — hardcoded weak credentials in `docker-compose.yml`

`docker-compose.yml:21-22`:

```yaml
PGADMIN_DEFAULT_EMAIL: admin@ticlearn.com
PGADMIN_DEFAULT_PASSWORD: admin
```

pgAdmin is bound to a host port. `docker-compose.yml` **is tracked in git**. If this compose file is ever run on a machine with a routable interface, that's an open database admin panel with the password `admin`. Same file also hardcodes the Postgres password `ticlearn_password` (`:11`), which must then be mirrored into `DATABASE_URL`.

Move these to an untracked `.env` consumed by compose's `${VAR}` substitution, or at minimum bind pgAdmin to `127.0.0.1`.

### 5.5 MEDIUM — unverified production payment host as a hardcoded fallback

`lib/fapshi.ts:7` falls back to `https://live.fapshi.com` when `FAPSHI_SANDBOX !== "true"`. Fapshi's published OpenAPI spec lists only `https://sandbox.fapshi.com` as a server. If the live hostname is wrong, the failure mode is a `fetch` that throws, caught by the bare `catch` at `lib/fapshi.ts:68` and returned as the user-facing string `"Gateway connection error"` — indistinguishable from a network outage. Payments fail silently in production with no log line and no alert.

Confirm the host from the Fapshi dashboard, and **always set `FAPSHI_BASE_URL` explicitly** so the fallback is never load-bearing.

### 5.6 LOW — hardcoded production URLs that should be `NEXT_PUBLIC_APP_URL`

Seven hardcoded occurrences of `https://ticlearn.ticsummit.org` sit alongside env-driven ones:

| File:line | Context |
| --- | --- |
| `app/sitemap.ts:4` | `const baseUrl = "https://ticlearn.ticsummit.org"` — sitemap URLs |
| `app/layout.tsx:16` | `metadataBase` — drives every canonical URL and OG tag |
| `app/layout.tsx:30` | author metadata URL |
| `app/robots.ts:25` | sitemap reference |
| `lib/email/send.ts:115, 164, 213, 261, 268, 324, 369, 373, 382, 431, 435, 440, 695, 712, …` | footers, dashboard links, support links inside HTML email templates |

The inconsistency is already visible: `lib/email/send.ts:490, 539, 771, 832` use `process.env.NEXT_PUBLIC_APP_URL`, while `:618` uses `process.env.NEXT_PUBLIC_APP_URL || "https://ticlearn.ticsummit.org"`, and a dozen other lines in the same file hardcode it. **Emails currently mix both**, so a staging deploy sends a mix of staging and production links. Consolidate on one variable.

### 5.7 Clean bill of health

- **No hardcoded secrets in source.** A regex sweep for `sk-`, `ajkey_`, `tvly-`, `nvapi-`, `AIza`, `ghp_`, and long `Bearer` literals across all `.ts`/`.tsx`/`.json`/`.sql`/`.yaml` found zero matches in application code (the only hits were an unrelated blog link in `docs/research/design-reference.md`).
- **`.env` is correctly gitignored** (`.gitignore:34` → `.env*`).
- **Only one `NEXT_PUBLIC_` variable carries no secret.** `NEXT_PUBLIC_APP_URL` is a URL. The two PostHog variables in the same family carry project credentials but are inert (not wired) — remove them rather than treat them as safe.
- **Email OTP is the primary sign-in flow**, and `BETTER_AUTH_SECRET` correctly has no browser-exposed counterpart.

---

## 6. Recommended `.env.example` shape

Not written — this audit produced research only — but the ordering the inventory implies:

1. **Database** — `DATABASE_URL`, plus commented `DIRECT_URL` / `SHADOW_DATABASE_URL` for Neon.
2. **App** — `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_SECRET` (with the `openssl rand -base64 32` command inline), `BETTER_AUTH_URL`, commented `BETTER_AUTH_TRUSTED_ORIGINS`.
3. **Auth** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, with the redirect-URI recipe.
4. **AI** — `GOOGLE_GENERATIVE_AI_API_KEY`, `TAVILY_API_KEY`.
5. **Email** — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `ADMIN_EMAIL`.
6. **Security** — `ARCJET_KEY`, `ARCJET_ENV`.
7. **Payments** — `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET`, `FAPSHI_SANDBOX`, `FAPSHI_BASE_URL`.
8. **Jobs** — `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_DEV`.
9. **Uploads** — `UPLOADTHING_TOKEN` **only**.
10. **Delete** — `OPENAI_API_KEY`, `NIM_API_KEY`, `UPLOADTHING_APP_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
11. **Consolidate** — drop `example.env`, or fold it into `.env.example` as the single source.

Each entry should carry: what it is for in one line, whether it's required, whether it reaches the browser, the exact format, and a vendor link to where the value comes from — the content of §3 above, inlined.