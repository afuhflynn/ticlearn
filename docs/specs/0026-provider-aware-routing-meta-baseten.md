# 0026. Provider aware routing for Meta and Baseten

**Date**: 2026-10-27
**Status**: In Progress

## Summary

This decision adds a Muse provider alongside the existing OpenRouter chain so the app can route reasoning calls to Meta Model API and visual analysis calls to Baseten directly. The OpenRouter chain stays untouched as fallback. It is hackathon feature 49, built as an enhancement to the AI orchestration in lib/ai.

## Context

Every AI task today routes through OpenRouter, a single gateway that forwards to many model labs, with an ordered model chain, a breaker that skips dead models, and per student cost tracking in XAF, Central African franc, the money you bill in. The hackathon wants to use Muse Spark 1.3 through Meta Model API for reasoning and muse spark open 1026 through Baseten for visual course page analysis. The OpenRouter chain must keep working exactly as it does today, and no existing call may be affected. The new provider must be added without changing the database schema.

## Requirements

**User stories**:
- As a student, I want my reasoning questions answered by Muse Spark 1.3 through Meta Model API so that answers come from the hackathon model.
- As a student, I want course page diagrams and charts analysed by muse spark open 1026 through Baseten only when visual understanding is useful.
- As a developer, I want the OpenRouter chain to keep working exactly as before, with no existing call affected.

**Acceptance criteria**:
- **AC-1**: The muse() provider exists and lazily initialises.
- **AC-2**: chainMuse() constructs Meta and Baseten clients.
- **AC-3**: muse-spark-1.3 calls route to Meta Model API using MUSE_API_KEY.
- **AC-4**: muse-spark-open-1026 calls route to Baseten at inference.baseten.co/v1 using BAASETEN_API_KEY.
- **AC-5**: No existing OpenRouter call is affected; the OpenRouter chain stays untouched as fallback.
- **AC-6**: MUSE_API_KEY and BAASETEN_API_KEY are documented in .env.example.
- **AC-7**: Baseten is used only when visual understanding is useful, not every page automatically.
- **AC-8**: When Meta or Baseten fails, the call falls through to the OpenRouter chain.
- **AC-9**: Routing is decided at task level in lib/ai, transparent to callers.

## Options considered

### Option 1: AI SDK compatible provider (recommended)

Reuse the OpenRouter pattern: construct Vercel AI SDK provider instances pointed at Meta Model API and Baseten, using the same call shape as OpenRouter. Both providers expose OpenAI compatible chat completions, so the OpenAI compatible provider works for both.

**Pros**:
- Same code shape as the existing OpenRouter chain, minimal new concepts to operate.
- Both Meta and Baseten are OpenAI compatible, so one provider type serves both.

**Cons**:
- Need to verify the exact Meta Model API base URL and model ID against live docs before the hackathon demo.

### Option 2: Raw fetch client

Use Node fetch directly against each provider's REST API, with a different code shape from OpenRouter.

**Pros**:
- Full control over request shape and headers, no AI SDK abstraction.

**Cons**:
- Different code shape from the existing chain, more code to maintain and review.
- Loses the AI SDK's streaming and tool call handling that the rest of the app relies on.

### Option 3: Add models to the existing OpenRouter chain

Add muse-spark-1.3 and muse-spark-open-1026 as additional models in the existing OpenRouter chain and route by task through the single provider.

**Pros**:
- No new provider code, no new server keys, no parallel fallback path, no new usage wiring.
- Reuses the breaker, usage tracking, and XAF math already in spec 0003.
- Roughly half the surface area of Option 1.

**Cons**:
- Conflicts with the hackathon scope, which asks for direct routing to Meta Model API and Baseten at inference.baseten.co/v1 with OpenRouter kept as fallback.
- OpenRouter may not carry Baseten deployments or the Meta model, in which case direct routing is still needed for Baseten.
- Less control over per-provider behavior (streaming, tool calls, auth scheme).

## Decision

**Chosen option**: Option 1: AI SDK compatible provider.

You add a Muse provider in lib/ai/instances.ts and lib/ai/chain.ts using the Vercel AI SDK compatible provider pattern, pointed at Meta Model API for muse-spark-1.3 and at Baseten Model APIs for muse-spark-open-1026. The OpenRouter chain stays untouched as fallback. Build task 8 evaluates Option 3 (adding the models to the existing OpenRouter chain) and may switch to it if it satisfies the scope's direct routing goals with lower surface area.

## Rationale

The AI SDK compatible provider was chosen because both Meta Model API and Baseten Model APIs expose OpenAI compatible chat completions, so the same provider type that already serves OpenRouter serves both new providers with no new abstraction. This keeps one code shape across the chain, which matters for a small team operating the hackathon build on a tight deadline. The raw fetch client was rejected because it would diverge from the existing chain and lose the AI SDK's streaming and tool call handling that chat and quiz generation already rely on. Routing stays at task level in lib/ai so callers do not need to know which provider serves which model, and Baseten is limited to visual understanding so student credits are not spent on pages that do not need it.

## Feature design

**Data model sketch**:
No new tables or columns. Reuse AiModelHealth and AiUsageEvent from spec 0003, the AI model chain spec. Add model IDs muse-spark-1.3 (Meta) and muse-spark-open-1026 (Baseten) as rows in AiModelHealth. Meta and Baseten served calls write usage rows to AiUsageEvent, same as OpenRouter calls. One row per modelId in AiModelHealth. Existing indexes on AiUsageEvent on userId plus createdAt and on modelId plus createdAt cover the new models. No migration needed.

Task to provider mapping lives in lib/ai/registry.ts: each task carries a provider field (openrouter, meta, or baseten, default openrouter so existing tasks are untouched). chainMuse() reads taskConfig.provider and constructs the matching client. New visual and reasoning task names route to Baseten and Meta respectively; existing quiz and chat tasks stay on openrouter.

**State transitions**: Omitted. No state machine beyond the existing breaker in spec 0003.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| muse() | internal call | model ID, messages, task | provider instance | server side | missing key |
| chainMuse() | internal call | task type | routed completion | server side | provider failure |
| No new HTTP routes | | | | | |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| muse() | provider instance | MUSE_API_KEY env var plus Meta Model API base URL |
| chainMuse() | routed completion | task type decides Meta versus Baseten |
| serve Meta call | model ID, tokens, cost | response.model plus usage object from Meta Model API |
| serve Baseten call | model ID, tokens, cost | response.model plus usage object from Baseten Model APIs |
| fallback | OpenRouter completion | existing OpenRouter chain when Meta or Baseten fails |

**Key invariants**:
1. One chain definition in code owns order, prompt files hold logical task only and never pin a model.
2. No existing OpenRouter call is affected.
3. Baseten is used only when visual understanding is useful, not every page automatically.
4. Meta and Baseten keys live server side only and never reach client code.
5. Every Meta and Baseten served call writes one usage row, attributing the modelId of the model that actually served (the serving OpenRouter model on fallback, not the attempted Meta or Baseten model).
6. Failure means a non-2xx response, a transport error, or an empty or invalid body with no text token. The breaker catches transport failures; response validation guards against silent success with an empty body.
7. Each Meta or Baseten leg has its own per-leg timeout of about 8 seconds, shorter than the existing 10 second call budget, so a slow provider cannot consume the whole budget before fallthrough.
8. A missing MUSE_API_KEY or BAASETEN_API_KEY at runtime degrades to the OpenRouter fallback through a catchable lazy-init error; it never crashes the caller.
9. Meta calls carry a reasoning_effort cap so thinking token output cannot blow out cost.

**Security model**:
1. MUSE_API_KEY and BAASETEN_API_KEY are server side env vars, never in client code.
2. No new API routes, so no new route level auth to add.
3. Routing is internal to lib/ai, consumed by existing authenticated chat and job routes.

**Configuration required**:
- MUSE_API_KEY: server key for Meta Model API, documented in .env.example.
- MUSE_BASE_URL: Meta Model API base URL for the OpenAI compatible provider, documented in .env.example, defaults to https://api.meta.ai/v1.
- BAASETEN_API_KEY: server key for Baseten Model APIs, documented in .env.example.
- BAASETEN_BASE_URL: Baseten Model APIs base URL, documented in .env.example, defaults to inference.baseten.co/v1.
- MUSE_REASONING_EFFORT: caps thinking token output for Meta calls, default low, documented in .env.example.
- MUSE_COST_PER_CALL_XAF: flat per-call XAF rate for Meta and Baseten usage math until live pricing is confirmed, read from lib/ai/pricing.ts.

**Critical test scenarios**:
- Happy path: a reasoning task routes through Meta Model API and writes a usage row, verifies AC-3, AC-4, AC-9.
- Failure case: Meta is down, call falls through to OpenRouter chain, verifies AC-8.
- Auth or permission: no client code can read MUSE_API_KEY or BAASETEN_API_KEY, verifies AC-4 server side only.

## Build plan

1. Add MUSE_API_KEY, MUSE_BASE_URL, BAASETEN_API_KEY, BAASETEN_BASE_URL, MUSE_REASONING_EFFORT, MUSE_COST_PER_CALL_XAF to .env.example with provider signup notes, satisfies AC-6.
2. Add muse() provider in lib/ai/instances.ts, lazily initialised, pointed at Meta Model API with MUSE_BASE_URL, degrades to fallback on missing key, satisfies AC-1, AC-3.
3. Add chainMuse() in lib/ai/chain.ts that constructs Meta and Baseten clients and routes by task using the provider field in registry.ts, satisfies AC-2, AC-4, AC-7, AC-9.
4. Add usage writing for Meta and Baseten served calls to AiUsageEvent with XAF math from MUSE_COST_PER_CALL_XAF, attributing the serving modelId, satisfies AC-4, AC-8.
5. Wire fallback to OpenRouter chain when Meta or Baseten fails, with per-leg timeout of about 8 seconds and failure defined as non-2xx, transport error, or empty body, satisfies AC-5, AC-8.
6. Add tests for fallback, usage attribution, missing key degradation, and per-leg timeout, satisfies AC-1, AC-2, AC-8.
7. Verify streaming and tool calls work through Meta and Baseten via the OpenAI compatible provider; route streaming or tool-calling tasks to OpenRouter if not supported, satisfies AC-3, AC-4.
8. Evaluate the simpler alternative of adding muse-spark-1.3 and muse-spark-open-1026 to the existing OpenRouter chain instead of direct provider routing, and pick the lower surface-area option before the hackathon demo, satisfies AC-3, AC-4, AC-5.

## Consequences

**Positive**:
- Study stays up when Meta or Baseten is down, because the OpenRouter chain is fallback.
- Reasoning and visual analysis use the best model for each task without changing existing behavior.
- No schema change, so no migration or database risk.

**Negative or tradeoffs**:
- Worst case latency grows when fallback runs, some requests take the full budget.
- Two new server keys to operate and rotate.
- Meta is a reasoning model, so thinking tokens count as output and cost more than a plain text model.

**Neutral**:
- The Meta Model API base URL should be verified against live docs before the hackathon demo.

## Follow-up

- [ ] Verify the Meta Model API base URL and model ID against https://dev.meta.ai/docs/cookbook/quickstart-chat-completions before the hackathon demo.
- [ ] Consider whether Baseten visual analysis costs should be covered by Baseten credits rather than student credits for feature 50, visual course page analysis.
