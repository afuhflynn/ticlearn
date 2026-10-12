# 0003. AI model chain rationale

## Context

Every AI task today points at one Gemini model through one provider import. When that model or lab has an outage, quiz generation plus exam generation plus chat plus marking all fail together in the same way. There is no ordered fallback, no shared memory of which model just died, and no shared deadline that covers the whole retry walk.

Spend is also opaque. Calls do not record which model served, how many tokens were used, or what that cost in XAF. Pricing and free tier choices are made without facts. Paper3 marking lives on its own path outside the main orchestrator, so any fix to resilience must be built twice.

The scope asks for a chain of at least six models across frontier labs and open weight labs through OpenRouter, with a breaker so a dead model stays skipped, a per request deadline, and per student cost in XAF. The build must keep full use of the Vercel AI SDK and keep the current snappy feel where possible.

## Options considered

### Option 1: Stay on direct Gemini with retry

Keep the current provider import and add retry on the same model with the same 10 second budget.

**Pros**:

1. Smallest change, no new key and no new path to operate.

**Cons**:

1. A lab outage still takes down every feature at once.
2. No lab spread, so correlated faults remain.
3. Cost in XAF stays unmeasured.

### Option 2: Ordered fallback chain with shared breaker and ledger

Point the AI SDK at OpenRouter, walk an ordered list of six model IDs, guard with a shared Postgres breaker, enforce one shared deadline, and write one usage row per served call with XAF math.

**Pros**:

1. Deterministic and cheap, you pay for one serving model per request.
2. Shared breaker state works across instances, good for serverless.
3. Usage rows give per student per day XAF plus admin split by model and task.
4. Full AI SDK use stays, code shape changes little at call sites.

**Cons**:

1. Chain order needs curation as prices and quality shift.
2. One extra breaker read per call plus one usage write per call.
3. Static price table can drift from list prices.

### Option 3: Fusion for every hard call

Use OpenRouter Fusion (parallel consensus where several models answer at once and a judge merges) as the default for quality.

**Pros**:

1. Best answer quality on hard research through consensus plus noted blind spots.

**Cons**:

1. Cost runs many times a single call, too dear for everyday tutoring.
2. Latency runs into minutes, wrong for chat and exams.
3. Needs web search and fetch forced on, wrong shape for grading and quiz JSON.

### Option 4: Client side cascade with in memory breaker

Keep provider calls direct from each caller and hold breaker state in process memory.

**Pros**:

1. No new table and no migration.

**Cons**:

1. Each instance learns outages alone, students see flaky behavior by route.
2. Restarts wipe memory, dead models get retried at once.
3. Paper3 jobs and web routes diverge again.

## Rationale

Option 2 fits the forces. The core need is uptime inside a tight budget plus measurable spend, not top end quality at any price. An ordered fallback gives uptime for the price of one call, while Fusion gives quality for the price of many calls and minutes of wait. That is why Fusion stays as a gated escalation for rare deep research only, never the default.

Postgres is chosen for breaker state because the app runs on serverless style instances with cold starts and an in memory map would diverge per instance. A new usage table is chosen over extending the credit log because tokens plus model plus latency deserve their own shape, while the credit log stays about balances. Transport faults alone trip the breaker because validation faults signal a prompt or schema flaw, parking a model for a prompt flaw would hide the real defect.

## Evidence notes

**Chain shape for first version**:

```
google/gemini-2.5-flash
openai/gpt-5-mini
anthropic/claude-haiku-4.5
deepseek/deepseek-v4.1-flash
meta-llama/llama-3.3-70b-instruct
mistralai/mistral-medium-3.1
```

1. Order starts with the current model for continuity, then spreads across labs.
2. Prefer cheap flash plus mini plus haiku variants up front for everyday load, keep larger kin as later fallback.
3. Verify tool support per ID through the OpenRouter model list before lock in, grading and quiz JSON need structured output.
4. Keep IDs as plain strings in chain order config so rotation needs no code change.

**OpenRouter with AI SDK**:

```
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
const model = openrouter("google/gemini-2.5-flash");
```

1. Pass the ordered model list plus provider routing in the extra body or provider options of the call.
2. Read the serving model from `response.model` and tokens plus cost from `usage` on the served response.
3. Audit a single generation through the generation lookup by ID when totals look off.

**Fusion with AI SDK**:

1. Treat Fusion as a separate tool call to `openrouter/fusion`, opted in per call, never part of the fallback walk.
2. Call it only from an explicit `runFusionResearch` helper gated by `AI_FUSION_ALLOW`.
3. Cap its use by task and by role, log its high token and cost row distinctly, and show its consensus plus disagreement plus blind spots shape in the UI when used.
4. Default all tutoring plus quiz plus exam plus marking to the ordered chain.

**Breaker and retry rules**:

1. Trip on timeout plus 5xx plus 429 plus connection loss, honor retry delay headers where present.
2. Fail fast with no trip on 400 plus 401 plus 402 plus 403 plus 404 including schema and validation faults.
3. Streaming fallback happens only before the first token, after that errors arrive in band and the stream stays put.
