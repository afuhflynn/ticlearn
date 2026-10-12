# Stack, AI Routing and Storage — Research Report

**Repo:** `TiC_Foundation/ticlearn` · **Date:** 12 October 2026
**Scope:** verification of the installed stack, then research on the Vercel AI SDK, OpenRouter, a model fallback chain, Neon + object storage, Next.js 16 / Prisma 7 / nuqs / Biome, and tooling.

**Sources used:** official documentation first (Vercel AI SDK, OpenRouter, Neon, Next.js, Prisma, nuqs, Biome, UploadThing), live API data from `https://openrouter.ai/api/v1/models`, and a small number of third-party posts clearly marked where used. Anything inferred rather than confirmed is marked **[unverified]**.

---

## 0. Ground truth: what is actually installed

Verified by reading `package.json`, `pnpm-lock.yaml`, `node_modules/*/package.json` and the named source files — **not** by reading `AGENTS.md`.

### 0.1 Installed versions (from `node_modules`)

| Package | `package.json` range | **Installed** | Latest on npm (12 Oct 2026) |
| --- | --- | --- | --- |
| `ai` | `^6.0.149` | **6.0.156** | **7.0.137** |
| `@ai-sdk/react` | `^3.0.151` | **3.0.158** | (tracks `ai` major) |
| `@ai-sdk/google` | `^3.0.79` | **3.0.79** | — |
| `@ai-sdk/openai` | `^3.0.51` | **3.0.52** | **4.0.91** |
| `@ai-sdk/openai-compatible` | `^2.0.48` | **2.0.48** | — |
| `@ai-sdk/provider`, `@ai-sdk/provider-utils` | *(not declared)* | **NOT INSTALLED** (transitive) | — |
| `@openrouter/ai-sdk-provider` | **ABSENT** | **NOT INSTALLED** | **3.1.0** |
| `next` | `16.2.2` (pinned) | **16.2.2** | **16.4.0** |
| `react` / `react-dom` | `19.2.4` (pinned) | **19.2.4** | — |
| `prisma` / `@prisma/client` | `^7.7.0` | **7.7.0** | CLI latest is an `8.0.0-rc`; stable client **7.10.0** |
| `@prisma/adapter-pg` | `^7.7.0` | **7.7.0** | — |
| `uploadthing` | `^7.7.4` | **7.7.4** | 7.7.4 (current) |
| `@uploadthing/react` | `^7.3.3` | **7.3.3** | — |
| `nuqs` | `^2.8.9` | **2.8.9** | **2.10.2** |
| `@biomejs/biome` | `2.2.0` (pinned) | **2.2.0** | **2.5.15** |
| `inngest` | `^4.1.2` | **4.2.0** | — |
| `zod` | `^4.3.6` | **4.3.6** | — |
| Node runtime | — | **v24.17.0** | AI SDK 7 needs ≥22 ✅ |
| Package manager | — | `pnpm` (workspace file present) | — |

### 0.2 Corrections to the brief and to `AGENTS.md`

Four claims in the task brief / `AGENTS.md` do not match the code. **The code wins.**

1. **OpenRouter is NOT in `package.json`.** `grep -ri openrouter` across `package.json`, `pnpm-lock.yaml`, `app/`, `lib/`, `components/` returns **zero** matches. The only hit in the repo is a string literal inside `components/ai-elements/model-selector.tsx:144`, a vendored AI-Elements component listing every provider the OpenCode/AI-SDK ecosystem supports — it is a type union, not a dependency. **Nothing imports OpenRouter. `@openrouter/ai-sdk-provider` must be installed.**

2. **There is no multi-model fallback chain.** `lib/ai/registry.ts` declares a `TaskConfig.chain: LanguageModel[]` for all eight tasks, but every single entry is `chain: [gemini]` where `const gemini = google("gemini-2.5-flash")`. `lib/ai/orchestrator.ts:7` re-declares its own `const gemini = google("gemini-2.5-flash")` and **every** exported function (`generate`, `streamChat`, `generateTextWithFallback`, `generateCritical`, `generateTextCritical`) hardcodes `model: gemini`. The `chain` field is read only for `cacheTtlMs`; the array itself is never iterated.

3. **There is no OpenAI critical path.** `@ai-sdk/openai` is installed but **zero files import it**. There is no `openai(...)` instance anywhere. `generateCritical` (`orchestrator.ts:107-135`) is a **byte-for-byte duplicate** of `generate` (`orchestrator.ts:54-81`) — same `gemini` model, same `generateObject`, same `timeout: 10_000`, same `maxRetries: 1`. The comments in `AGENTS.md` claiming a `[gpt → gemini → nemotron → mistral → deepseek]` chain, a "working model cache (5 min TTL)", and a "dead model cache (30s negative TTL)" describe **code that does not exist**. There is no health-check function, no model cache, no `tryCachedModel` / `reportModelSuccess` / `reportModelFailure`.

4. **`OpenAI_API_KEY` and `NIM_API_KEY` are in `.env.example` but the only AI key actually used is `GOOGLE_GENERATIVE_AI_API_KEY`.** `AI_MODEL` is not configurable via env — `gemini-2.5-flash` is hardcoded in two places.

**What is genuinely true:** `proxy.ts` exists (Next 16 rename done ✅); the fullscreen `requestFullscreen()`-from-user-gesture fix and the `ProcessingStatus` enum are described in `AGENTS.md` and are consistent with the schema, but were not re-verified line-by-line as they are outside this report's scope.

### 0.3 Actual call graph of the AI layer

```
lib/ai/instances.ts      → export { google }                    (the ONLY provider instance)
lib/ai/registry.ts       → taskRegistry: 8 tasks, all chain:[google("gemini-2.5-flash")]
lib/ai/cache.ts          → in-process Map, sha256(task:prompt), TTL. No Redis. Per-instance only.
lib/ai/orchestrator.ts   → 5 exports, all `model: gemini`, all `timeout: 10_000`
lib/ai/index.ts          → generateQuizFromNote, generateQuizFromTopic, generateExamQuestions,
                           gradeOpenAnswer, explainMCQAnswer, summarizeText, extractTextFrom{PDF,Image,Word}
app/api/ai/chat/route.ts → imports generateText + streamText DIRECTLY from "ai" (bypasses the orchestrator!)
                           calls result.toUIMessageStreamResponse(...)
lib/inngest/paper3-exam-functions.ts, question-ingest.ts, mock-generator.ts
                         → import generateObject from "ai" directly (bypasses the orchestrator!)
```

**Two structural facts that matter for the chain work:**
- **`app/api/ai/chat/route.ts` does not use the orchestrator.** It imports `generateText`/`streamText` straight from `ai`. Any fallback chain added to `orchestrator.ts` will **not** protect the chat tutor.
- `generateObject` is used in 4 places (`orchestrator.ts` ×2, `question-ingest.ts`, `paper3-exam-functions.ts`, `mock-generator.ts`). This function is **deprecated** in AI SDK 6 and gone in the v7 migration story — see §1.4.

---

## 1. The Vercel AI SDK — current state

### 1.1 Version status

**Current major version is 7.** `ai@7.0.0` shipped **25 June 2026**; `7.0.137` is current. We are on **6.0.156** — one major behind, roughly four months.

- Changelog: https://vercel.com/changelog/ai-sdk-7
- Blog post: https://vercel.com/blog/ai-sdk-7
- Migration guide (canonical): https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- Release notes: https://github.com/vercel/ai/releases/tag/ai@7.0.0

**Two hard requirements for v7:** Node.js **22+** (we are on 24.17 ✅ — note Node 22 hit EOL 30 Apr 2026; prefer Node 24/26) and **ESM-only** — CommonJS `require()` is removed entirely.

**The official upgrade path:**

```bash
npx @ai-sdk/codemod v7          # automates most renames
npx skills add vercel/ai --skill migrate-ai-sdk-v6-to-v7
```

### 1.2 Breaking changes v6 → v7, mapped to *our* code

| Change | Impact on ticlearn |
| --- | --- |
| **ESM only** — `require()` removed | Project is TS + bundler; effectively no-op, but blocks any CJS consumer |
| **Node 22+** | Already satisfied |
| `system` → **`instructions`** | **High.** `orchestrator.ts` passes `system:` in `generate`, `streamChat`, `generateTextWithFallback`, `generateCritical`, `generateTextCritical` — 5 call sites |
| System messages inside `prompt`/`messages` now **rejected by default**; needs `allowSystemInMessages: true` | **Medium.** `orchestrator.ts` types `messages` with a `"system"` role and `streamChat` even types `"tool"`. Must audit |
| `onFinish` → **`onEnd`** | **High.** `streamChat` accepts `onFinish`; `app/api/ai/chat/route.ts` likely passes it |
| `fullStream` → **`stream`** | **High.** `toUIMessageStreamResponse()` consumes it |
| `experimental_output` → **`output`** | Low (we still use `generateObject`) |
| `experimental_prepareStep` → `prepareStep`; `experimental_telemetry` → `telemetry` | None today |
| `experimental_context` → per-tool **`context`** + `contextSchema`; shared state → **`runtimeContext`** | **High.** `lib/ai/tools.ts` is ~500+ lines of tools; anything passing `experimental_context` needs restructuring |
| `needsApproval` on `tool()` **deprecated** → move to `toolApproval` on `generateText`/`streamText`/`ToolLoopAgent` | **High.** `lib/ai/tools.ts` is the AI tool layer |
| `result.toUIMessageStreamResponse()` / `toTextStreamResponse()` **deprecated** → top-level `createUIMessageStreamResponse` / `createTextStreamResponse` | **High.** `app/api/ai/chat/route.ts:367` |
| `CallSettings` split into `LanguageModelCallOptions` + `RequestOptions` | **High.** `orchestrator.ts` passes `...(opts.modelOptions as Record<string, unknown>)` — an untyped escape hatch that will break type-checking |
| Multi-step results now cumulative; final-step-only data moved to **`result.finalStep`** | Medium |
| Request/response bodies **excluded by default** (opt-in via `include`) | Low, but changes debug ergonomics |
| `cachedInputTokens` / `reasoningTokens` **removed** from `LanguageModelUsage` | **Medium.** We will need token accounting for the XAF cost model — this lands directly in the way |
| Telemetry moved out to **`@ai-sdk/otel`**, opt-out instead of opt-in | Low (we don't use telemetry) |
| UI parts: legacy `media` and `image` parts removed → **`file` parts with media types**; new `reasoning-file` content type | **Medium.** `components/chat/chat-message-list.tsx:120` renders `ToolParts`; `lib/chat-messages.ts` casts `UIMessage["parts"]` |
| Provider spec bump → **`@ai-sdk/*` majors**: openai 3→4, google 3→? | Mechanical, codemod handles it |
| Security fixes: tool-approval replay re-validation; `onError` now redacts server error detail by default | **Positive.** `TiCExamAssistant` / `ExamAssistant` currently risk leaking hostnames/paths into student-facing error chunks |

### 1.3 Current streaming & tool calling API (v7 target)

```ts
// Server route
import { streamText, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream }
  from 'ai';

const result = streamText({
  model,                       // a LanguageModelV4
  instructions: systemPrompt,   // was `system`
  messages: await convertToModelMessages(uiMessages),
  tools,
  stopWhen: isStepCount(20),    // was `stepCountIs`
  reasoning: { effort: 'medium' },   // NEW in v7, provider-agnostic
  onEnd: async ({ text, usage }) => { /* was onFinish */ },
  timeout: 10_000,
  maxRetries: 0,
});

return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream, originalMessages: uiMessages }),
});
```

Tool execution is unchanged in spirit: `tool({ description, inputSchema, execute })`, `execute` typed via Zod v4. Approval moves to a call-level `toolApproval` map.

### 1.4 Structured output — the important one for us

`generateObject` / `streamObject` were **deprecated in AI SDK 6** (vercel/ai PR #10754) because they could not combine with tool calling. The replacement is `generateText` + `Output`:

```ts
import { generateText, Output, NoObjectGeneratedError } from 'ai';

const { output } = await generateText({
  model,
  output: Output.object({ schema: quizSchema }),
  prompt,
});
// failure → NoObjectGeneratedError | NoOutputGeneratedError
```

Mapping table (from https://github.com/vercel/ai/pull/12707):
`generateObject({schema})` → `generateText({ output: Output.object({ schema }) })`; `result.object` → `result.output`; `output:'array'` → `Output.array({ element })`; `output:'enum'` → `Output.choice({ options })`; `output:'no-schema'` → `Output.json()`; `partialObjectStream` → `partialOutputStream`.

**This is exactly the migration we want anyway**, because it means one code path (`generateText`) serves both structured generation and plain text — so the fallback chain wraps one function, not two.

### 1.5 The UI message parts model

`UIMessage<METADATA, DATA_PARTS, TOOLS>` is the UI source of truth (distinct from `ModelMessage`, which is what gets sent to the model). Source of truth: https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message

Canonical part types in v7:

- `TextUIPart` — `{ type:'text', text, state:'streaming'|'done' }`
- **`ReasoningUIPart`** — `{ type:'reasoning', id?, text, state?, providerMetadata? }`
- `ToolUIPart` — `{ type: 'tool-<NAME>', toolCallId, state }` with states `input-streaming`, `input-available`, **`approval-requested`**, **`approval-responded`**, `output-available`, `output-error`
- `DynamicToolUIPart` — same shape for MCP / dynamic tools
- **`FileUIPart`** — `{ type:'file', mediaType, filename?, url }` (a hosted URL *or* a Data URL). **This is the v7 replacement for the old `image` and `media` parts.**
- `SourceUrlUIPart`, `SourceDocumentUIPart`
- `DataUIPart` — `{ type: 'data-<NAME>', id?, data }` for your own streamed payloads
- `CustomContentUIPart` — `{ type:'custom', kind:'{provider}.{type}' }`
- `StepStartUIPart`

Message-level metadata (`message.metadata`) is separate from data parts and is the right home for `model`, `totalTokens`, `createdAt`, `finishReason`. Docs: https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata

**For ticlearn's photographed-notes flow, `FileUIPart` is the correct type** — a photographed page is a file with a media type, not a legacy image part.

### 1.6 Providers and how provider packages register

A provider package (`@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, or the community `@openrouter/ai-sdk-provider`) exports a **factory** that returns something satisfying the `LanguageModelV*` spec:

```ts
export const createOpenRouter = (options?: OpenRouterProviderSettings): OpenRouterProvider => { … }
```

`OpenRouterProvider extends ProviderV3` and is callable: `openrouter('anthropic/claude-sonnet-5.5')`, plus `.languageModel`, `.chat`, `.completion`, `.textEmbeddingModel`, `.embedding`, `.imageModel`. This means swapping `@ai-sdk/google` for `@openrouter/ai-sdk-provider` is a **one-line change in `lib/ai/instances.ts`** — the only file that constructs a model.

Community provider docs: https://ai-sdk.dev/providers/community-providers/openrouter

### 1.7 Middleware

`wrapLanguageModel({ model, middleware })` returns a new model whose `doGenerate`/`doStream` are intercepted. Three hooks: `transformParams`, `wrapGenerate`, `wrapStream`. Every middleware object sets `specificationVersion: 'v4'` in v7 (was `'v3'`).

Docs: https://ai-sdk.dev/docs/ai-sdk-core/middleware · https://ai-sdk.dev/docs/reference/ai-sdk-core/wrap-language-model

Built-in middleware: `extractReasoningMiddleware`, `extractJsonMiddleware`, `simulateStreamingMiddleware`, `defaultInstructionsMiddleware`, `defaultSettingsMiddleware`, `addToolInputExamplesMiddleware`.

**This is the correct home for our circuit breaker, retry accounting, and cache-hit reporting** — a `wrapGenerate` that catches a thrown provider error, records the failure in the breaker, and rethrows. It works uniformly for `generateText`, `streamText` and agents without touching call sites.

### 1.8 Agent primitives

- **`ToolLoopAgent`** — the loop (tool calls → results → decide) with `stopWhen`, `prepareStep`, `toolApproval`, `runtimeContext`, `toolsContext`, `experimental_sandbox`. Docs: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- `HarnessAgent` — wrap an established harness (Claude Code, Codex, Pi)
- `WorkflowAgent` — **durable execution that survives deploys**; this is the agent primitive designed for Inngest-style work
- `createAgentUIStream` / `createAgentUIStreamResponse` / `pipeAgentUIStreamToResponse` — stream agent output as UI chunks
- `@ai-sdk/tui` — run an agent in a terminal UI for local iteration
- MCP Apps, tool approvals, `WorkflowAgent` resumability
- Overview: https://ai-sdk.dev/docs/agents/overview

### 1.9 Recommendation on migration timing

**Do the OpenRouter chain first, on AI SDK 6. Migrate to v7 as a separate, second change.**

Reasons:
1. The chain work touches every AI call site anyway; bundling two large refactors means one giant diff and one giant rollback surface.
2. `@openrouter/ai-sdk-provider@2.9.1` explicitly targets `ai@^6`; `3.x` targets `ai@^7`. Both versions exist, so we can install first and bump the provider in the same commit as the SDK bump.
3. The v7 migration touches `lib/ai/tools.ts` (`experimental_context` → `context`/`contextSchema`, `needsApproval` → `toolApproval`) and `app/api/ai/chat/route.ts` (stream helpers). Those are independent of routing.
4. Sequencing the SDK bump after the chain means the chain is already tested against real failures when the upgrade lands.

Note the codemod cannot decide ESM/runtime/`instructions` semantics, `runtimeContext`/`toolsContext` restructuring, or approval-policy placement. Budget for manual review of `lib/ai/tools.ts` specifically.

---

## 2. OpenRouter as the AI SDK provider

### 2.1 Package and setup — exact

```bash
# ON AI SDK 6 (current, ai@6.0.156):
pnpm add @openrouter/ai-sdk-provider@2.9.1

# AFTER migrating to ai@7:
pnpm add @openrouter/ai-sdk-provider@3.1.0     # requires Node 22+, ESM only
```

```ts
// lib/ai/instances.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  compatibility: 'compatible',   // default; 'strict' for OpenRouter's own API
  headers: { 'HTTP-Referer': 'https://ticlearn.app', 'X-Title': 'TiCLearn' },
});

export const model = openrouter('anthropic/claude-sonnet-5.5');
```

The default singleton `openrouter` from the package uses `compatibility: 'strict'`. Note from the provider source: *"`strict` breaks providers like Groq"*, which is why the factory defaults to `compatible`.

The factory returns a `ProviderV3`-shaped callable — `openrouter(id)` is a drop-in for `google(id)` in `lib/ai/instances.ts`. It also exposes `.chat`, `.completion`, `.textEmbeddingModel`, `.embedding`, `.imageModel`, so embeddings and image generation become available through the same key later.

Docs: https://openrouter.ai/docs/guides/community/vercel-ai-sdk · https://ai-sdk.dev/providers/community-providers/openrouter · https://github.com/OpenRouterTeam/ai-sdk-provider

### 2.2 How model routing works

Two distinct layers — this is the key conceptual point.

**Layer A — provider routing (within one model).** By default OpenRouter load-balances across the upstreams serving that model. Controllable via a `provider` object: `order` (explicit provider slug priority), `allow_fallbacks` (default `true`), `require_parameters`, `data_collection`, `zdr`, `sort: { by: 'price'|'throughput'|'latency', partition: 'model'|'none' }`. The default price-aware algorithm: deprioritise providers with outages in the last 30s, then pick the lowest-cost stable provider weighted by inverse-square price, then keep the rest as fallbacks. Docs: https://openrouter.ai/docs/guides/routing/provider-selection

**Layer B — model routing (across models).** The `models` parameter: an ordered array tried in order on failure.

```ts
{
  model: 'qwen/qwen3.7-flash',            // primary
  models: ['z-ai/glm-5.3-flash', 'google/gemini-3.1-flash-lite', 'anthropic/claude-sonnet-5.5']
}
```

Fallback triggers on: **context-length validation errors, moderation refusals, rate limiting, downtime.** You are billed for **the model that actually served the request**, returned in the response's `model` attribute. Docs: https://openrouter.ai/docs/guides/routing/model-fallbacks

Note the sharp edge: because context-length errors trigger a fallback, a genuinely-too-long prompt silently burns a second (and third) model's tokens before failing. **Truncate context ourselves before calling**, or the "fallback" is just expensive noise.

Anthropic-Messages-API shape (`fallbacks`) is capped at **3 entries** and cannot be combined with `models`. The `models` array on Chat Completions has no documented cap in the page we read — **[unverified]** whether there is a hard maximum length.

### 2.3 OpenRouter Fusion — what it is, and why it is not what we want

Fusion is a **compound inference system**, not a routing layer. A panel of 1–8 models answers the prompt in parallel (with web search + web fetch), a **judge/analyst** model compares their answers and emits structured JSON (consensus, contradictions, partial coverage, unique insights, blind spots), and the calling model writes the final answer from that analysis. Entry points: `model: "openrouter/fusion"` or the `openrouter:fusion` server tool / plugin.

- Cost: **4–5× a single completion** with the default 3-model panel; scales linearly with panel size.
- Latency: **2–3× a single call.** OpenRouter's own docs say this "usually rules out chat, autocomplete, and other real-time paths."
- Quality caveat: OpenRouter explicitly warns it hurts **evals and regression suites**, and is overkill for classification, extraction, short rewrites, format conversion.

Docs: https://openrouter.ai/docs/guides/routing/routers/fusion-router · https://openrouter.ai/blog/insights/fusion-explainer/ · https://openrouter.ai/docs/guides/features/plugins/fusion

**Verdict: not for ticlearn.** It is 4–5× cost and 2–3× latency for *quality diversity on hard prompts*. Our problem is *availability* — Gemini going down. Fusion runs a panel and then still fails if all panelists fail. It is the wrong primitive. Its real lesson ("selective escalation for a small set of expensive-to-get-wrong prompts") is worth stealing, which §3.4 does.

### 2.4 Pricing, margin, rate limits

- **Token prices are pass-through.** No markup on the model price — you pay the upstream list rate.
- **The fee is on credit purchase, not usage**: **5.5% on Standard** (min $0.80), 8% on Business, 5% flat on crypto. The old $0.35 Stripe fee was removed. Docs: https://openrouter.ai/blog/announcements/simplifying-our-platform-fee/ · https://openrouter.ai/pricing · https://openrouter.ai/docs/faq
- The $0.80 minimum is brutal on small top-ups — a $5 purchase pays 16%. **Top up in ≥$100 blocks.**
- **Credits expire one year after purchase**; refunds are 24-hour; platform fees are never refunded. Budget for this.
- **Rate limits:** Free tier = 50 req/day, 20 rpm on `:free` models. Paid models have **no OpenRouter-imposed cap** — provider limits pass through. Docs: https://openrouter.ai/docs/api_reference/limits
- Error taxonomy you must handle: `402` credit limits, `403` budget limits, `429` rate limits.
- BYOK: $25,000/month of list-price inference at no fee, 5% after — irrelevant to us at our scale, but note the 5% is *lower* than the 5.5% Standard fee once you're past $25k/month. **[unverified]** what counts toward the $25k across models.
- **Business plan at 8% for identical token prices is hard to justify**; stay on Standard.

### 2.5 Prompt caching — supported, and it materially changes our unit economics

Yes, fully supported, and OpenRouter does two useful things for us:

1. **Provider sticky routing** — after a cached request, subsequent requests route to the same provider to keep the cache warm. Only activates when the cache read price is cheaper than regular input price. Sessions expire after 10 min idle. Overridden by an explicit `provider.order`.
2. **Cross-vendor marker translation** — an Anthropic `cache_control` block becomes an OpenAI `prompt_cache_breakpoint` and vice versa, so one cache marker works across the chain.

Per-vendor behaviour: OpenAI (automatic, 1024-token minimum; GPT-5.6+ charges cache *writes* at 1.25×), Anthropic (explicit `cache_control`, 5-min default, 1-hour TTL at 2× write / 0.1× read), Gemini 2.5+ (implicit, 0.25× read), DeepSeek/Qwen/GLM/Z.AI (various).

Critical gotcha: on GPT-5.6+ a prompt over 1024 tokens costs **more** with caching on than off unless it's actually read again. Our chat tutor has a large stable system prompt + history prefix that *is* re-read — so caching wins there. One-shot quiz generation should use `prompt_cache_options.mode: "explicit"` with no breakpoint, or just not cache.

Docs: https://openrouter.ai/docs/guides/best-practices/prompt-caching

### 2.6 Reasoning token controls — yes, well-supported

A single normalised `reasoning` object across vendors:

```json
{ "reasoning": { "effort": "high" } }                        // OpenAI-style: max|xhigh|high|medium|low|minimal|none
{ "reasoning": { "max_tokens": 2000 } }                      // Anthropic-style budget
{ "reasoning": { "enabled": true } }
{ "reasoning": { "exclude": true } }                         // reason internally, don't return
```

`effort` maps to percentages of `max_tokens` (high ≈ 80%, medium ≈ 50%, low ≈ 20%, minimal ≈ 10%, max/xhigh ≈ 95%). Gemini 3 maps `effort` → `thinkingLevel`. Per-model capabilities are discoverable from `GET /api/v1/models` (`reasoning.supported_efforts`, `default_effort`, `default_enabled`, `supports_max_tokens`, `mandatory`).

**Three traps:**
- Reasoning tokens count against `max_tokens` and **are billed as output tokens**. Too small a `max_tokens` → empty content, `finish_reason: "length"`, and you still pay.
- For Anthropic, `max_tokens` must be **strictly greater** than the reasoning budget (min 1024, max 128,000).
- Changing `effort` mid-conversation **invalidates the prompt cache** unless you use OpenRouter's per-message `configuration_update` item (GPT-5.6+/Claude Fable 5.1+ only). Keep effort constant on cached prefixes.

`reasoning_details` arrays preserve encrypted/summarised thinking blocks across turns — essential for tool calling with reasoning models (Claude pauses its response at a tool call; without the preserved block it cannot resume coherently).

Docs: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens

### 2.7 Recommendation: our chain, not OpenRouter's

**Put the chain in our own orchestrator code. Use OpenRouter for Layer A (provider routing), not Layer B.**

| | Chain in our orchestrator | Chain via OpenRouter `models` array |
| --- | --- | --- |
| **Task-aware chain** | ✅ each `task` already has its own chain slot; chat ≠ quiz-gen ≠ grading | ❌ one `models` array per request, so you must know the task at request time anyway — you do, but the routing is then invisible |
| **Circuit breaker** | ✅ real state: N failures → skip that model for 30–120s | ❌ OpenRouter has no memory. It will re-try a model that is dead for you on every single request. **This is the decisive point.** |
| **Observability** | ✅ we can log which model served which task, per user, into our own DB | ⚠️ only via the response `model` field, post-hoc |
| **Cost control** | ✅ we can refuse to escalate past a price ceiling | ⚠️ OpenRouter will happily walk up your list |
| **Free/local models** | ✅ keep Gemini direct as a final non-OpenRouter fallback | ❌ the `models` array is all-OpenRouter |
| **Retry budget** | ✅ we control `maxRetries`, timeouts, deadline | ❌ opaque |
| **Latency** | ⚠️ a failed attempt costs real time before we know | ⚠️ same — but the fallback attempt is invisible to us, so a slow chain is harder to diagnose |
| **Effort per model** | ✅ we can set per-model `reasoning`/`max_tokens` | ❌ one set of params for the whole array |

The reasoning is simple: **OpenRouter's `models` array is a stateless retry list. A circuit breaker needs state. We need the state.** OpenRouter's fallback is genuinely good and costs nothing extra — use it *as a fourth layer* underneath our own chain, to absorb upstream-provider outages within a single model rather than escalating the whole model.

**Proposed layering:**

```
Layer 0  in-process LRU result cache (already exists: lib/ai/cache.ts)
Layer 1  OUR chain — task-aware ordered models, with circuit breaker per model
           ↓ if all models in the chain are open/error
Layer 2  OpenRouter `models` array within a single model (provider-level redundancy)
           ↓
Layer 3  direct provider SDK (keep @ai-sdk/google — Gemini direct) as the always-available floor
Layer 4  graceful degradation: cached result → templated response → typed error to the UI
```

---

## 3. The model chain

All prices below are **live**, pulled from `https://openrouter.ai/api/v1/models` on 12 Oct 2026 (458 models listed). XAF converted at **1 USD = 585.53 XAF** (open.er-api.com, 12 Oct 2026).

### 3.1 Candidate matrix

`✓` = supported per the API's `supported_parameters` / `architecture`. Context window in tokens.

| # | Model | Lab | Class | Ctx | In $/M | Out $/M | Cache read $/M | Image | Struct. output | Tools | Reasoning |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `qwen/qwen3.7-flash` | Alibaba Qwen | open | 1,000,000 | **0.030** | **0.130** | 0.006 | ✓ | ✗ | ✓ | ✓ |
| 2 | `google/gemma-4-26b-a4b-it` | Google | open | 262,144 | 0.068 | 0.225 | 0.0375 | ✓ | ✓ | ✓ | ✓ |
| 3 | `nvidia/nemotron-3-super-120b-a12b` | NVIDIA | open | 262,144 | 0.080 | 0.450 | — | ✗ | ✓ | ✓ | ✓ |
| 4 | `anthropic/claude-haiku-5.5` | Anthropic | frontier | 1,000,000 | 0.100 | 0.500 | 0.010 | ✓ | ✓ | ✓ | ✓ |
| 5 | `z-ai/glm-5.3-flash` | Zhipu AI | open | 1,000,000 | 0.150 | 0.500 | 0.030 | ✓ | ✓ | ✓ | ✓ |
| 6 | `google/gemini-3.1-flash-lite` | Google | frontier | 1,000,000 | 0.250 | 1.500 | 0.025 | ✓ | ✓ | ✓ | ✓ |
| 7 | `deepseek/deepseek-v4.1-flash` | DeepSeek | open | 1,000,000 | 0.300 | 1.200 | 0.006 | ✓ | ✓ | ✓ | ✓ |
| 8 | `google/gemini-3.8-flash` | Google | frontier | 1,000,000 | 0.750 | 3.750 | 0.075 | ✓ | ✓ | ✓ | ✓ |
| 9 | `mistralai/mistral-large-4-0` | Mistral | frontier | 1,000,000 | 0.680 | 2.090 | 0.070 | ✓ | ✓ | ✓ | ✓ |
| 10 | `moonshotai/kimi-k3` | Moonshot | open | 1,000,000 | 0.730 | 10.000 | 0.550 | ✓ | ✓ | ✓ | ✓ |
| 11 | `anthropic/claude-sonnet-5.5` | Anthropic | frontier | 1,000,000 | 2.000 | 10.000 | 0.100 | ✓ | ✓ | ✓ | ✓ |
| 12 | `anthropic/claude-opus-5.5` | Anthropic | frontier | 1,000,000 | 4.000 | 20.000 | 0.200 | ✓ | ✓ | ✓ | ✓ |

**On Qwen 3.7 Flash at $0.03/$0.13:** it is by far the cheapest capable model on the board, but the API reports **no `structured_outputs` support**. It is excellent for chat and reasoning; it must not be the default for quiz/exam generation. That single fact reshapes the recommended default (below).

### 3.2 Recommended chain (per task)

Cheapest-first within capability constraints, cheap models first, frontier only as escalation.

**`fast_chat` — the chat tutor (needs tools + streaming, text-only)**
```
1. qwen/qwen3.7-flash              $0.030/$0.130   ← DEFAULT, cheapest capable
2. nvidia/nemotron-3-super-120b    $0.080/$0.450   ← open, structured-output capable, 262k
3. anthropic/claude-haiku-5.5      $0.100/$0.500   ← frontier, strongest small model, excellent tools
4. google/gemini-3.1-flash-lite    $0.250/$1.500   ← 1M ctx, multimodal escape hatch
5. google/gemini-3.8-flash         $0.750/$3.750   ← escalation for hard questions
6. deepseek/deepseek-v4.1-flash    $0.300/$1.200   ← different lab, different failure domains
```
*(Plus a Layer-3 direct `@ai-sdk/google` Gemini instance below all of these.)*

**`quiz_gen` / `exam_gen` / `paper3_gen` — structured output required**
```
1. z-ai/glm-5.3-flash              $0.150/$0.500   ← DEFAULT: cheap, structured output ✓, multimodal ✓
2. anthropic/claude-haiku-5.5      $0.100/$0.500   ← cheaper on input, better on output-quality judgment
3. google/gemini-3.1-flash-lite    $0.250/$1.500
4. google/gemini-3.8-flash         $0.750/$3.750
5. anthropic/claude-sonnet-5.5     $2.000/$10.000  ← for "generate a full mock paper" where quality is the product
6. anthropic/claude-opus-5.5       $4.000/$20.000  ← last resort only
```

**`paper3_eval` / `grading` — essay marking, where a wrong grade is the worst outcome**
```
1. z-ai/glm-5.3-flash              $0.150/$0.500
2. anthropic/claude-sonnet-5.5     $2.000/$10.000  ← deliberate jump; marking quality is the product
3. google/gemini-3.8-flash         $0.750/$3.750
4. anthropic/claude-opus-5.5       $4.000/$20.000
5. deepseek/deepseek-v4-pro        $0.955/$1.911
6. moonshotai/kimi-k3              $0.730/$10.000  ← long-context reasoning specialist
```

**`vision` — photographed notes and past papers (needs image in)**
```
1. z-ai/glm-5.3-flash              $0.150/$0.500   ← DEFAULT: multimodal + cheapest structured
2. anthropic/claude-haiku-5.5      $0.100/$0.500   ← best small vision model, handles text+image+file
3. google/gemini-3.1-flash-lite    $0.250/$1.500   ← text+image+video+file+audio
4. deepseek/deepseek-v4.1-flash    $0.300/$1.200   ← image capable
5. google/gemini-3.8-flash         $0.750/$3.750
6. qwen/qwen3.8-omni-flash         $0.150/$0.470   ← text+image+audio+video
```

**`reasoning` (hard multi-step, tool-using)**
```
1. z-ai/glm-5.3-flash → 2. anthropic/claude-haiku-5.5 → 3. anthropic/claude-sonnet-5.5
4. google/gemini-3.8-flash → 5. moonshotai/kimi-k3 → 6. anthropic/claude-opus-5.5
```

**Chain membership by failure-domain diversity** — the reason `deepseek` and `z-ai` earn slots even though Gemini/Anthropic are stronger: they run on **different labs, different regions, different providers**. When Gemini has an incident, DeepSeek and GLM are the ones still up. A chain of three Google/Anthropic models fails together far more often than the price table suggests.

### 3.3 Monthly cost in XAF

Assumptions: **chat tutor 800 input / 500 output tokens per message**; light user = 200 messages/mo, heavy user = 600 messages/mo. Other jobs: 10 photographed docs/mo (2100 in incl. ~1500 image tokens / 900 out); 6 quizzes (4000/3000); 12 essays (6000/1500); 4 past papers (20000/6000).

**Cheapest model in the chain — `qwen/qwen3.7-flash` @ $0.030/$0.130**
| | USD | **XAF** |
|---|---|---|
| Light user, 200 msgs | $0.0178 | **≈ 10 XAF** |
| Heavy user, 600 msgs | $0.0534 | **≈ 31 XAF** |

**Most expensive model in the chain — `anthropic/claude-opus-5.5` @ $4.00/$20.00**
| | USD | **XAF** |
|---|---|---|
| Light user, 200 msgs | $2.64 | **≈ 1,546 XAF** |
| Heavy user, 600 msgs | $7.92 | **≈ 4,637 XAF** |

**Realistic default (GLM-5.3-Flash for chat, Haiku-5.5 for grading):**

| Job | Model | Light (200 msg) | Heavy (600 msg) |
|---|---|---|---|
| Chat tutor | `z-ai/glm-5.3-flash` | $0.074 → **43 XAF** | $0.222 → **130 XAF** |
| Chat tutor | `anthropic/claude-haiku-5.5` | $0.066 → **39 XAF** | $0.198 → **116 XAF** |
| Chat tutor | `qwen/qwen3.7-flash` | $0.018 → **10 XAF** | $0.053 → **31 XAF** |
| Chat tutor | `google/gemini-3.1-flash-lite` | $0.190 → **111 XAF** | $0.570 → **334 XAF** |
| Chat tutor | `google/gemini-3.8-flash` | $0.495 → **290 XAF** | $1.485 → **870 XAF** |
| Chat tutor | `anthropic/claude-sonnet-5.5` | $1.320 → **773 XAF** | $3.960 → **2,319 XAF** |

**Everything else, per student per month:**

| Job | Model | Cost |
|---|---|---|
| 10 photographed docs | `z-ai/glm-5.3-flash` | **≈ 4 XAF** |
| 10 photographed docs | `anthropic/claude-haiku-5.5` | **≈ 4 XAF** |
| 6 quizzes | `z-ai/glm-5.3-flash` | **≈ 7 XAF** |
| 6 quizzes | `anthropic/claude-haiku-5.5` | **≈ 7 XAF** |
| 6 quizzes | `google/gemini-3.1-flash-lite` | **≈ 19 XAF** |
| 12 essays graded | `z-ai/glm-5.3-flash` | **≈ 12 XAF** |
| 12 essays graded | `anthropic/claude-sonnet-5.5` | **≈ 190 XAF** |
| 4 past papers | `z-ai/glm-5.3-flash` | **≈ 14 XAF** |
| 4 past papers | `google/gemini-3.8-flash` | **≈ 88 XAF** |
| 4 past papers | `anthropic/claude-sonnet-5.5` | **≈ 234 XAF** |

**A realistic heavy user (600 chat on GLM + 10 docs + 6 quizzes + 12 essays on GLM + 4 papers) totals ≈ 190 XAF/month (~$0.32).** Add the 5.5% OpenRouter credit fee: **≈ 200 XAF**. Even if *every* heavy user escalated to Haiku-5.5, it is ≈ 135 XAF. Opus-5.5 across the board would be ≈ 4,900 XAF — about **25× a user's monthly mobile data budget in this market**, which is why it must never be a default.

**Prompt-caching effect on chat** (8,000-token stable prefix, 200 msgs): Haiku-5.5 drops from 123 XAF to **39 XAF**; GLM-5.3-Flash from 170 to **57 XAF**; Qwen 3.8 Flash from 168 to **43 XAF**. **Enable caching on the chat tutor with a stable system-prompt prefix — it is a 3–4× reduction on the largest recurring cost.**

### 3.4 Cheap default, escalation policy, circuit breaker

**Cheap default per task** — never start above the cheap end:

| Task class | Default | Rationale |
|---|---|---|
| Fast chat / light quiz | `qwen/qwen3.7-flash` | $0.03/$0.13, 1M ctx, tools, reasoning. **Text-only — no structured output.** |
| Structured generation (quiz, exam, paper3) | `z-ai/glm-5.3-flash` | $0.15/$0.50 with structured output ✓ and vision ✓ — the only sub-$0.20 model that does both |
| Vision | `z-ai/glm-5.3-flash` | same |
| Grading | `z-ai/glm-5.3-flash`, escalate immediately on low confidence | cheap first pass, expensive only when uncertain |

**Escalation policy — three triggers, not one:**

1. **Failure.** Error, timeout, or empty completion → next model in chain. Free.
2. **Schema failure.** `NoObjectGeneratedError` / `NoOutputGeneratedError` / JSON parse failure → next model. Free (already failed). *(This is the trigger that matters most for cheap models without native structured output.)*
3. **Confidence / complexity.** A cheap model returns a self-assessed confidence below threshold, or the prompt is flagged hard (full mock paper, essay marking) → escalate **before** spending more time on retries. For grading specifically: run GLM first; if confidence < 0.8, run Haiku-5.5, and if *their* verdicts disagree, run Sonnet-5.5 as the adjudicator. Two cheap models disagreeing is a strong, cheap signal that a human-grade answer matters.

**Never escalate on:** client abort (the user navigated away), 4xx from our own validation, or an auth/budget error (402/403) — those will fail identically on every model.

**Circuit breaker design:**

State per `task + modelId`, in a module-level `Map` with a TTL sweep (matching the existing `lib/ai/cache.ts` pattern — no new dependency):

```ts
interface BreakerState {
  consecutiveFailures: number;   // reset to 0 on any success
  openUntil: number;             // epoch ms; 0 = closed
  totalCalls: number;
  totalFailures: number;
  lastError: string;
}
```

| Rule | Value | Why |
|---|---|---|
| Open after | **3 consecutive failures** | One failure is often a transient network blip |
| Open duration | **30 s**, doubling to max **300 s** on repeat | Short enough that a provider recovering is picked up within one study session |
| Half-open probe | after `openUntil`, allow **exactly 1** request | Prevents a thundering herd from hammering a recovering provider |
| Success in half-open | close, reset to 0 | — |
| Failure in half-open | re-open for the full doubled duration | — |
| TTL sweep | every 60 s | Bounds memory; models never used again decay out |
| Scoping | per `(task, modelId)`, **global** across requests | A dead model is dead for everyone, not just this user |

**Two extra guards that matter more than the breaker itself:**

- **Per-request deadline.** Give the whole chain a wall-clock budget (e.g. 8 s for chat, 30 s for background jobs). If model 1 burns 6 s before failing, models 2–6 must know they have 2 s left. Without this, a dead head-of-chain produces a 60-second hang. **[This is the single most important detail in the whole design.]**
- **Single attempt per model per request.** No inner retries. The breaker handles systemic failure; `maxRetries: 1` inside a chain multiplies latency for no benefit.

### 3.5 Failure classes and which model handles which

| Class | HTTP | Retry same model? | Route to | Notes |
|---|---|---|---|---|
| **Rate limited (upstream)** | 429 | No | Next model; breaker +1 | Most common in production. Often provider-scoped → OpenRouter Layer 2 absorbs it without escalating the model |
| **Overloaded / capacity** | 429/503 | No | Next model; breaker +1 | Same handling |
| **Provider outage** | 5xx / connection | No | Next model; breaker +1, open the breaker | Exactly the case the chain exists for |
| **Credit exhausted (OpenRouter)** | 402 | No | **Do not retry anywhere.** Fail fast to Layer 4 | Retrying burns time to produce the same error |
| **Budget cap** | 403 | No | Fail fast | Config problem, not a model problem |
| **Context length exceeded** | 400 | No | **Truncate and retry, do NOT escalate** | OpenRouter's `models` array *will* fire on this and waste tokens on models that also can't fit it. Handle it ourselves before the chain |
| **Content moderated** | 400 | No | Next model | Different labs have different policies — this is where the GLM/DeepSeek fallback genuinely earns its slot |
| **Schema/structured-output failure** | — | No | Next model; **do not count toward breaker** | The model is alive; it just can't do this shape. Counting it would wrongly open the breaker on a healthy model |
| **Empty completion / no stop** | — | One retry, then next | — | |
| **Timeout (our deadline)** | — | No | Next model, **do not count toward breaker** | A slow model is not a dead model; it may be right for a background job |
| **Tool-calling failure / no tool call** | — | No | Next model | Cheap small models are the usual culprits |
| **Client abort** | — | No | Nothing | Stop immediately |
| **Vercel function timeout** | — | — | Background jobs only | Move Inngest jobs off the request path entirely |

---

## 4. Neon and storage

### 4.1 Neon Postgres — what we get

Neon is serverless Postgres (now branded "Lakebase Postgres"; part of Databricks since May 2025). It separates storage from compute, which is what makes branching and scale-to-zero possible.

**Connection pooling** — PgBouncer in **transaction mode**, in front of every compute:
- `max_client_conn = 10,000`
- `default_pool_size = 0.9 × max_connections` per (user, database) pair
- `max_prepared_statements = 1000`, `query_wait_timeout = 120s`
- 1 CU (4 GB) → 419 `max_connections` → 377 concurrent active transactions

| Use case | Connection |
|---|---|
| Serverless functions, web app, connection-per-request | **Pooled** (add `-pooler` to host) |
| Schema migrations, `pg_dump` | **Direct** |
| Logical replication | **Direct** (needs a persistent connection) |

Transaction mode means `SET`, `LISTEN`/`NOTIFY`, `WITH HOLD CURSOR`, SQL-level `PREPARE`, session advisory locks and temp tables that survive a commit **do not work**. Protocol-level prepared statements do.

**Client-side pool sizing on top of Neon's pooler:** keep it to `max: 1` or `max: 2` per container and let PgBouncer multiplex. A large client pool on top of the pooled endpoint causes containers to hoard idle connections. Our `lib/prisma.ts` uses `new PrismaPg({ connectionString })` with no explicit pool config — **[unverified]** what default `pg` pool size that implies; worth setting explicitly to `max: 2` if `DATABASE_URL` uses `-pooler`.

Docs: https://neon.com/docs/connect/connection-pooling · https://neon.com/docs/connect/choose-connection · https://neon.com/docs/guides/serverless-connection-pooling

**Branches and preview databases.** Branching is copy-on-write, ~1 second, and copies both data and schema (schema-only branching also supported). Each branch gets its own compute and its own connection pools. The Vercel-Managed integration can create a branch per Preview Deployment automatically.

**This is the killer feature for this app**: create a Neon branch + an Inngest test run + preview the quiz-generation pipeline against a full copy of production data, change whatever, delete the branch, pay only for divergence. The alternative is a seeded local database that drifts from prod within a week.

**Logical replication.** Supported; requires `wal_level=logical`, a **direct** (non-`-pooler`) connection, and admin credentials. Neon publishes a specific guide for the Inngest integration — note the documented limitation: *"The Neon integration currently only supports a single database connection per-account to the Inngest production environment."* Docs: https://www.inngest.com/docs/features/events-triggers/neon · https://neon.com/docs/guides/logical-replication-inngest

**Pricing / free tier** (https://neon.com/pricing, https://neon.com/docs/introduction/plans):

| | Free | Launch | Scale |
|---|---|---|---|
| Price | $0 | pay-as-you-go | pay-as-you-go |
| Projects | 100 | 100 | 1,000 |
| Compute | 100 CU-h/project | $0.106/CU-h | $0.222/CU-h |
| Autoscaling | ≤2 CU (8 GB) | ≤16 CU (64 GB) | ≤16 CU or fixed to 56 CU |
| Scale to zero | 5 min (cannot disable) | 5 min, can disable | configurable |
| **Postgres storage** | **1 GB/project, 20 GB account** | **$0.35/GB-mo** | $0.35/GB-mo |
| **Public network transfer** | **5 GB/project/mo** | **500 GB/project/mo, then $0.10/GB** | same |
| Instant restore history | 6 h (≤1 GB-mo) | 7 days, $0.20/GB-mo | 30 days, $0.20/GB-mo |
| Branches | 10/project | 10 + $1.50/branch-mo | 25 + $1.50/branch-mo |
| **Object Storage** | **5 GB included** | **$0.023/GB-mo** | $0.023/GB-mo |
| Functions | 10 active / 400 waiting CH, 1M invocations | $0.10/$0.025/CU-h, $0.60/M | $0.12/$0.03/CU-h, $0.60/M |

Free plan gotchas that will bite: **hitting the CU-hour or transfer limit suspends compute until the next billing period** (existing connections drop, new ones can't open). Exceeding 1 GB/project storage **fails writes** — it does not bill an overage. Ten branches per project; branch #11 fails.

### 4.2 Neon Object Storage — the headline answer to "yes, as of now"

**Yes.** Neon Object Storage went **GA in August 2026** (https://neon.com/blog/building-neon-object-storage). S3-compatible, built into the Neon project, and — uniquely — **buckets and objects branch with the database, copy-on-write.** Creating a branch does not duplicate your objects; you pay only for divergence.

- **Storage:** $0.023/GB-month on paid plans. **No per-operation charge** — no Class A/Class B, no per-request fee, ever.
- **Egress:** counted against the project's shared public network transfer allowance — **500 GB included per project/month on Launch/Scale, then $0.10/GB.** Free plan: 5 GB.
- **Free tier:** 5 GB of object storage per project, up to 100 projects. No per-request limits.
- **API:** real S3 wire protocol. `@aws-sdk/client-s3`, boto3, AWS CLI all work. Plus a first-party **Files SDK** (`files-sdk` npm, latest 3.1.0) with a `neon` adapter that reads `AWS_*` env vars automatically.
- **Auth:** Neon scoped credentials (`storage:read` / `storage:write`) — same credential system as Functions. Not IAM. Bucket visibility (`private` vs `public_read`) is set in Neon (Console / API / `neon.ts`), **not** via S3 ACL or bucket-policy calls.
- **Multipart:** `CreateMultipartUpload` / `UploadPart` / `CompleteMultipartUpload` / `AbortMultipartUpload` all supported; AWS SDK auto-switches above a configurable threshold.
- **Presigned URLs:** GET and PUT supported via SigV4 with `X-Amz-Expires`. **Browser form POST uploads supported.** This is the direct browser-upload path.
- **Max object size:** **5 GiB** today, single request or multipart. Paid plans are slated to move to S3 limits (5 TB, 5 GB single-request cap).
- **Function Triggers** — run a Neon Function when an object is uploaded.

**Limitations — read these before committing:**
- **Regions: only 4.** `aws-us-east-2` (Ohio), `aws-us-east-1` (N. Virginia), `aws-eu-central-1` (Frankfurt), `aws-ap-southeast-1` (Singapore). **No Africa region exists at all** — Neon Postgres has 8 regions and none is in Africa either. From Cameroon, Frankfurt is the closest at roughly 120–160 ms RTT. **[Unverified]** — our own measurement, not a published Neon figure. Cameroon fixed-broadband median latency is ~113 ms per Speedtest Global Index (June 2026), so Frankfurt is plausible but must be measured.
- **Rate limiting:** requests may be throttled with `503 SlowDown` under heavy use. Back off and retry.
- **No bucket notifications** (no SNS/SQS equivalent).
- **Path-style addressing only.** `forcePathStyle: true` in JS, `endpoint_url` in Python/CLI. No virtual-hosted-style.
- **SigV4 only** — Signature V2 is not supported.
- **Lifecycle rules and versioning are stored but not enforced.**
- **Buckets are scoped to a branch, not a region.** `GetBucketLocation` returns the region string but bucket selection is always branch-based.
- **`503 SlowDown` throttling is the risk** given our whole user base is on congested mobile networks. See the recommendation.

Docs: https://neon.com/docs/storage/overview · https://neon.com/docs/storage/get-started · https://neon.com/docs/storage/s3-compatibility · https://neon.com/docs/storage/objects

### 4.3 Next.js and Inngest compatibility

**From Next.js:** yes, trivially. It is plain S3 over HTTPS. Presigned PUT URLs let the browser upload **directly to storage**, bypassing the serverless function entirely — which is exactly what we need, since a 16 MB PDF must never transit a Vercel function. The server only issues the presigned URL and records the key in Postgres. `@aws-sdk/s3-request-presigner` plus `@aws-sdk/client-s3`.

```ts
new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
  requestChecksumCalculation: 'WHEN_REQUIRED',  // REQUIRED — see get-started docs
});
```

That last line is not optional: recent AWS SDK versions embed a checksum in presigned PUT URLs computed from an empty body, which rejects any upload with real content.

**From Inngest:** yes. Object storage is just an HTTPS endpoint with an S3 API — an Inngest function is an ordinary Node.js process. Use `File Triggers` for event-driven ingestion (upload → index into Postgres), or poll. Nothing Inngest-specific is required.

**Consistency and durability:** objects inherit the database's branch isolation — a preview branch sees a point-in-time copy of the files, consistent with the rows. `DeleteObject` is a **soft delete on the current branch**. Copy-on-write means writes are durable and branch divergence is billed accurately. **[Unverified]** — Neon does not publish a specific durability SLA for Object Storage in the docs reviewed; do not represent a number to students without confirming with Neon support.

### 4.4 The comparison that actually matters

Audience context: Cameroon. Data is expensive (~1.63 USD/GB is the figure the owner uses). Network conditions (Speedtest Global Index June 2026, MedUX Jan 2026): fixed broadband median download 34 Mbps / upload 11 Mbps; mobile upload aggregate ~14–16 Mbps on MTN/Orange per MedUX, but these are *means across a country with heavy 3G/4G mixing* — the long tail on congested 2G/3G cells is far worse, and latency is 120–200 ms. **[Unverified]** — I could not find a published per-tier breakdown of what fraction of Cameroonian mobile connections are 2G/3G vs 4G in 2026; MedUX measures the whole RAT spectrum together.

| | **Neon Object Storage** | **Vercel Blob** | **UploadThing (installed)** |
|---|---|---|---|
| Storage | **$0.023/GB-mo** | $0.023/GB-mo | $0 / $0.10 / $0.025 per GB tier; **$0.08/GB over 250 GB** |
| **Egress** | **500 GB free/project, then $0.10/GB** | **$0.05/GB** after 10 GB free (Hobby); on-demand meter is separate from Pro's 1 TB Fast Data Transfer; **$0 on Flat Rate CDN** | **Unlimited downloads, no bandwidth charge** |
| Requests | **$0 — none, ever** | $0.40/1M simple, **$5.00/1M advanced** | Unlimited |
| Free tier | 5 GB + 5 GB egress per project, ×100 projects | 1 GB + 10 GB transfer | **2 GB shared across all apps** |
| Branching | **Yes, copy-on-write with the DB** | No | No |
| Direct browser upload | **Presigned PUT + POST form** | Yes | Yes (its whole model) |
| Resumable / multipart | **Yes** (S3 multipart) | Yes | **Yes** — `createUpload()` with `pauseUpload`/`resumeUpload`/`abort`, plus a raw `Range`/`x-ut-range-start` resume path |
| Auth model | Neon scoped credentials | Token | UploadThing token + your `.middleware()` |
| Image transforms | **No** | **Yes** (`/api/blob/...` resize, `sharp`) | **Yes** (built in) |
| Server-side `UTApi` helpers | n/a | `head`/`delu` | **Yes — we already use `UTApi` in `lib/ai/index.ts`** |
| Max object | 5 GiB (→ S3 limits planned) | 5 TB | 32 MB audio / 16 MB pdf caps in our routes |
| Region from Cameroon | 4 regions, closest ≈ Frankfurt | Vercel PoPs | Unclear; UFS-hosted |
| Setup cost | ~30 lines of S3 client | One line | **Zero — already built** |

Sources: https://neon.com/docs/introduction/plans · https://vercel.com/docs/vercel-blob/usage-and-pricing · https://uploadthing.com/pricing · https://neon.com/guides/best-s3-compatible-object-storage-saas-and-ai-agents-2026

**On the XAF egress economics specifically.** Our audience pays roughly **1.63 USD/GB** for mobile data. That reframes everything: for *us*, egress at $0.05–$0.10/GB is not a rounding error, it is the difference between a margin and no margin. Run the numbers on 1,000 students each uploading one 8 MB photographed page per month and re-viewing it 20×/month:

- Volume: 1,000 × 8 MB × 21 = **168 GB/mo** stored and served.
- UploadThing (at the $10/100 GB tier, no egress charge): **$10/mo** = **5,857 XAF**.
- Vercel Blob: 8 GB storage ($0.18) + 168 GB transfer ($8.40) + request fees ≈ **$9–10/mo**. Roughly a wash at this volume.
- Neon Object Storage: 8 GB ($0.18) + **$0 egress inside the 500 GB allowance = $0.18/mo** = **≈ 105 XAF**.

Neon is ~100× cheaper on egress at our scale, purely because we will stay inside 500 GB/project/month for a very long time.

### 4.5 Recommendation

**Do not rip out UploadThing today. Add Neon Object Storage as the second path, and move bulk uploads to it.**

**Phase 1 — now (zero risk, big win): switch to `createUpload` resumable uploads.**
We already have `uploadthing@7.7.4`, which supports resumable uploads with `pauseUpload`/`resumeUpload`/`abort` and fine-grained `onUploadProgress`. On a congested Cameroonian mobile network, a dropped connection at 80% currently means starting over. This is a ~40-line change in `lib/uploadthing.ts` and the upload components, and it directly attacks the user's stated problem — "upload reliability and progress matter." Also check `awaitServerData`: it defaults to waiting for the server callback before responding, which adds round trips on a high-latency network. Setting `{ awaitServerData: false }` on routes where the client doesn't need callback data is a free latency win. Docs: https://docs.uploadthing.com/v7 · https://docs.uploadthing.com/api-reference/client

**Phase 2 — introduce Neon Object Storage for the bulk path (past papers, PDFs, multi-file note uploads).**
Rationale, in order of weight:
1. **Cost.** ~100× cheaper on egress at our volume, and egress is the number that matters at 1.63 USD/GB. Storage is a wash; requests are free vs Vercel Blob's $5/1M advanced.
2. **It branches with the database.** We can preview a whole ingestion pipeline — rows *and* files — on a copy of production, then throw it away. That is uniquely valuable for a system that ingests past papers and pastes them into the model.
3. **No new vendor relationship.** If we are adopting Neon for Postgres (the Inngest integration, branches, pooling), the storage comes with the same credential, same region, same console, same support.
4. **The AWS SDK is a known quantity.** Presigned PUT for direct browser upload, `PutObject`/`GetObject` for server-side. No new abstraction to learn.

**Known risks, stated plainly:**
- **No Africa region.** Frankfurt is the closest at maybe 120–160 ms. **Measure it from Cameroon before committing** — run a `curl -w '%{time_connect} %{time_starttransfer}'` against a presigned PUT from a real MTN/Orange SIM on several occasions, at different times of day. If Frankfurt RTT is bad enough that upload throughput collapses, this argument weakens considerably, because the whole reliability story depends on round trips.
- **`503 SlowDown` throttling is documented as possible.** Multipart + exponential backoff mitigates it; a plain single PUT does not. Build retry-in from day one.
- **No image transforms.** We currently get these from UploadThing/Vercel Blob. Replace with `sharp` (already installed at 0.34.5) behind a Next.js route handler, or keep avatar/profile images on the existing path.
- **5 GiB object cap** and **no lifecycle/versioning enforcement** — irrelevant for our sizes, but worth knowing.
- **No published durability SLA.** Don't quote one.

**Keep UploadThing for** avatars and profile images (2–4 MB, transform-heavy, low volume, already built) and as the fallback during Neon evaluation.

**Vercel Blob: no.** It is the weakest of the three on the only axis that matters here — it is the second-most expensive on egress and the only one that charges per request.

**Keep UploadThing's pricing model in mind:** the free tier's 2 GB is **shared across all your apps** and the $10 tier caps at 100 GB with no documented overage rate. At 1,000 students × 8 MB/month ≈ 8 GB/month, we are fine for now; at 10,000 students we are on the $25/250 GB tier. **[Unverified]** — the pricing page does not state what happens past 100 GB on the $10 tier.

---

## 5. Framework and ORM deep dive

### 5.1 Next.js 16 — what changed, and we are already on it

Installed **16.2.2**; current is **16.4.0**.

**`middleware.ts` → `proxy.ts`: confirmed.** The rename is real and shipped in 16.0. `proxy.ts` runs on the **Node.js runtime**, and this is not configurable — setting `runtime` in a proxy file **throws an error**. `middleware.ts` still works but is deprecated and will be removed. Named exports named `middleware` are deprecated; flags containing `middleware` were renamed (e.g. `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`). Codemod: `npx @next/codemod@canary middleware-to-proxy .`

**Our `proxy.ts` is already correct.** It exports `async function proxy(request: NextRequest)` — the new name. One thing to note: it composes `createMiddleware(aj, proxy)` from ArcJet with `export default`, which is the documented pattern for combining third-party middleware.

**What the Node runtime unlocks.** Full Node APIs in the request path: `node:crypto`, `fs`, real TCP/TLS clients, native `fetch` with keep-alive, no Edge-runtime polyfill ceiling. Practically it means: you can do a real database-backed session lookup (which we do — `auth.api.getSession`), use a proper Postgres driver, and skip the `node:` shim dance. The cost is that proxy runs in a region and can't be deployed to the Edge, so there's no sub-millisecond interception worldwide.

**Caching model.** Next 16 replaced implicit App Router caching with **Cache Components** (PPR + `use cache`). `experimental.dynamicIO` → `cacheComponents`; the `experimental.ppr` flag and the `export const experimental_ppr` segment export are both **removed**. `revalidateTag()` single-argument form is **deprecated** → use `revalidateTag(tag, profile)` or `updateTag(tag)`. `serverRuntimeConfig`/`serverRuntimeConfigPath` removed; `experimental.turbopack` moved to a top-level `turbopack` key. AMP support removed.

**Async request APIs.** `searchParams` and `params` are Promises in pages/layouts — we are already on this (`proxy.ts` awaits `headers()`, the auth pages use nuqs). `cookies()`/`headers()` are async.

**Deprecated — stop using:**
- `middleware.ts` filename and `middleware` named export ✅ already migrated
- `next/legacy/image` → `next/image`
- `images.domains` → `images.remotePatterns`
- `revalidateTag()` with one argument
- `next lint` — **removed**; `next build` no longer lints. We already use Biome directly ✅

**Removed:** AMP, `next lint`, `devIndicators` object form, `serverRuntimeConfig`, `experimental_ppr`.

**Also new and relevant:** the dev server exposes an MCP endpoint at `/_next/mcp` by default (`get_errors`, `get_logs`, `get_routes`, `get_compilation_issues`, `compile_route`, `get_server_action_by_id`). And `experimental.agentUpgrade` nags you to upgrade. `next upgrade --agent` exists in 16.4.

Docs: https://nextjs.org/docs/app/guides/upgrading/version-16 · https://nextjs.org/docs/app/api-reference/file-conventions/proxy · https://nextjs.org/blog/next-16 · https://nextjs.org/blog/next-16-4 · https://nextjs.org/docs/messages/middleware-to-proxy

### 5.2 Prisma 7 — we are on it, and configured correctly

Installed **7.7.0**; stable client latest is **7.10.0**. Prisma CLI latest is an `8.0.0-rc.22` — do not chase an RC for a production app.

**What changed in v7 (Nov 2025 release):**

| Change | Our state |
|---|---|
| **Rust-free ESM client is the default** — `provider = "prisma-client"` | ✅ `prisma/schema.prisma:5` |
| `output` is now **required**; client no longer generated into `node_modules` | ✅ `output = "../lib/generated/prisma"` |
| **Driver adapter required** for every database; `new PrismaClient()` without one errors | ✅ `lib/prisma.ts` uses `new PrismaPg({ connectionString })` |
| **`datasource.url` moved out of the schema** into `prisma.config.ts` | ✅ `prisma/schema.prisma` has `datasource db { provider = "postgresql" }` with no `url`; `prisma.config.ts` carries `datasource.url` |
| `directUrl` removed; move it into the config's `url` | ✅ not present |
| Prisma CLI **no longer auto-loads `.env`** — you must `import "dotenv/config"` | ✅ `prisma.config.ts` line 1 does exactly this. (`lib/prisma.ts` also imports it.) |
| `prisma` key in `package.json` removed; `seed` lives in config | ⚠️ **`prisma.config.ts` has no `migrations.seed`.** `package.json` still has `"db:seed": "npx tsx prisma/seed.ts"`, which works, but Prisma's own `prisma db seed` would not. Minor inconsistency; worth aligning. |
| `new PrismaClient({ datasourceUrl })` / `{ datasources }` removed | ✅ not used |
| Removed engines: LibraryEngine, BinaryEngine, DataProxyEngine, ReactNativeEngine | ✅ |
| `--schema`/`--url` flags removed from `prisma db execute` | ✅ |
| **MongoDB unsupported in v7** | ✅ N/A, we're Postgres |

**Genuine gotchas to watch:**
1. **Driver-adapter timeout semantics changed.** The `pg` driver has **no connection timeout by default (`0`)**; Prisma v6 used 5 seconds. If you see hangs after upgrading, that is why.
2. **Double-pooling.** If `DATABASE_URL` uses `-pooler` (Neon's PgBouncer) *and* the `pg` pool is large, containers hoard idle connections. Set `max: 1–2`.
3. `$use` middleware is gone → extensions.

**Should we stay on Prisma?** **Yes.** Arguments:
- We are on 7.7 and configured correctly; there is nothing to migrate.
- The alternative that gets named is **Drizzle**, and it is a genuine downgrade for this schema: ~40 models with heavy relations, `enum`s, self-relations (`ExamProfile` self-ref, `Post`/`Comment` nesting), and `onDelete` policies. Prisma's relation engine and Studio are worth real money at that size.
- Prisma 7 already gives the two things people cite Drizzle for: no Rust binary, ~90% smaller bundles, up to 3× faster queries.
- The real Prisma pain points for us are N+1s and the missing query engine cache — both solved with `include`/Dataloader, not by rewriting the ORM.
- Switching ORMs is a multi-week change with zero user-visible benefit. **Do not do it as part of the AI routing work.**

Docs: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 · https://www.prisma.io/changelog/2025-11-19 · https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction · https://www.prisma.io/blog/prisma-7-ama-clearing-up-the-why-behind-the-changes · https://github.com/prisma/prisma/releases/tag/7.0.0

### 5.3 nuqs — installed, barely used, and that is the problem

**Actual current usage: 4 files import nuqs.**
- `app/layout.tsx` — `<NuqsAdapter>` from `nuqs/adapters/next/app`, wrapping the tree ✅
- `nuqs/index.ts` — one flat parser object with 11 keys
- `app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`, `verify-email/page.tsx` — `useQueryStates(searchParamsSchema)` for `callbackUrl`, `ref`, `token`, `error`

**Every other screen in the app uses ad-hoc `useSearchParams` + `useRouter().push/replace` or nothing at all.** Meanwhile `nuqs/index.ts` already declares `page`, `limit`, `archived`, `search`, `tab` — parsers that are clearly *meant* for leaderboards, notes, admin lists and post-archive screens. They are almost certainly unused. **[Unverified]** — I did not audit every screen.

nuqs 2.x is correct for Next 16 + React 19: async `searchParams`, `NuqsAdapter` from `nuqs/adapters/next/app`, and `nuqs/server` for Server Components. Latest is 2.10.2 vs our 2.8.9 — a safe minor bump.

Docs: https://nuqs.dev/docs/server-side · https://nuqs.dev/docs/adapters · https://nuqs.dev/llms.txt

**Project conventions — adopt these so every screen handles URL state identically:**

1. **One parser module per route, colocated.** `app/(dashboard)/leaderboard/search-params.ts` exports the parser object. Never define parsers inline in a component. The same file is imported by the client toolbar, the Server Component page, and any share-link builder.
2. **Server Components read via `createSearchParamsCache` from `nuqs/server`; client components read via `useQueryState(s)` from `nuqs`.** Never import from `nuqs` in a Server Component — it carries `"use client"`. Never duplicate the schema. One file, both imports, TypeScript catches drift.
3. **Every parser has an explicit `.withDefault()`.** No defaults → SSR renders `null`, client renders the URL value → hydration mismatch. This is the single most common nuqs bug.
4. **Name URL keys for humans, state variables for code.** Use the `urlKeys` option to map `subjectId` → `subject`. Short URLs matter on mobile data.
5. **`shallow: true` (default) for pure-UI state** (open tab, open modal, step). **`shallow: false` for anything that changes what the server fetches** (filters, pagination, sort) — set it via `.withOptions({ shallow: false })` on the parser so it can't be forgotten at a call site.
6. **Never `shallow: false` without `throttleMs`.** An unthrottled `shallow: false` slider issues hundreds of RSC requests per second and evicts the Data Cache. Rule: `throttleMs: 300–500` for anything that fires continuously; commit on `pointerup` for sliders.
7. **`history: 'push'` only for significant, undoable actions** (applying a filter, opening a modal). `'replace'` (default) for typing, pagination and anything that would flood the back button.
8. **Search-as-you-type is two layers:** local `useState` for 60fps input; a debounced effect writing to nuqs with `history: 'replace'` and `shallow: false` to trigger the server refetch. Wrap the dependent region in `<Suspense>` with a skeleton.
9. **One-time parsing outside pages** (route handlers, server actions) uses `createLoader` from `nuqs/server`. Loaders don't validate — pass the result through Zod when the value is user-supplied.
10. **Cross-cutting keys (`callbackUrl`, `token`, `error`, `ref`, `tab`) stay in the shared `nuqs/index.ts`; route-specific keys go in the route's own module.** When adding a key, first grep for whether a raw `searchParams.get()` already reads it — replace it, don't add a second path.

### 5.4 Biome vs ESLint + Prettier

**Installed: `@biomejs/biome@2.2.0` (pinned). Latest: 2.5.15. `pnpm lint` = `biome check`. `next build` does not lint.** The setup is already correct and idiomatic — `biome.json` enables VCS integration, `recommended` rules, and the `next` + `react` domains.

**Stay on Biome. Do not switch.** Reasons, in order:

1. **Next.js 16 removed `next lint` entirely.** The official migration path is "use Biome or ESLint directly." We already took the Biome branch. Switching to ESLint means hand-maintaining a flat config, the plugin set, and CI wiring — for zero user-visible benefit.
2. **Speed is structural, not a benchmark artifact.** One Rust binary, CPU-parallel, no Node startup, no plugin resolution chain. Typical TypeScript monorepos see 8–15× over ESLint + Prettier. It changes whether people actually run lint.
3. **Biome auto-detects your stack from `package.json`.** Next.js in deps → Next rules on. We already have `domains: { next: "recommended", react: "recommended" }` set explicitly.
4. **The honest gaps are ones we do not care about:** no Markdown formatting yet (on the 2026 roadmap), `react-hooks/exhaustive-deps` is a simpler implementation, Vue/Svelte/Astro support is experimental, no `eslint-plugin-tailwindcss` equivalent, and GritQL custom rules are weaker than hand-written ESLint plugins for anything needing type-flow analysis. **None of these bind us.** We have zero internal ESLint plugins, and Tailwind class sorting is a matter of taste we have not adopted.
5. **Only real loss:** no `eslint-plugin-testing-library`. If we grow a substantial Vitest + Testing Library suite and want best-practice assertions enforced, that is the one rule to reintroduce — and the pragmatic answer is a second, slower CI step with ESLint scoped to that rule only.

**Two concrete improvements, no tool change:**
- **Bump 2.2.0 → 2.5.15.** We are three minors behind and miss type-aware linting improvements (`noFloatingPromises`, `noMisusedPromises`) plus correct CSS-in-JS formatting from 2.4.
- **Add a pre-commit hook.** `biome check --apply --staged` via lint-staged, plus a `biome ci .` step in CI. There is currently no pre-commit hook, which is why formatting drift is likely.

Docs: https://biomejs.dev/guides/migrate-eslint-prettier/ · third-party reviews used: toolchew.com Biome 2 review, devtoolreviews.com 2026 comparison, abrarqasim.com (labelled as such)

---

## 6. What to install or learn

Conservative. Each item earns its place or is not listed.

### Install

| What | Command | What it is for |
|---|---|---|
| **`@openrouter/ai-sdk-provider`** | `pnpm add @openrouter/ai-sdk-provider@2.9.1` | The actual deliverable. `@2.9.1` targets `ai@^6`; bump to `3.1.0` in the same commit as the v7 SDK upgrade. This is the only **required** install. |
| **`next-devtools-mcp`** | `npx add-mcp next-devtools-mcp@latest` | Next 16 ships an MCP endpoint at `/_next/mcp` by default. Gives an agent live `get_errors`, `get_logs`, `get_routes`, `get_compilation_issues`, `compile_route`, and `get_server_action_by_id` from the running dev server — plus a gateway to the version-matched docs already bundled in `node_modules/next/dist/docs/`. Zero install cost, genuinely useful for the AI work. https://nextjs.org/docs/app/guides/mcp |
| **`@neon/database` CLI / Neon MCP skills** | `neon skills -s neon -s neon-object-storage` or `npx skills add neondatabase/agent-skills -s neon -s neon-object-storage` | Only if/when we evaluate Neon Object Storage. Gives the agent accurate Neon + storage setup rather than guessing at `neon.ts`, credentials, and the `requestChecksumCalculation: 'WHEN_REQUIRED'` gotcha. |
| **OpenRouter MCP server** | `https://mcp.openrouter.ai/mcp` (remote, OAuth) | Lets an agent query the live model catalogue, per-model pricing, endpoint lists, your credit balance, and Artificial Analysis benchmark scores without a browser. The `list-models` / `get-model` / `list-benchmarks` tools are exactly what §3 needed — and will need refreshing as models turn over. Remote, nothing installed locally; the issued key is 7-day, $10-capped by default. https://openrouter.ai/docs/guides/overview/mcp-server |
| **Biome bump + lint-staged** | `pnpm add -D @biomejs/biome@2.5.15 lint-staged` | See §5.4. |

### Skills worth installing

| Skill | Command | For |
|---|---|---|
| **AI SDK v6→v7 migration** | `npx skills add vercel/ai --skill migrate-ai-sdk-v6-to-v7` | Vercel's own official migration skill, referenced in the changelog. Install it when we do the v7 bump — it encodes the codemods plus the judgement calls (ESM, `instructions`, `runtimeContext`/`toolsContext`, approval placement) that codemods cannot decide. |

### Documentation to bookmark

| Resource | URL | Why |
|---|---|---|
| **AI SDK 7 migration guide** | https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 | The single most important page for the v7 bump. |
| **AI SDK `llms.txt`** | https://ai-sdk.dev/docs/llms.txt | Complete docs index for agents. |
| **OpenRouter docs `llms.txt`** | https://openrouter.ai/docs/llms.txt | Same idea; the whole OpenRouter docs surface in one index. |
| **Next.js `llms.txt`** | https://nextjs.org/docs/llms.txt | Full Next.js docs index. |
| **Next.js bundled docs** | `node_modules/next/dist/docs/` | Version-exact, offline, no network. Already on disk — `AGENTS.md` correctly points agents here. Prefer it over the website. |
| **OpenRouter models API** | `https://openrouter.ai/api/v1/models` | Live pricing, context, modalities, `supported_parameters`, and the per-model `reasoning` capability object. This is the source of truth for §3's table — **re-pull it before implementing**, as this catalogue churns weekly. No key needed. |
| **Neon plans + object storage** | https://neon.com/docs/introduction/plans · https://neon.com/docs/storage/overview | Pricing and S3-compat limits. |
| **nuqs server-side** | https://nuqs.dev/docs/server-side | The `createSearchParamsCache` pattern for §5.3. |
| **Cameroon network data** | https://www.speedtest.net/global-index/cameroon · https://observatory.medux.com/africa/cameroon/ | Re-measure before making any Cameroon-region storage or latency decision. |

### Explicitly **not** recommended

- **Neon AI Gateway** — ruled out by the owner (no free credits). Also, its own docs note the AI Gateway requires a paid plan and is limited to 4 regions.
- **Cloudflare R2** — genuinely the cheapest on egress ($0 egress, $0.015/GB), and worth naming. But it adds a third vendor relationship when Neon already offers S3-compatible storage at a price we won't approach for a long time. Revisit if egress ever exceeds 500 GB/project/month.
- **Drizzle** — see §5.2. Prisma 7 is correct and sufficient.
- **OpenRouter Fusion** — 4–5× cost, 2–3× latency, and OpenRouter's own docs say it hurts evals. Wrong primitive for an availability problem.
- **OpenRouter Business plan** — 8% fee for identical token prices vs Standard's 5.5%. No justification at our volume.

---

## Appendix A — Cost summary, the numbers that matter

Rate: 1 USD = 585.53 XAF (12 Oct 2026). Prices live from the OpenRouter models API.

**Per student, per month (all XAF):**

| Scenario | Estimated cost |
|---|---|
| Heavy user (600 msgs), all on the cheap default `z-ai/glm-5.3-flash` + 10 docs + 6 quizzes + 12 essays + 4 papers | **≈ 190 XAF** |
| Same, + 5.5% OpenRouter credit fee | **≈ 200 XAF** |
| Light user (200 msgs) on the cheapest model `qwen/qwen3.7-flash`, chat only | **≈ 10 XAF** |
| Light user, chat on `anthropic/claude-haiku-5.5` | **≈ 39 XAF** (≈ 39 with caching on) |
| Everything escalated to `anthropic/claude-sonnet-5.5` | **≈ 2,600 XAF** |
| Everything escalated to `anthropic/claude-opus-5.5` | **≈ 4,900 XAF** |

**The single highest-leverage lever: enable prompt caching on the chat tutor with a stable system-prompt prefix. 3–4× reduction on the largest recurring line item.**

**Storage, at 1,000 students × 8 MB/mo, 20 re-views each (168 GB/mo):**

| Provider | Monthly | XAF |
|---|---|---|
| Neon Object Storage (8 GB + 0 GB egress charged) | $0.18 | **≈ 105** |
| UploadThing ($10 / 100 GB tier, no egress) | $10.00 | ≈ 5,857 |
| Vercel Blob (storage + $0.05/GB transfer + request fees) | ≈ $9–10 | ≈ 5,300–5,857 |

## Appendix B — Every URL cited

**Vercel AI SDK**
- https://vercel.com/changelog/ai-sdk-7
- https://vercel.com/blog/ai-sdk-7
- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- https://ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream
- https://ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response
- https://ai-sdk.dev/docs/reference/ai-sdk-core/pipe-agent-ui-stream-to-response
- https://ai-sdk.dev/docs/agents/overview
- https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- https://ai-sdk.dev/docs/reference/ai-sdk-core/output
- https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message
- https://ai-sdk.dev/docs/ai-sdk-core/middleware
- https://ai-sdk.dev/docs/reference/ai-sdk-core/wrap-language-model
- https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata
- https://ai-sdk.dev/providers/community-providers/openrouter
- https://github.com/vercel/ai/releases/tag/ai@7.0.0
- https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md
- https://github.com/vercel/ai/pull/10754 (generateObject deprecation)
- https://github.com/vercel/ai/pull/12707 (generateObject → Output mapping)
- https://github.com/vercel/ai/blob/main/packages/ai/src/middleware/wrap-language-model.ts
- https://github.com/vercel/ai/issues/14011 (v7 rationale)

**OpenRouter**
- https://openrouter.ai/docs/guides/community/vercel-ai-sdk
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/guides/routing/model-fallbacks
- https://openrouter.ai/docs/guides/routing/routers/fusion-router
- https://openrouter.ai/docs/guides/features/plugins/fusion
- https://openrouter.ai/docs/guides/features/server-tools/fusion
- https://openrouter.ai/docs/guides/best-practices/prompt-caching
- https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
- https://openrouter.ai/docs/api_reference/limits
- https://openrouter.ai/docs/faq
- https://openrouter.ai/docs/guides/overview/mcp-server
- https://openrouter.ai/pricing
- https://openrouter.ai/blog/announcements/simplifying-our-platform-fee/
- https://openrouter.ai/blog/insights/fusion-explainer/
- https://openrouter.ai/blog/tutorials/free-llm-apis-compared/
- https://github.com/OpenRouterTeam/ai-sdk-provider
- https://www.npmjs.com/package/@openrouter/ai-sdk-provider
- `https://openrouter.ai/api/v1/models` (live data, fetched 12 Oct 2026)

**Neon**
- https://neon.com/pricing
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/introduction/regions
- https://neon.com/docs/connect/connection-pooling
- https://neon.com/docs/connect/choose-connection
- https://neon.com/docs/guides/serverless-connection-pooling
- https://neon.com/docs/storage/overview
- https://neon.com/docs/storage/get-started
- https://neon.com/docs/storage/s3-compatibility
- https://neon.com/docs/storage/objects
- https://neon.com/docs/reference/api/regions
- https://neon.com/docs/reference/api/storage
- https://neon.com/blog/building-neon-object-storage
- https://neon.com/blog/neon-free-plan-1-gb-per-project
- https://neon.com/docs/changelog/2026-10-02
- https://neon.com/guides/best-s3-compatible-object-storage-saas-and-ai-agents-2026
- https://neon.com/faqs/best-backend-file-uploads-user-content
- https://neon.com/faqs/free-plan-limits-and-quotas
- https://neon.com/faqs/managed-postgres-services-serverless-connections
- https://neon.com/faqs/managed-postgres-databases-free-tier
- https://neon.com/docs/guides/logical-replication-inngest

**Next.js**
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/messages/middleware-to-proxy
- https://nextjs.org/blog/next-16
- https://nextjs.org/blog/next-16-4
- https://nextjs.org/docs/app/guides/mcp
- https://github.com/vercel/next-devtools-mcp
- https://www.npmjs.com/package/next-devtools-mcp

**Prisma**
- https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction
- https://www.prisma.io/changelog/2025-11-19
- https://www.prisma.io/blog/prisma-7-ama-clearing-up-the-why-behind-the-changes
- https://github.com/prisma/prisma/releases/tag/7.0.0
- https://www.prisma.io/docs/ai/prompts/prisma-7

**nuqs**
- https://nuqs.dev/docs/server-side
- https://nuqs.dev/docs/adapters

**Biome**
- https://biomejs.dev/guides/migrate-eslint-prettier/

**Storage vendors**
- https://uploadthing.com/pricing
- https://docs.uploadthing.com/v7
- https://docs.uploadthing.com/api-reference/client
- https://docs.uploadthing.com/uploading-files
- https://docs.uploadthing.com/blog/usage-based
- https://vercel.com/docs/vercel-blob/usage-and-pricing

**Inngest**
- https://www.inngest.com/docs/features/events-triggers/neon

**Network data (Cameroon)**
- https://www.speedtest.net/global-index/cameroon
- https://observatory.medux.com/africa/cameroon/cm-january-2026/
- https://www.speedgeo.net/statistics/cameroon

**Third-party, used only where official docs were silent or comparative (labelled in text)**
- https://toolchew.com/en/review-biome-2/
- https://www.devtoolreviews.com/reviews/eslint-vs-biome-vs-prettier-2026-comparison
- https://abrarqasim.com/blog/biome-vs-eslint-2026-the-linter-switch-i-kept-putting-off/
- https://flexprice.io/pricing-index/openrouter
- https://howmakersbuild.com/tools/uploadthing/pricing
- https://temps.sh/blog/vercel-pricing-complete-guide-2026